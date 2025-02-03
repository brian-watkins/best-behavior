import { PlaywrightBrowserContextGenerator } from "../../browser/playwrightBrowser.js";
import { Context } from "esbehavior";
import { PlaywrightTestInstrument } from "./playwrightTestInstrument.js";
import { BrowserTestInstrument } from "./browserTestInstrument.js";
import { useTestInstrument } from "./testInstrumentContext.js";

export interface ContextWithBrowser<T> {
  init(browser: BrowserTestInstrument): T | Promise<T>
  teardown?(context: T): void | Promise<void>
  browserContextGenerator?: PlaywrightBrowserContextGenerator
}

const defaultUseBrowserContext: ContextWithBrowser<any> = {
  init: (browserTestInstrument) => browserTestInstrument
}

export function useBrowser<T = BrowserTestInstrument>(context: ContextWithBrowser<T> = defaultUseBrowserContext): Context<T> {
  let playwrightTestInstrument: PlaywrightTestInstrument

  return {
    init: async () => {
      playwrightTestInstrument = useTestInstrument().playwrightTestInstrument
      await playwrightTestInstrument.reset(context.browserContextGenerator)

      return await context.init({
        page: playwrightTestInstrument.page,
        isVisible: playwrightTestInstrument.isVisible
      })
    },
    teardown: async (contextValue) => {
      await playwrightTestInstrument.afterExample()

      await context.teardown?.(contextValue)
    },
  }
}
