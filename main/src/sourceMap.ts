export interface SourceMap {
  version: number,
  file: string,
  names: Array<string>,
  sources: Array<string>,
  sourceRoot?: string,
  mappings: string
}

export function getSourceMappingURLComment(sourceMap: SourceMap): string {
  const encodedSourceMap = Buffer.from(JSON.stringify(sourceMap)).toString("base64")
  return `//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`
}

export function getSourceURLComment(url: string): string {
  return `//# sourceURL=${url}`
}