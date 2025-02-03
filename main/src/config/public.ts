import { Context, Reporter } from "esbehavior"
import { PlaywrightBrowserContextGenerator, PlaywrightBrowserGenerator } from "../browser/playwrightBrowser.js"
import { CoverageReporter } from "../coverage.js"
import { Logger } from "../logger.js"

export interface BrowserBehaviorOptions {
  globs?: Array<string>
  html?: string
}

export interface RandomOrder {
  type: "random"
  seed?: string
}

export function randomOrder(seed?: string): RandomOrder {
  return {
    type: "random",
    seed
  }
}

export interface DefaultOrder {
  type: "default"
}

export function defaultOrder(): DefaultOrder {
  return {
    type: "default"
  }
}

export type OrderType = RandomOrder | DefaultOrder

export interface ValidationRunOptions {
  configFile?: string
  behaviorGlobs?: Array<string>
  behaviorFilter?: string
  browserBehaviors?: BrowserBehaviorOptions
  parallel?: boolean
  failFast?: boolean
  runPickedOnly?: boolean
  viteConfig?: string
  showBrowser?: boolean
  orderType?: OrderType
  collectCoverage?: boolean
}

export interface BestBehaviorConfig {
  browser?: PlaywrightBrowserGenerator
  browserContext?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
  context?: Context<any>
  parallel?: boolean
  failFast?: boolean
  viteConfig?: string
  collectCoverage?: boolean
  coverageReporter?: CoverageReporter
  reporter?: Reporter
  orderType?: OrderType
  logger?: Logger
}

export function defineConfig(config: BestBehaviorConfig): BestBehaviorConfig {
  return config
}
