import { CoverageReporter } from "../runtime/coverageReporter.js";

export class NullCoverageReporter implements CoverageReporter {
  isEnabled(): boolean {
    return true
  }

  async start(): Promise<void> { }

  async recordData(coverageData: any): Promise<void> { }
  
  async end(): Promise<void> { }
}