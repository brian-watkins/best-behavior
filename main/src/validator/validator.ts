import url from "node:url"
import { runBehavior, ValidationStatus } from "esbehavior";
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";
import { PlaywrightBrowser } from "../browser/playwrightBrowser.js";
import { ValidationRunOptions } from "../run.js";
import { Configuration } from "../config/configuration.js";
import { PlaywrightTestInstrument } from "../behavior/local/playwrightTestInstrument.js";
import { createContext } from "../useContext.js";
import { BehaviorBrowser } from "../behavior/browser/behaviorBrowser.js";
import { BrowserBehaviorContext } from "../behavior/browser/browserBehavior.js";
import { BehaviorFactory } from "../behavior/behaviorFactory.js";
import { ViteModuleLoader } from "../transpiler/viteTranspiler.js";
import { LocalServerContext } from "../localServer/context.js";
import { CoverageManager } from "../coverage/coverageManager.js";
import { validationCompleted, ValidationResult, validationTerminated } from "./index.js";

export interface ValidatorConfig extends ValidationRunOptions {
  localServerHost: string
  localServerRoot: string
}

export class Validator {
  private behaviorFactory!: BehaviorFactory;
  private playwrightBrowser!: PlaywrightBrowser;
  private validationStatus: ValidationStatus = ValidationStatus.VALID
  private coverageManager: CoverageManager | undefined

  constructor (private config: Configuration, private localServer: LocalServerContext) { }

  async init(): Promise<void> {
    this.playwrightBrowser = new PlaywrightBrowser({
      showBrowser: this.config.showBrowser,
      baseURL: this.localServer.host,
      browserGenerator: this.config.browserGenerator,
      browserContextGenerator: this.config.browserContextGenerator
    })
  
    const playwrightTestInstrument = new PlaywrightTestInstrument(this.playwrightBrowser, this.localServer, {
      logger: this.config.logger
    })
  
    createContext({ playwrightTestInstrument })
  
    const behaviorBrowser = new BehaviorBrowser(this.playwrightBrowser, this.localServer, {
      adapterPath: pathToFile("../../adapter/behaviorAdapter.cjs"),
      homePage: this.config.browserBehaviors?.html,
      logger: this.config.logger
    })
  
    const browserBehaviorContext = new BrowserBehaviorContext(this.localServer, behaviorBrowser)
    this.behaviorFactory = new BehaviorFactory(new ViteModuleLoader(), browserBehaviorContext)
  
    if (this.config.collectCoverage) {
      this.coverageManager = new CoverageManager(this.config.coverageReporter!, [
        behaviorBrowser,
        playwrightTestInstrument
      ])
    }

    await this.coverageManager?.prepareForCoverageCollection()
  }

  async shutdown(): Promise<void> {
    await this.coverageManager?.finishCoverageCollection()

    // not sure why we have the second condition
    if (!this.config.showBrowser || !this.playwrightBrowser.isOpen) {
      await this.playwrightBrowser.stop()
    }
  }

  async run(behavior: BehaviorMetadata): Promise<ValidationResult> {
    let summary
    
    try {
      const configurableBehavior = await this.behaviorFactory.getBehavior(behavior)
      summary = await runBehavior(this.config, this.validationStatus, configurableBehavior)      
    } catch (err: any) {
      return validationTerminated(err)
    }

    if (summary.invalid > 0) {
      this.validationStatus = ValidationStatus.INVALID
    }

    return validationCompleted(summary)
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}
