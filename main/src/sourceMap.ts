export interface SourceMap {
  version: number,
  file: string,
  names: Array<string>,
  sources: Array<string>,
  sourceRoot?: string,
  mappings: string
}

export function extractSourceMap(source: string): SourceMap | undefined {
  const match = source.match(/\/\/# sourceMappingURL=(.+)$/m);
  if (!match) {
    return undefined
  }

  const encodedSourceMap = match[1]

  const base64Index = encodedSourceMap.indexOf("base64,")
  if (base64Index === -1) {
    return undefined
  }

  const encodedSourceMapData = encodedSourceMap.substring(base64Index + 7)
  
  const decodedSourceMapString = Buffer.from(encodedSourceMapData, 'base64').toString("utf-8")

  return JSON.parse(decodedSourceMapString)
}

export function updateSourceMap(source: string, sourceMap: SourceMap): string {
  const encodedSourceMap = getSourceMappingURLComment(sourceMap)
  const contentEndIndex = source.indexOf("//# sourceMappingURL=")
  return source.substring(0, contentEndIndex) + encodedSourceMap
}

export function addSourceURLComment(source: string, url: string): string {
  const encodedSourceURL = getSourceURLComment(url)
  const contentEndIndex = source.indexOf("//# sourceMappingURL=")
  return source.substring(0, contentEndIndex) + `${encodedSourceURL}\n${source.substring(contentEndIndex)}`
}

export function getSourceMappingURLComment(sourceMap: SourceMap): string {
  const encodedSourceMap = Buffer.from(JSON.stringify(sourceMap)).toString("base64")
  return `//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`
}

export function getSourceURLComment(url: string): string {
  return `//# sourceURL=${url}`
}