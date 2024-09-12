import URL from "node:url"
import type { ResolveHookContext, ModuleSource } from "node:module"
import { createServer, ViteDevServer } from "vite"
import { MessagePort } from "node:worker_threads"
import { LoaderMessage } from "./loaderMessages.js"
import { getSourceMappingURLComment, getSourceURLComment, SourceMap } from "../sourceMap.js"

interface ViteLoaderData {
  viteConfig?: string
  behaviorGlobs?: Array<string>,
  port: MessagePort
}

let viteDevServer: ViteDevServer
const sources = new Map<string, string>()
const transpiledFiles = new Set<string>()
let generation = 0

export function updateGeneration() {
  generation++
}

export async function initialize(data: ViteLoaderData) {
  const server = data.port

  server.on("message", async (message: LoaderMessage) => {
    switch (message.type) {
      case "get-source":
        const source = sources.get(message.path)
        server.postMessage({ type: "source", path: message.path, source })
        break
      case "set-config":
        await initializeServer(message)
        server.postMessage({ type: "vite-configured" })
        break
      case "shutdown":
        await viteDevServer.close()
        server.postMessage({ type: "shutdown-ok" })
        break
    }
  })

  await initializeServer({})
}

async function initializeServer(data: { viteConfig?: string, behaviorGlobs?: Array<string> }) {
  updateGeneration()

  await viteDevServer?.close()

  viteDevServer = await createServer({
    configFile: data.viteConfig,
    optimizeDeps: {
      entries: data.behaviorGlobs
    },
    experimental: {
      skipSsrTransform: true
    },
    server: {
      hmr: false,
      host: false
    }
  })
}

export async function resolve(specifier: string, context: ResolveHookContext, nextResolve: NextResolver): Promise<ResolverFunctionReturnType> {
  switch (resolveType(specifier, context)) {
    case ViteLoaderResolveType.VITE:
      return await resolveViteRequest(specifier.substring(5))

    case ViteLoaderResolveType.VITE_INTERNAL:
      return resolveInternalViteImport(specifier)

    case ViteLoaderResolveType.TRANSITIVE_VITE:
      const modulePath = `${viteDevServer.config.root}${specifier}`
      const parentModulePath = URL.fileURLToPath(context.parentURL!)
      return resolveLocalImport(modulePath, parentModulePath)

    case ViteLoaderResolveType.BARE_IMPORT_FROM_VITE_FS_FILE:
      const actualPath = await getRealPathForViteInternalFilePath(context.parentURL!)
      return nextResolve(specifier, {
        ...context,
        parentURL: actualPath
      })

    case ViteLoaderResolveType.BARE_IMPORT:
      return nextResolve(specifier, context)
  }
}

enum ViteLoaderResolveType {
  VITE, VITE_INTERNAL, TRANSITIVE_VITE, BARE_IMPORT_FROM_VITE_FS_FILE, BARE_IMPORT
}

function resolveType(specifier: string, context: ResolveHookContext): ViteLoaderResolveType {
  if (specifier.startsWith("vite:")) {
    return ViteLoaderResolveType.VITE
  }

  if (specifier.startsWith("/@id/") || specifier.startsWith("/@fs/")) {
    return ViteLoaderResolveType.VITE_INTERNAL
  }

  if ((specifier.startsWith("./") || specifier.startsWith("/")) && context.parentURL !== undefined && transpiledFiles.has(context.parentURL)) {
    return ViteLoaderResolveType.TRANSITIVE_VITE
  }

  if (context.parentURL !== undefined && context.parentURL.includes("/@fs/")) {
    return ViteLoaderResolveType.BARE_IMPORT_FROM_VITE_FS_FILE
  }

  return ViteLoaderResolveType.BARE_IMPORT
}

