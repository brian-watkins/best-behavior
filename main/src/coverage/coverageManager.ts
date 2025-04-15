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

  async addProvider(provider: CoverageProvider) {
    this.providers.push(provider)
  }

  async prepareForCoverage(): Promise<void> {
    for (const provider of this.providers) {
      await provider.prepareForCoverage({
        recordData: (data) => this.reporter.recordData(data)
      })
    }
  }

  async finishCoverage(): Promise<void> {
    for (const provider of this.providers) {
      await provider.finishCoverage?.()
    }
  }
}
