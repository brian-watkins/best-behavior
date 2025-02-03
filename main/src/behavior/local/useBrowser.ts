import { PlaywrightBrowserContextGenerator } from "../../browser/playwrightBrowser.js";
import { Context } from "esbehavior";
import { browserContext, BrowserTestInstrument } from "./browserTestInstrument.js";

export interface ContextWithBrowser<T> {
  init(browser: BrowserTestInstrument): T | Promise<T>
  teardown?(context: T): void | Promise<void>
  browserContextGenerator?: PlaywrightBrowserContextGenerator
}

const defaultUseBrowserContext: ContextWithBrowser<any> = {
  init: (browserTestInstrument) => browserTestInstrument
}

// NOTE: Deprecated. Use browserContext() instead ...
export function useBrowser<T = BrowserTestInstrument>(context: ContextWithBrowser<T> = defaultUseBrowserContext): Context<T> {
  const bctx = browserContext({ contextGenerator: context.browserContextGenerator })
  let testInstrument: BrowserTestInstrument

  return {
    init: async () => {
      testInstrument = await bctx.init()
      return context.init(testInstrument)
    },
    teardown: async (contextValue) => {
      await context.teardown?.(contextValue)
      await bctx.teardown?.(testInstrument)
    },
  }
}
