import url from "url"
import { OrderProvider, Reporter, StandardReporter, randomOrder } from "esbehavior"
import { ViteLocalServer } from "./localServer/viteServer.js"
import { PlaywrightBrowser } from "./browser/playwrightBrowser.js"
import { BehaviorFactory } from "./behavior/behaviorFactory.js"
import { Logger, bold, consoleLogger, red } from "./logger.js"
import { createContext } from "./useContext.js"
import { BrowserBehaviorOptions, getConfig } from "./config.js"
import { CoverageReporter } from "./coverage/coverageReporter.js"
import { viteTranspiler } from "./transpiler/viteTranspiler.js"
import { NodeCoverageProvider } from "./coverage/nodeCoverageProvider.js"
import { SequentialValidator } from "./validator/sequentialValidator.js"
import { MonocartCoverageReporter } from "./coverage/monocartCoverageReporter.js"
import { BrowserBehaviorContext } from "./behavior/browser/browserBehavior.js"
import { CoverageManager } from "./coverage/coverageManager.js"
import { Validator } from "./validator/index.js"
import { getBehaviorsMatchingPattern } from "./behavior/behaviorCollector.js"
import { PlaywrightTestInstrument } from "./behavior/local/playwrightTestInstrument.js"
import { BehaviorBrowser } from "./behavior/browser/behaviorBrowser.js"
export type { Logger } from "./logger.js"
export { consoleLogger } from "./logger.js"

export interface RunConfig {
  config?: string
  behaviorGlobs?: Array<string>
  behaviorFilter?: string
  browserBehaviors?: BrowserBehaviorOptions
  failFast?: boolean
  runPickedOnly?: boolean
  viteConfig?: string
  showBrowser?: boolean
  reporter?: Reporter
  collectCoverage?: boolean
  coverageReporter?: CoverageReporter
  orderProvider?: OrderProvider
  logger?: Logger
}

export enum RunResult {
  OK = "OK",
  NO_BEHAVIORS_FOUND = "NO BEHAVIORS FOUND",
  ERROR = "ERROR",
  NOT_OK = "NOT OK"
}

export async function run(runConfig: RunConfig): Promise<RunResult> {
  const baseConfig = await getConfig(viteTranspiler, runConfig.config)
  const logger = runConfig.logger ?? baseConfig?.logger ?? consoleLogger()

  const behaviors = runConfig.behaviorGlobs ?? baseConfig?.behaviorGlobs

  if (behaviors === undefined) {
    logger.error(bold(red("No behaviors specified!")))
    logger.error("Provide a glob via the --behaviors CLI option or the behaviorGlobs property of the config file.")
    return RunResult.NO_BEHAVIORS_FOUND
  }

  await viteTranspiler.setConfig({
    viteConfig: runConfig.viteConfig ?? baseConfig?.viteConfig,
    behaviorGlobs: behaviors
  })

  const viteServer = new ViteLocalServer({
    viteConfig: runConfig.viteConfig ?? baseConfig?.viteConfig,
    behaviorGlobs: behaviors
  })
  await viteServer.start()

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: runConfig.showBrowser ?? false,
    baseURL: viteServer.host,
    browserGenerator: baseConfig?.browser,
    browserContextGenerator: baseConfig?.context
  })

  const playwrightTestInstrument = new PlaywrightTestInstrument(playwrightBrowser, viteServer, {
    logger
  })

  createContext({ playwrightTestInstrument })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, viteServer, {
    adapterPath: pathToFile("../adapter/behaviorAdapter.cjs"),
    homePage: runConfig.browserBehaviors?.html,
    logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteTranspiler, browserBehaviorContext)

  const collectCoverage = runConfig.collectCoverage ?? baseConfig?.collectCoverage ?? false

  let coverageManager: CoverageManager | undefined = undefined
  if (collectCoverage) {
    const coverageReporter = runConfig.coverageReporter ??
      baseConfig?.coverageReporter ??
      new MonocartCoverageReporter()

    coverageManager = new CoverageManager(coverageReporter, [
      new NodeCoverageProvider(viteTranspiler),
      behaviorBrowser,
      playwrightTestInstrument
    ])
  }

  const validator = new SequentialValidator(behaviorFactory)

  const result = await runBehaviors(validator, {
    behaviorPathPatterns: behaviors,
    behaviorFilter: runConfig.behaviorFilter,
    browserBehaviorPathPatterns: runConfig.browserBehaviors?.globs ?? baseConfig?.browserBehaviors?.globs,
    coverageManager,
    reporter: runConfig.reporter ?? baseConfig?.reporter ?? defaultReporter(logger),
    orderProvider: runConfig.orderProvider ?? baseConfig?.orderProvider ?? randomOrder(),
    failFast: runConfig.failFast ?? baseConfig?.failFast ?? false,
    runPickedOnly: runConfig.runPickedOnly ?? false,
    logger
  })

  if (!runConfig.showBrowser || !playwrightBrowser.isOpen) {
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

async function runBehaviors(validator: Validator, options: RunOptions): Promise<RunResult> {
  let result = RunResult.OK

  try {
    const behaviors = await getBehaviorsMatchingPattern({
      behaviorGlobs: options.behaviorPathPatterns,
      behaviorFilter: options.behaviorFilter,
      browserBehaviorGlobs: options.browserBehaviorPathPatterns,
      logger: options.logger
    })

    if (behaviors.length == 0) {
      return RunResult.NO_BEHAVIORS_FOUND
    }

    await options.coverageManager?.prepareForCoverageCollection()

    const summary = await validator.validate(behaviors, options)

    await options.coverageManager?.finishCoverageCollection()

    if (summary.invalid > 0 || summary.skipped > 0) {
      result = RunResult.NOT_OK
    }
  } catch (err: any) {
    options.reporter.terminate(err)
    result = RunResult.ERROR
  }

  return result
}

function defaultReporter(logger: Logger): Reporter {
  return new StandardReporter({
    writer: {
      writeLine(message) {
        logger.info(message)
      },
    }
  })
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}