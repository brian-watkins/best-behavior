import MCR from "monocart-coverage-reports";
import { CoverageReporter, V8CoverageData } from "./coverageReporter.js";
import { isMainThread } from "node:worker_threads"

export class MonocartCoverageReporter implements CoverageReporter {
  private mcr: MCR.CoverageReport

  constructor(config?: MCR.CoverageReportOptions) {
    this.mcr = MCR(config)
  }

  async start(): Promise<void> {
    await this.mcr.loadConfig()
  }

  async recordData(coverageData: Array<V8CoverageData>): Promise<void> {
    await this.mcr.add(coverageData)
  }

  async end(): Promise<void> {
    if (isMainThread) {
      await this.mcr.generate()
    }
  }
}