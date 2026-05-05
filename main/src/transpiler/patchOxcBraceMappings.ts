import type { Plugin } from "vite"
import {
  SourceMapConsumer,
  SourceMapGenerator,
  type EncodedSourceMap,
} from "@jridgewell/source-map"

// oxc-transform's source maps omit mappings for closing braces, comments,
// and any generated line without a "real" token. monocart-coverage-reports
// matches V8's byte ranges through the source map onto AST-derived
// functions; missing mappings cause adjacent functions to merge. For every
// generated line that has no mapping but has non-whitespace content,
// synthesize a mapping pointing to the next source line. Coarse heuristic —
// enough to keep coverage tools honest, not debugger-accurate.

export function patchOxcBraceMappings(): Plugin {
  return {
    name: "patch-oxc-brace-mappings",
    configureServer(server) {
      for (const environment of Object.values(server.environments)) {
        const originalTransformRequest = environment.transformRequest.bind(environment)
        environment.transformRequest = async (url) => {
          const result = await originalTransformRequest(url)
          if (result === null || result === undefined) return result
          if (typeof result.code !== "string" || result.map == null) return result
          if (typeof result.map.mappings !== "string" || result.map.mappings.length === 0) return result

          const patched = patchBraceMappings(result.code, result.map as unknown as EncodedSourceMap)
          if (patched === null) return result

          return { ...result, map: patched as unknown as typeof result.map }
        }
      }
    }
  }
}

interface OriginalPosition {
  source: string
  line: number
  column: number
}

function patchBraceMappings(code: string, map: EncodedSourceMap): EncodedSourceMap | null {
  const consumer = new SourceMapConsumer(map)
  const generatedLines = code.split("\n")

  const lineHasMapping = new Set<number>()
  const lastSourcePosByLine = new Map<number, OriginalPosition>()

  consumer.eachMapping((m) => {
    const generatedLine = m.generatedLine - 1
    lineHasMapping.add(generatedLine)
    if (m.source !== null && m.originalLine !== null) {
      lastSourcePosByLine.set(generatedLine, {
        source: m.source,
        line: m.originalLine,
        column: m.originalColumn ?? 0,
      })
    }
  })

  interface Patch {
    generatedLine: number
    source: string
    sourceLine: number
    sourceColumn: number
  }

  const patches: Patch[] = []
  let lastFull: OriginalPosition | null = null

  for (let i = 0; i < generatedLines.length; i++) {
    if (lineHasMapping.has(i)) {
      const seen = lastSourcePosByLine.get(i)
      if (seen !== undefined) lastFull = seen
      continue
    }
    if (!/\S/.test(generatedLines[i] ?? "")) continue
    if (lastFull === null) continue

    const sourceLine: number = lastFull.line + 1
    patches.push({
      generatedLine: i + 1,
      source: lastFull.source,
      sourceLine,
      sourceColumn: 0,
    })
    lastFull = { source: lastFull.source, line: sourceLine, column: 0 }
  }

  if (patches.length === 0) {
    consumer.destroy()
    return null
  }

  const generator = SourceMapGenerator.fromSourceMap(consumer)
  for (const patch of patches) {
    generator.addMapping({
      generated: { line: patch.generatedLine, column: 0 },
      original: { line: patch.sourceLine, column: patch.sourceColumn },
      source: patch.source,
    } as Parameters<typeof generator.addMapping>[0])
  }

  consumer.destroy()
  return generator.toJSON()
}
