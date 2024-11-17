import { PlaywrightBrowserContextGenerator, PlaywrightBrowserGenerator } from "../browser/playwrightBrowser.js";
import { Reporter, StandardReporter } from "esbehavior";
import { consoleLogger, Logger } from "../logger.js";
import { CoverageReporter } from "../coverage/coverageReporter.js";
import { MonocartCoverageReporter } from "../coverage.js";
import { BrowserBehaviorOptions, OrderType, ValidationRunOptions } from "./public.js";
import { loadConfigFile } from "./configFile.js";

export interface Configuration {
  browserGenerator?: PlaywrightBrowserGenerator
  browserContextGenerator?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
  behaviorFilter?: string
  runPickedOnly: boolean
  failFast: boolean
  showBrowser: boolean
  viteConfig?: string
  collectCoverage: boolean
  coverageReporter?: CoverageReporter
  reporter: Reporter
  orderType?: OrderType
  logger: Logger
}

export async function getConfiguration(runOptions: ValidationRunOptions): Promise<Configuration> {
  const configFile = await loadConfigFile(runOptions.config)

  const logger = configFile?.logger ?? consoleLogger()

  const collectCoverage = runOptions.collectCoverage ?? configFile?.collectCoverage ?? false
  const coverageReporter = collectCoverage ? configFile?.coverageReporter ?? new MonocartCoverageReporter() : undefined

  return {
    browserGenerator: configFile?.browser,
    browserContextGenerator: configFile?.context,
    behaviorGlobs: runOptions.behaviorGlobs ?? configFile?.behaviorGlobs,
    browserBehaviors: runOptions.browserBehaviors ?? configFile?.browserBehaviors,
    behaviorFilter: runOptions.behaviorFilter,
    runPickedOnly: runOptions.runPickedOnly ?? false,
    failFast: runOptions.failFast ?? configFile?.failFast ?? false,
    showBrowser: runOptions.showBrowser ?? false,
    viteConfig: runOptions.viteConfig ?? configFile?.viteConfig,
    collectCoverage,
    coverageReporter,
    reporter: configFile?.reporter ?? defaultReporter(logger),
    orderType: runOptions.orderType ?? configFile?.orderType,
    logger
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

