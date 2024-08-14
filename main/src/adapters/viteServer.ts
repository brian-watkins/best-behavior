import { PluginOption, ViteDevServer, createServer } from "vite";
import { LocalServer } from "../localServer.js";
import { Transpiler } from "../transpiler.js";
import path from "path"
import MagicString from "magic-string"

export interface ViteLocalServerOptions {
  viteConfig?: string
  behaviorGlobs?: Array<string>
}

export class ViteTranspiler implements Transpiler {
  private server: ViteDevServer | undefined;

  async start(): Promise<void> {
    this.server = await createServer({
      server: {
        host: false
      }
    })
  }

  async loadModule(path: string): Promise<any> {
    try {
      return this.server?.ssrLoadModule(`${path}`)
    } catch (err) {
      console.log("Got an error loading module", path, err)
    }
  }

  async getSource(path: string): Promise<string | undefined> {
    return "NOT DONE YET"
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }
}

export class ViteLocalServer implements LocalServer, Transpiler {
  private server: ViteDevServer | undefined;

  constructor(private options: ViteLocalServerOptions = {}) { }

  async start(): Promise<void> {
    this.server = await createServer({
      configFile: this.options.viteConfig,
      optimizeDeps: {
        entries: this.options.behaviorGlobs
      },
      server: {
        hmr: false,
        headers: { 'Access-Control-Expose-Headers': 'SourceMap,X-SourceMap' }
      },
      plugins: [
        addExtraLine()
      ]
    })

    await this.server.listen()
  }

  urlForPath(path: string): string {
    return new URL(path, this.host).href
  }

  get host(): string {
    return this.server?.resolvedUrls?.local[0] ?? ""
  }

  async loadModule(path: string): Promise<any> {
    try {
      return this.server?.ssrLoadModule(`${path}`)
    } catch (err) {
      console.log("Got an error loading module", path, err)
    }
  }

  async getSource(sourcePath: string): Promise<string | undefined> {
    const result = await this.server!.transformRequest(sourcePath, { ssr: true })

    if (!result) {
      return undefined
    }

    const relativePath = path.relative(this.server!.config.root, sourcePath)

    const sourceMap = {
      ...result.map,
      sources: [relativePath],
      // sourceRoot: "./test/fixtures/src", // might not actually need this?
      // mappings: ';'.repeat(2) + fixMappings(result.map!.mappings)
      mappings: ';'.repeat(2) + result.map!.mappings
    }

    // console.log("Transform result", result)

    const encodedSourceMap = Buffer.from(JSON.stringify(sourceMap)).toString("base64")
    
    return `async function anonymous(__vite_ssr_exports__,__vite_ssr_import_meta__,__vite_ssr_import__,__vite_ssr_dynamic_import__,__vite_ssr_exportAll__
) { 
"use strict";${result.code}
//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}
}`
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }
}

function addExtraLine(): PluginOption {
  return {
    name: "add-extra-line",
    transform(src, id) {
      const s = new MagicString(src)
      s.prepend('{};\n') // note that any literal will work here

      const map = s.generateMap({
        source: path.relative("/Users/bwatkins/workspace/best-behavior", id),
        includeContent: true
      })

      return {
        code: s.toString(),
        map
      }
    }
  }
}