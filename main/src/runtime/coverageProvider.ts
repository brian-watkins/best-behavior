import { V8CoverageData } from "./coverageReporter.js";

export interface CoverageProvider {
  onCoverageData?: (data: Array<V8CoverageData>) => Promise<void>
  prepareForCoverageCollection?(): Promise<void>
  finishCoverageCollection?(): Promise<void>
}