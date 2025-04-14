import { CoverageProvider } from "./coverageProvider.js";
import { CoverageReporter } from "./coverageReporter.js";

export class CoverageManager {
  private providers: Array<CoverageProvider> = []

  constructor(private reporter: CoverageReporter) { }

  async startCoverageReporter(): Promise<void> {
    await this.reporter.start()
  }

  async stopCoverageReporter(): Promise<void> {
    await this.reporter.end()
  }

  async prepareForCoverageCollection(providers: Array<CoverageProvider>): Promise<void> {
    for (const provider of providers) {
      this.providers.push(provider)
      provider.onCoverageData = (data) => this.reporter.recordData(data)
      await provider.prepareForCoverageCollection?.()
    }
  }

  async finishCoverageCollection(): Promise<void> {
    for (const provider of this.providers) {
      await provider.finishCoverageCollection?.()
    }
  }
}
