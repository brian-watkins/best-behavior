import { PlaywrightBrowserContextGenerator, PlaywrightBrowserGenerator } from "../browser/playwrightBrowser.js";
import { Context, defaultOrder, OrderProvider, randomOrder, Reporter, StandardReporter } from "esbehavior";
import { consoleLogger, Logger } from "../logger.js";
import { CoverageReporter } from "../coverage/coverageReporter.js";
import { MonocartCoverageReporter } from "../coverage.js";
import { BrowserBehaviorOptions, OrderType, ValidationRunOptions } from "./public.js";
import { loadConfigFile } from "./configFile.js";

export interface Configuration {
  configFile?: string
  browserGenerator?: PlaywrightBrowserGenerator
  browserContextGenerator?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
  behaviorFilter?: string
  runContext?: Context<any>
  parallel: boolean
  runPickedOnly: boolean
  failFast: boolean
  showBrowser: boolean
  viteConfig?: string
  collectCoverage: boolean
  coverageReporter?: CoverageReporter
  reporter: Reporter
  orderType?: OrderType,
  orderProvider: OrderProvider
  logger: Logger
}

export async function getConfiguration(runOptions: ValidationRunOptions): Promise<Configuration> {
  const configFile = await loadConfigFile(runOptions.configFile)

  const logger = configFile?.logger ?? consoleLogger()

  const collectCoverage = runOptions.collectCoverage ?? configFile?.collectCoverage ?? false
  const coverageReporter = collectCoverage ? configFile?.coverageReporter ?? new MonocartCoverageReporter() : undefined

  const orderType = runOptions.orderType ?? configFile?.orderType

  return {
    configFile: runOptions.configFile,
    browserGenerator: configFile?.browser,
    browserContextGenerator: configFile?.browserContext,
    behaviorGlobs: runOptions.behaviorGlobs ?? configFile?.behaviorGlobs,
    browserBehaviors: runOptions.browserBehaviors ?? configFile?.browserBehaviors,
    behaviorFilter: runOptions.behaviorFilter,
    runContext: configFile?.context,
    parallel: runOptions.parallel ?? configFile?.parallel ?? false,
    runPickedOnly: runOptions.runPickedOnly ?? false,
    failFast: runOptions.failFast ?? configFile?.failFast ?? false,
    showBrowser: runOptions.showBrowser ?? false,
    viteConfig: runOptions.viteConfig ?? configFile?.viteConfig,
    collectCoverage,
    coverageReporter,
    reporter: configFile?.reporter ?? defaultReporter(logger),
    orderType,
    orderProvider: getOrderProvider(orderType),
    logger
  }
}

export function getRunOptions(config: Configuration): ValidationRunOptions {
  return {
    configFile: config.configFile,
    behaviorGlobs: config.behaviorGlobs,
    behaviorFilter: config.behaviorFilter,
    browserBehaviors: config.browserBehaviors,
    parallel: config.parallel,
    failFast: config.failFast,
    runPickedOnly: config.runPickedOnly,
    viteConfig: config.viteConfig,
    showBrowser: config.showBrowser,
    orderType: config.orderType,
    collectCoverage: config.collectCoverage
  }
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

