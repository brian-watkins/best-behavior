import { V8CoverageData } from "./coverageReporter.js";

export interface CoverageContext {
  recordData(data: Array<V8CoverageData>): Promise<void>
}

export interface CoverageProvider {
  prepareForCoverage(context: CoverageContext): Promise<void>
  finishCoverage?(): Promise<void>
}