async function getRealPathForViteInternalFilePath(specifier: string): Promise<string | undefined> {
  const parentPath = URL.fileURLToPath(specifier)
  const result = await viteDevServer.moduleGraph.getModuleByUrl(parentPath, true)

  if (result === undefined || result.file === null) {
    throw new Error(`Could not get real path for vite internal file path: ${specifier}`)
  }

  return URL.pathToFileURL(result.file).toString()
}

async function resolveLocalImport(modulePath: string, parentModulePath: string): Promise<ResolverFunctionReturnType> {
  const resolveId = await viteDevServer.pluginContainer.resolveId(modulePath, parentModulePath, { ssr: true })

  if (resolveId === null) {
    throw new Error(`Could not resolve local import via vite! Path=${modulePath}; parentModulePath=${parentModulePath}`)
  }

  const moduleFileURL = URL.pathToFileURL(resolveId.id).toString() + `?vt=${generation}`

  transpiledFiles.add(moduleFileURL)

  return {
    url: moduleFileURL,
    shortCircuit: true,
    format: "vite"
  }
}

function resolveInternalViteImport(specifier: string): ResolverFunctionReturnType {
  const moduleURL = URL.pathToFileURL(specifier).toString()

  transpiledFiles.add(moduleURL)

  return {
    url: moduleURL,
    shortCircuit: true,
    format: "vite-internal"
  }
}

async function resolveViteRequest(modulePath: string): Promise<ResolverFunctionReturnType> {
  const resolvedPath = await viteDevServer.moduleGraph.resolveUrl(modulePath, true)

  const moduleFileURL = URL.pathToFileURL(resolvedPath[1]).toString() + `?vt=${generation}`

  transpiledFiles.add(moduleFileURL)

  return {
    url: moduleFileURL,
    shortCircuit: true,
    format: "vite"
  }
}

export async function load(url: string, context: LoaderHookContext, nextLoad: NextLoader): Promise<LoaderFunctionReturnType> {
  switch (context.format) {
    case "vite-internal":
      return loadViteInternal(url)
    case "vite":
      return loadFileWithVite(url)
    default:
      return nextLoad(url, context)
  }
}

async function loadFileWithVite(url: string): Promise<LoaderFunctionReturnType> {
  const modulePath = URL.fileURLToPath(url)

  const transformResult = await viteDevServer.transformRequest(modulePath, { ssr: true })

  const sourceMap = {
    ...transformResult!.map,
    sources: [modulePath]
  } as SourceMap

  const source = `${transformResult?.code}
${getSourceURLComment(modulePath)}
${getSourceMappingURLComment(sourceMap)}`

  sources.set(modulePath, source)

  return {
    format: "module",
    source,
    shortCircuit: true
  }
}

async function loadViteInternal(url: string): Promise<LoaderFunctionReturnType> {
  const modulePath = URL.fileURLToPath(url).replace("/@id/__x00__", "\0")

  const transformResult = await viteDevServer.transformRequest(modulePath, { ssr: true })

  return {
    format: "module",
    source: transformResult?.code,
    shortCircuit: true,
    responseURL: url
  }
}

// Types

type NextResolver = (
  specifier: string,
  context?: ResolveHookContext,
) => ResolverFunctionReturnType | Promise<ResolverFunctionReturnType>

type ModuleFormat = "vite" | "vite-internal" | "builtin" | "commonjs" | "json" | "module" | "wasm";

interface ResolverFunctionReturnType {
  format?: ModuleFormat | null | undefined;
  importAssertions?: ImportAssertions | undefined;
  shortCircuit?: boolean | undefined;
  url: string;
}

interface LoaderHookContext {
  conditions: string[];
  format: ModuleFormat;
  importAssertions: ImportAssertions;
}

type NextLoader = (url: string, context?: LoaderHookContext) => LoaderFunctionReturnType | Promise<LoaderFunctionReturnType>

interface LoaderFunctionReturnType {
  format: ModuleFormat;
  shortCircuit?: boolean | undefined;
  source?: ModuleSource;
  responseURL?: string
}
