export interface V8CoverageData {
  url: string,
  scriptId: string,
  source?: string,
  functions: Array<FunctionCoverage>
}

export interface FunctionCoverage {
  functionName: string,
  isBlockCoverage: boolean,
  ranges: Array<CoverageRange>
}

export interface CoverageRange {
  count: number,
  startOffset: number,
  endOffset: number
}

export interface CoverageReporter {
  start(): Promise<void>
  recordData(coverageData: Array<V8CoverageData>): Promise<void>
  end(): Promise<void>
}

export class NullCoverageReporter implements CoverageReporter {
  async start(): Promise<void> { }
  async recordData(coverageData: any): Promise<void> { }
  async end(): Promise<void> { }
}