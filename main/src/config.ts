import { Options, lilconfig, Loader } from "lilconfig";
import { PlaywrightBrowserContextGenerator, PlaywrightBrowserGenerator } from "./browser/playwrightBrowser.js";
import { Transpiler } from "./transpiler/index.js";
import { Reporter } from "esbehavior";
import { Logger } from "./logger.js";
import { CoverageReporter } from "./coverage/coverageReporter.js";
export type { Logger } from "./logger.js"
export type { PlaywrightBrowserGenerator, PlaywrightBrowserContextGenerator } from "./browser/playwrightBrowser.js"

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

export interface BestBehaviorConfig {
  browser?: PlaywrightBrowserGenerator
  context?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
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

function transpilerLoader(transpiler: Transpiler): (path: string) => Promise<Loader> {
  return (path) => {
    return transpiler.loadModule(path)
  }
}

export async function getConfig(transpiler: Transpiler, path: string | undefined): Promise<BestBehaviorConfig | undefined> {
  const options: Options = {
    searchPlaces: [
      `best.config.js`,
      `best.config.cjs`,
      `best.config.mjs`,
      `best.config.ts`,
      `best.config.mts`,
    ],
    loaders: {
      ".js": transpilerLoader(transpiler),
      ".cjs": transpilerLoader(transpiler),
      ".mjs": transpilerLoader(transpiler),
      ".ts": transpilerLoader(transpiler),
      ".mts": transpilerLoader(transpiler)
    }
  }

  const configResult = path !== undefined ?
    await lilconfig('bb', options).load(path) :
    await lilconfig('bb', options).search()

  return configResult?.config?.default
}