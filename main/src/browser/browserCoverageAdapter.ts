import { V8CoverageData } from "../coverage/coverageReporter.js"
import { addSourceURLComment, extractSourceMap, updateSourceMap } from "../sourceMap.js"
import path from "node:path"

export function adaptCoverageData(root: string): (data: V8CoverageData) => V8CoverageData {
  return (data) => {
    if (!data.url.startsWith("http://") || data.source === undefined) {
      return data
    }

    const coverageFilePath = path.join(root, new URL(data.url).pathname)

    return {
      ...data,
      url: coverageFilePath,
      source: setSourceMapSourceRoot(data.source, coverageFilePath)
    }
  }
}

function setSourceMapSourceRoot(source: string, filePath: string): string {
  const sourceMap = extractSourceMap(source)

  if (sourceMap === undefined) {
    return source
  }

  return updateSourceMap(addSourceURLComment(source, filePath), {
    ...sourceMap,
    sources: [filePath]
  })
}

