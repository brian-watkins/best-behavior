import { CoverageProvider } from "./coverageProvider.js";
import { CoverageReporter } from "../coverageReporter.js";

export class CoverageManager {
  constructor (private reporter: CoverageReporter, private providers: Array<CoverageProvider>) {}

  async prepareForCoverageCollection(): Promise<void> {
    for (const provider of this.providers) {
      provider.onCoverageData = (data) => this.reporter.recordData(data)
      await provider.prepareForCoverageCollection?.()
    }
    await this.reporter.start()
  }

  async finishCoverageCollection(): Promise<void> {
    for (const provider of this.providers) {
      await provider.finishCoverageCollection?.()
    }
    await this.reporter.end()
  }
}
