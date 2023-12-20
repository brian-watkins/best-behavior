import url from "url"
import { OrderProvider, Reporter, StandardReporter, randomOrder } from "esbehavior"
import { ViteLocalServer } from "./adapters/viteServer.js"
import { PlaywrightBrowser, browserLogger } from "./adapters/playwrightBrowser.js"
import { BehaviorBrowser, BrowserBehaviorContext } from "./browser/browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"
import { Logger, bold, consoleLogger, red } from "./logger.js"
import { createContext } from "./useContext.js"
import { PlaywrightTestInstrument } from "./useBrowser.js"
import { BrowserBehaviorOptions, getConfig } from "./config.js"
export type { BrowserTestInstrument } from "./useBrowser.js"
export { useBrowser } from "./useBrowser.js"
export type { Logger } from "./logger.js"
export { defineConfig } from "./config.js"
export type { BestBehaviorConfig, BrowserBehaviorOptions } from "./config.js"
export type { PlaywrightBrowserGenerator, PlaywrightBrowserContextGenerator } from "./adapters/playwrightBrowser.js"


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
  orderProvider?: OrderProvider
  logger?: Logger
}

// Note that Reporter and Logger both have logging capabilities
// Is there a way we could consolidate that?

export async function run(args: RunArguments): Promise<void> {
  const viteServer = new ViteLocalServer({
    viteConfig: args.viteConfig
  })
  await viteServer.start()

  const config = await getConfig(viteServer, args.config)

  const logger = args.logger ?? config?.logger ?? consoleLogger()

  const behaviors = args.behaviorGlobs ?? config?.behaviorGlobs

  if (behaviors === undefined) {
    logger.error(bold(red("No behaviors specified!")))
    logger.error("Provide a glob via the --behaviors CLI option or the behaviors property of the config file.")
    await viteServer.stop()
    return
  }

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: args.showBrowser ?? false,
    baseURL: viteServer.host,
    browserGenerator: config?.browser,
    browserContextGenerator: config?.context
  })

  const browserTestInstrument = new PlaywrightTestInstrument(playwrightBrowser, {
    logger: browserLogger(viteServer.host, logger)
  })

  createContext({
    browserTestInstrument: browserTestInstrument
  })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, {
    adapterPath: pathToFile("../adapter/behaviorAdapter.cjs"),
    homePage: args.browserBehaviors?.html,
    logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
  const runner = new Runner(behaviorFactory)

  await runner.run({
    behaviorPathPatterns: behaviors,
    behaviorFilter: args.behaviorFilter,
    browserBehaviorPathPatterns: args.browserBehaviors?.globs ?? config?.browserBehaviors?.globs,
    reporter: args.reporter ?? config?.reporter ?? new StandardReporter(),
    orderProvider: args.orderProvider ?? config?.orderProvider ?? randomOrder(),
    failFast: args.failFast ?? config?.failFast ?? false,
    runPickedOnly: args.runPickedOnly ?? false,
    logger
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}