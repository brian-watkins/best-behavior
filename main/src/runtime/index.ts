import url from "url"
import { OrderProvider, Reporter, StandardReporter, randomOrder } from "esbehavior"
import { ViteLocalServer } from "../adapters/viteServer.js"
import { PlaywrightBrowser, browserLogger } from "../adapters/playwrightBrowser.js"
import { BehaviorBrowser, BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner, RunResult } from "./runner.js"
import { Logger, bold, consoleLogger, red } from "../logger.js"
import { createContext } from "../useContext.js"
import { PlaywrightTestInstrument } from "../useBrowser.js"
import { BrowserBehaviorOptions, getConfig } from "../config.js"
import { CoverageReporter, NullCoverageReporter } from "./coverageReporter.js"
import { CoverageManager } from "./coverageManager.js"
import { viteTranspiler } from "../adapters/viteTranspiler.js"
import { NodeCoverageProvider } from "../adapters/nodeCoverageProvider.js"
export { RunResult } from "./runner.js"

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

  const coverageReporter = args.coverageReporter ?? new NullCoverageReporter()

  const playwrightTestInstrument = new PlaywrightTestInstrument(playwrightBrowser, {
    logger: browserLogger(viteServer.host, logger)
  })

  createContext({ playwrightTestInstrument })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, {
    adapterPath: pathToFile("../../adapter/behaviorAdapter.cjs"),
    homePage: args.browserBehaviors?.html,
    logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteTranspiler, browserBehaviorContext)
  const coverageManager = args.collectCoverage
    ? new CoverageManager(coverageReporter, [
      new NodeCoverageProvider(viteTranspiler),
      behaviorBrowser,
      playwrightTestInstrument
    ])
    : undefined
  const runner = new Runner(behaviorFactory, coverageManager)

  const runResult = await runner.run({
    behaviorPathPatterns: behaviors,
    behaviorFilter: args.behaviorFilter,
    browserBehaviorPathPatterns: args.browserBehaviors?.globs ?? baseConfig?.browserBehaviors?.globs,
    reporter: args.reporter ?? baseConfig?.reporter ?? new StandardReporter(),
    orderProvider: args.orderProvider ?? baseConfig?.orderProvider ?? randomOrder(),
    failFast: args.failFast ?? baseConfig?.failFast ?? false,
    runPickedOnly: args.runPickedOnly ?? false,
    logger
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }

  return runResult
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}