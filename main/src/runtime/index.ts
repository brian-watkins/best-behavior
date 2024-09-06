import url from "url"
import { OrderProvider, Reporter, StandardReporter, randomOrder } from "esbehavior"
import { ViteLocalServer } from "../adapters/viteServer.js"
import { PlaywrightBrowser } from "../adapters/playwrightBrowser.js"
import { BehaviorBrowser, BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { runBehaviors, RunResult } from "./runBehaviors.js"
import { Logger, bold, consoleLogger, red } from "../logger.js"
import { createContext } from "../useContext.js"
import { PlaywrightTestInstrument } from "../useBrowser.js"
import { BrowserBehaviorOptions, getConfig } from "../config.js"
import { CoverageReporter } from "../coverageReporter.js"
import { CoverageManager } from "./coverageManager.js"
import { viteTranspiler } from "../adapters/viteTranspiler.js"
import { NodeCoverageProvider } from "../adapters/nodeCoverageProvider.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { MonocartCoverageReporter } from "../adapters/monocartCoverageReporter.js"
export { RunResult } from "./runBehaviors.js"

export interface RunArguments {
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

// Note that Reporter and Logger both have logging capabilities
// Is there a way we could consolidate that?

export async function run(args: RunArguments): Promise<RunResult> {
  const baseConfig = await getConfig(viteTranspiler, args.config)

  const logger = args.logger ?? baseConfig?.logger ?? consoleLogger()

  const behaviors = args.behaviorGlobs ?? baseConfig?.behaviorGlobs

  if (behaviors === undefined) {
    logger.error(bold(red("No behaviors specified!")))
    logger.error("Provide a glob via the --behaviors CLI option or the behaviorGlobs property of the config file.")
    return RunResult.NO_BEHAVIORS_FOUND
  }

  await viteTranspiler.setConfig({
    viteConfig: args.viteConfig ?? baseConfig?.viteConfig,
    behaviorGlobs: behaviors
  })

  const viteServer = new ViteLocalServer({
    viteConfig: args.viteConfig ?? baseConfig?.viteConfig,
    behaviorGlobs: behaviors
  })
  await viteServer.start()

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: args.showBrowser ?? false,
    baseURL: viteServer.host,
    browserGenerator: baseConfig?.browser,
    browserContextGenerator: baseConfig?.context
  })

  const playwrightTestInstrument = new PlaywrightTestInstrument(playwrightBrowser, viteServer, {
    logger
  })

  createContext({ playwrightTestInstrument })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, viteServer, {
    adapterPath: pathToFile("../../adapter/behaviorAdapter.cjs"),
    homePage: args.browserBehaviors?.html,
    logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteTranspiler, browserBehaviorContext)

  const collectCoverage = args.collectCoverage ?? baseConfig?.collectCoverage ?? false

  let coverageManager: CoverageManager | undefined = undefined
  if (collectCoverage) {
    const coverageReporter = args.coverageReporter ??
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
    behaviorFilter: args.behaviorFilter,
    browserBehaviorPathPatterns: args.browserBehaviors?.globs ?? baseConfig?.browserBehaviors?.globs,
    coverageManager,
    reporter: args.reporter ?? baseConfig?.reporter ?? new StandardReporter(),
    orderProvider: args.orderProvider ?? baseConfig?.orderProvider ?? randomOrder(),
    failFast: args.failFast ?? baseConfig?.failFast ?? false,
    runPickedOnly: args.runPickedOnly ?? false,
    logger
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
    await viteTranspiler.stop()
  }

  return result
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}