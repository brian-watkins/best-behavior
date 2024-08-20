import { V8CoverageData } from "./coverageReporter.js";

export class CoverageProducer {
  private coverageHandler: ((data: Array<V8CoverageData>) => Promise<void>) | undefined = undefined

  onCoverageData(coverageHandler: (data: Array<V8CoverageData>) => Promise<void>) {
    this.coverageHandler = coverageHandler
  }

  get shouldProduceCoverage(): boolean {
    return this.coverageHandler !== undefined
  }

  async publishCoverageData(coverageData: Array<V8CoverageData>): Promise<void> {
    await this.coverageHandler?.(coverageData)
  }
}