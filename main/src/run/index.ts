import url from "url"
import { defaultOrder, OrderProvider, randomOrder, Reporter } from "esbehavior"
import { ViteLocalServer } from "../localServer/viteServer.js"
import { PlaywrightBrowser } from "../browser/playwrightBrowser.js"
import { BehaviorFactory } from "../behavior/behaviorFactory.js"
import { Logger, bold, red } from "../logger.js"
import { createContext } from "../useContext.js"
import { Configuration } from "../config/configuration.js"
import { ViteModuleLoader, viteTranspiler } from "../transpiler/viteTranspiler.js"
import { NodeCoverageProvider } from "../coverage/nodeCoverageProvider.js"
import { SequentialValidator } from "../validator/sequentialValidator.js"
import { BrowserBehaviorContext } from "../behavior/browser/browserBehavior.js"
import { CoverageManager } from "../coverage/coverageManager.js"
import { Validator } from "../validator/index.js"
import { getBehaviorsMatchingPattern } from "../behavior/behaviorCollector.js"
import { PlaywrightTestInstrument } from "../behavior/local/playwrightTestInstrument.js"
import { BehaviorBrowser } from "../behavior/browser/behaviorBrowser.js"
import { OrderType } from "../config/public.js"

export enum ValidationRunResult {
  OK = "OK",
  NO_BEHAVIORS_FOUND = "NO BEHAVIORS FOUND",
  ERROR = "ERROR",
  NOT_OK = "NOT OK"
}

export async function run(config: Configuration): Promise<ValidationRunResult> {
  if (config.behaviorGlobs === undefined) {
    config.logger.error(bold(red("No behaviors specified!")))
    config.logger.error("Provide a glob via the --behaviors CLI option or the behaviorGlobs property of the config file.")
    return ValidationRunResult.NO_BEHAVIORS_FOUND
  }

  await viteTranspiler.setConfig({
    viteConfig: config.viteConfig,
    behaviorGlobs: config.behaviorGlobs
  })

  const viteServer = new ViteLocalServer({
    viteConfig: config.viteConfig,
    behaviorGlobs: config.behaviorGlobs
  })
  await viteServer.start()

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: config.showBrowser,
    baseURL: viteServer.host,
    browserGenerator: config.browserGenerator,
    browserContextGenerator: config.browserContextGenerator
  })

  const playwrightTestInstrument = new PlaywrightTestInstrument(playwrightBrowser, viteServer, {
    logger: config.logger
  })

  createContext({ playwrightTestInstrument })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, viteServer, {
    adapterPath: pathToFile("../../adapter/behaviorAdapter.cjs"),
    homePage: config.browserBehaviors?.html,
    logger: config.logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(new ViteModuleLoader(), browserBehaviorContext)

  let coverageManager: CoverageManager | undefined = undefined
  if (config.collectCoverage) {
    coverageManager = new CoverageManager(config.coverageReporter!, [
      new NodeCoverageProvider(viteTranspiler),
      behaviorBrowser,
      playwrightTestInstrument
    ])
  }

  const validator = new SequentialValidator(behaviorFactory)

  const result = await runBehaviors(validator, {
    behaviorPathPatterns: config.behaviorGlobs,
    behaviorFilter: config.behaviorFilter,
    browserBehaviorPathPatterns: config.browserBehaviors?.globs,
    coverageManager,
    reporter: config.reporter,
    orderProvider: getOrderProvider(config.orderType),
    failFast: config.failFast,
    runPickedOnly: config.runPickedOnly,
    logger: config.logger
  })

  if (!config.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
    await viteTranspiler.stop()
  }

  return result
}

interface RunOptions {
  behaviorPathPatterns: Array<string>
  behaviorFilter?: string
  browserBehaviorPathPatterns?: Array<string>
  coverageManager?: CoverageManager,
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
  logger: Logger
}

async function runBehaviors(validator: Validator, options: RunOptions): Promise<ValidationRunResult> {
  let result = ValidationRunResult.OK

  try {
    const behaviors = await getBehaviorsMatchingPattern({
      behaviorGlobs: options.behaviorPathPatterns,
      behaviorFilter: options.behaviorFilter,
      browserBehaviorGlobs: options.browserBehaviorPathPatterns,
      logger: options.logger
    })

    if (behaviors.length == 0) {
      return ValidationRunResult.NO_BEHAVIORS_FOUND
    }

    await options.coverageManager?.prepareForCoverageCollection()

    const summary = await validator.validate(behaviors, options)

    await options.coverageManager?.finishCoverageCollection()

    if (summary.invalid > 0 || summary.skipped > 0) {
      result = ValidationRunResult.NOT_OK
    }
  } catch (err: any) {
    options.reporter.terminate(err)
    result = ValidationRunResult.ERROR
  }

  return result
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}

function getOrderProvider(orderType: OrderType | undefined): OrderProvider {
  if (orderType === undefined) {
    return randomOrder()
  }

  switch (orderType.type) {
    case "default":
      return defaultOrder()
    case "random":
      return randomOrder(orderType.seed)
  }
}