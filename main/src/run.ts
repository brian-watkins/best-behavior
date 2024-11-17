import { getConfiguration } from "./config/configuration.js"
import { ValidationRunOptions } from "./config/public.js"
import { run, ValidationRunResult } from "./runner.js"

export { ValidationRunResult } from "./runner.js"
export { defaultOrder, randomOrder, defineConfig } from "./config/public.js"
export type {
    BrowserBehaviorOptions,
    RandomOrder,
    DefaultOrder,
    OrderType,
    ValidationRunOptions,
    BestBehaviorConfig
} from "./config/public.js"
export type { Logger } from "./logger.js"
export { consoleLogger } from "./logger.js"
export type {
    PlaywrightBrowserGenerator,
    PlaywrightBrowserContextGenerator
} from "./browser/playwrightBrowser.js"

export async function validateBehaviors(options: ValidationRunOptions): Promise<ValidationRunResult> {
    const config = await getConfiguration(options)
    return run(config)
}