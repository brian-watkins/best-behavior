import { CoverageReporter, V8CoverageData } from "../runtime/coverageReporter.js";
import fs from "fs"
import path from "path"

export interface CoverageWriter {
  writeFile(filename: string, content: string): void
}

export class FileWriter implements CoverageWriter {
  constructor(private baseDir: string = process.cwd()) { }

  writeFile(filename: string, content: string): void {
    fs.writeFileSync(path.join(this.baseDir, filename), content)
  }
}

export class V8CoverageReporter implements CoverageReporter {
  private reports: Array<Array<V8CoverageData>> = []

  constructor(private writer: CoverageWriter = new FileWriter()) { }

  isEnabled(): boolean {
    return true
  }

  async start(): Promise<void> { }

  async recordData(coverageData: Array<V8CoverageData>): Promise<void> {
    this.reports.push(coverageData.map(fixCoverageData))
  }

  async end(): Promise<void> {
    for (let i = 0; i < this.reports.length; i++) {
      this.writer.writeFile(`coverage_${i}.json`, JSON.stringify(this.reports[i]))
    }
  }
}

function fixCoverageData(data: V8CoverageData): V8CoverageData {
  if (!data.url.startsWith("http://")) {
    return data
  }

  const coverageFilePath = `.${new URL(data.url).pathname}`

  return {
    ...data,
    url: coverageFilePath,
    source: fixSourceMap(coverageFilePath, data.source ?? "")
  }
}

function fixSourceMap(filePath: string, source: string): string {
  const sourceMap = extractSourceMap(source)

  if (sourceMap === undefined) {
    return source
  }

  return updateSourceMap(source, {
    ...sourceMap,
    sourceRoot: path.dirname(filePath)
  })
}

interface SourceMap {
  version: number,
  file: string,
  names: Array<string>,
  sources: Array<string>,
  sourceRoot?: string,
  mappings: string
}

function extractSourceMap(source: string): SourceMap | undefined {
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

function updateSourceMap(source: string, sourceMap: SourceMap): string {
  const encodedSourceMap = Buffer.from(JSON.stringify(sourceMap)).toString("base64")
  const contentEndIndex = source.indexOf("//# sourceMappingURL=")
  return source.substring(0, contentEndIndex) +
    `//# sourceMappingURL=data:application/json;base64,${encodedSourceMap}`
}