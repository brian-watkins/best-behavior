import { Page } from "playwright";
import { PlaywrightBrowserContextGenerator } from "./playwrightBrowser.js";
import { LocalBrowser } from "./localBrowser.js";
import { Context } from "esbehavior";

export interface BrowserTestInstrument {
  page: Page
  isVisible: boolean
}

export interface BrowserContextOptions {
  contextGenerator?: PlaywrightBrowserContextGenerator
}

export function browserContext(options: BrowserContextOptions = {}): Context<BrowserTestInstrument> {
  let localBrowser: LocalBrowser

  return {
    init: async () => {
      localBrowser = useLocalBrowser()
      await localBrowser.reset(options.contextGenerator)

      return {
        page: localBrowser.page,
        isVisible: localBrowser.isVisible
      }
    },
    teardown: async () => {
      await localBrowser.afterExample()
    },
  }
}

interface CustomGlobalThis extends Global {
  __best_behavior_instrument_context: TestInstrumentContext | undefined
}

declare let globalThis: CustomGlobalThis

export interface TestInstrumentContext {
  localBrowser: LocalBrowser
}

export function provideLocalBrowser(localBrowser: LocalBrowser) {
  globalThis.__best_behavior_instrument_context = {
    localBrowser: localBrowser
  }
}

function useLocalBrowser(): LocalBrowser {
  return globalThis.__best_behavior_instrument_context!.localBrowser
}

