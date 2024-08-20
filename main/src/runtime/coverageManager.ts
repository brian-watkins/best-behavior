import { NodeCoverageProducer } from "../adapters/nodeCoverageProducer.js";
import { PlaywrightTestInstrument } from "../useBrowser.js";
import { BehaviorBrowser } from "./browserBehavior.js";
import { CoverageReporter } from "./coverageReporter.js";

export class CoverageManager {
  constructor(
    private reporter: CoverageReporter,
    private nodeCoverageProducer: NodeCoverageProducer,
    private behaviorBrowser: BehaviorBrowser,
    private playwrightTestInstrument: PlaywrightTestInstrument
  ) {
    this.behaviorBrowser
      .onCoverageData((coverageData) => this.reporter.recordData(coverageData))
    this.playwrightTestInstrument
      .onCoverageData((coverageData) => this.reporter.recordData(coverageData))
    this.nodeCoverageProducer
      .onCoverageData((coverageData) => this.reporter.recordData(coverageData))
  }

  async prepare(): Promise<void> {
    await this.nodeCoverageProducer.startCoverage()
    await this.reporter.start()
  }

  async finish(): Promise<void> {
    await this.nodeCoverageProducer.stopCoverage()
    await this.behaviorBrowser.stopCoverageIfNecessary()
    await this.reporter.end()
  }
}
