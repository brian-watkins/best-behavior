import { V8CoverageData } from "../coverageReporter.js"
import { extractSourceMap, updateSourceMap } from "./sourceMap.js"
import path from "node:path"

export function adaptCoverageData (data: V8CoverageData): V8CoverageData {
  if (!data.url.startsWith("http://") || data.source === undefined) {
    return data
  }

  const coverageFilePath = `.${new URL(data.url).pathname}`

  return {
    ...data,
    url: coverageFilePath,
    source: setSourceMapSourceRoot(data.source, coverageFilePath)
  }
}

function setSourceMapSourceRoot(source: string, filePath: string): string {
  const sourceMap = extractSourceMap(source)

  if (sourceMap === undefined) {
    return source
  }

  return updateSourceMap(source, {
    ...sourceMap,
    sourceRoot: path.dirname(filePath)
  })
}

