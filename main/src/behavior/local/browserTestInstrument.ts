import { Page } from "playwright";
import { PlaywrightBrowserContextGenerator } from "../../browser/playwrightBrowser.js";
import { PlaywrightTestInstrument } from "./playwrightTestInstrument.js";
import { Context } from "esbehavior";
import { useTestInstrument } from "./testInstrumentContext.js";

export interface BrowserTestInstrument {
  page: Page
  isVisible: boolean
}

export interface BrowserContextOptions {
  contextGenerator?: PlaywrightBrowserContextGenerator
}

export function browserContext(options: BrowserContextOptions = {}): Context<BrowserTestInstrument> {
  let playwrightTestInstrument: PlaywrightTestInstrument

  return {
    init: async () => {
      playwrightTestInstrument = useTestInstrument().playwrightTestInstrument
      await playwrightTestInstrument.reset(options.contextGenerator)

      return {
        page: playwrightTestInstrument.page,
        isVisible: playwrightTestInstrument.isVisible
      }
    },
    teardown: async () => {
      await playwrightTestInstrument.afterExample()
    },
  }
}