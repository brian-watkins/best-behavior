import { useContext } from "../../useContext.js";
import { PlaywrightBrowserContextGenerator } from "../../browser/playwrightBrowser.js";
import { Context } from "esbehavior";
import { PlaywrightTestInstrument } from "./playwrightTestInstrument.js";
import { BrowserTestInstrument } from "./browserTestInstrument.js";

export interface ContextWithBrowser<T> {
  init(browser: BrowserTestInstrument): T | Promise<T>
  teardown?(context: T): void | Promise<void>
}

export interface UseBrowserOptions {
  browserContextGenerator?: PlaywrightBrowserContextGenerator
}

export function useBrowser<T>(context: ContextWithBrowser<T>, options: UseBrowserOptions = {}): Context<T> {
  let playwrightTestInstrument: PlaywrightTestInstrument

  return {
    init: async () => {
      playwrightTestInstrument = useContext().playwrightTestInstrument
      await playwrightTestInstrument.reset(options.browserContextGenerator)

      return await context.init({
        page: playwrightTestInstrument.page
      })
    },
    teardown: async (contextValue) => {
      await playwrightTestInstrument.afterExample()

      await context.teardown?.(contextValue)
    },
  }
}

