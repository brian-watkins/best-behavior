import url from "node:url"
import { runBehavior, ValidationStatus } from "esbehavior";
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";
import { PlaywrightBrowser } from "../browser/playwrightBrowser.js";
import { ValidationRunOptions } from "../run.js";
import { Configuration } from "../config/configuration.js";
import { LocalBrowser } from "../browser/localBrowser.js";
import { BehaviorBrowser } from "../behavior/browser/behaviorBrowser.js";
import { BrowserBehaviorContext } from "../behavior/browser/browserBehavior.js";
import { BehaviorFactory } from "../behavior/behaviorFactory.js";
import { ViteModuleLoader, viteTranspiler } from "../transpiler/viteTranspiler.js";
import { RuntimeAttributes, validationCompleted, ValidationResult, validationTerminated } from "./index.js";
import { NodeCoverageProvider } from "../coverage/nodeCoverageProvider.js";
import { provideGlobalContext } from "../globalContext.js";
import { provideLocalBrowser } from "../browser/browserContext.js";

export interface ValidatorConfig extends ValidationRunOptions {
  localServerHost: string
  localServerRoot: string
}

export class Validator {
  private behaviorFactory!: BehaviorFactory;
  private playwrightBrowser!: PlaywrightBrowser;
  private validationStatus: ValidationStatus = ValidationStatus.VALID

  constructor(private config: Configuration, private attributes: RuntimeAttributes) { }

  async init(): Promise<void> {
    await viteTranspiler.setConfig({
      viteConfig: this.config.viteConfig,
      behaviorGlobs: this.config.behaviorGlobs
    })

    this.playwrightBrowser = new PlaywrightBrowser({
      showBrowser: this.config.showBrowser,
      baseURL: this.attributes.localServer.host,
      browserGenerator: this.config.browserGenerator,
      browserContextGenerator: this.config.browserContextGenerator
    })

    const localBrowser = new LocalBrowser(
      this.playwrightBrowser,
      this.attributes.localServer,
      { logger: this.config.logger }
    )

    provideLocalBrowser(localBrowser)
    provideGlobalContext(this.attributes.context)

    const behaviorBrowser = new BehaviorBrowser(this.playwrightBrowser, this.attributes, {
      adapterPath: pathToFile("../../adapter/behaviorAdapter.js"),
      homePage: this.config.browserBehaviors?.html,
      logger: this.config.logger
    })

    const browserBehaviorContext = new BrowserBehaviorContext(this.attributes.localServer, behaviorBrowser)
    this.behaviorFactory = new BehaviorFactory(new ViteModuleLoader(), browserBehaviorContext)

    this.config?.coverageManager?.addProvider(new NodeCoverageProvider(viteTranspiler))
    this.config?.coverageManager?.addProvider(behaviorBrowser)
    this.config?.coverageManager?.addProvider(localBrowser)

    await this.config.coverageManager?.startCoverageReporter()
    await this.config.coverageManager?.prepareForCoverage()
  }

  async shutdown(): Promise<void> {
    await this.config.coverageManager?.finishCoverage()
    await this.config.coverageManager?.stopCoverageReporter()

    if (!this.playwrightBrowser.isVisible) {
      await this.playwrightBrowser.stop()
      await viteTranspiler.stop()
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
