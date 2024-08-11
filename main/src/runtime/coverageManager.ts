import { BehaviorBrowser } from "./browserBehavior.js";
import { CoverageReporter } from "./coverageReporter.js";

export class CoverageManager {
  constructor(private reporter: CoverageReporter, private behaviorBrowser: BehaviorBrowser) { }

  async prepare(): Promise<void> {
    if (this.reporter.isEnabled()) {
      await this.reporter.start()
    }  
  }

  async finish(): Promise<void> {
    await this.behaviorBrowser.stopCoverageIfNecessary()

    if (this.reporter.isEnabled()) {
      await this.reporter.end()
    }
  }
}