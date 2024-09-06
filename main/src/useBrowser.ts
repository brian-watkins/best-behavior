import { useContext } from "./useContext.js";
import { BrowserContext, Page } from "playwright";
import { PlaywrightBrowser, PlaywrightBrowserContextGenerator } from "./adapters/playwrightBrowser.js";
import { Context } from "esbehavior";
import { LocalServer } from "./localServer.js";
import { PreparedBrowser, PreparedBrowserOptions } from "./preparedBrowser.js";

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

export interface BrowserTestInstrument {
  page: Page
}

export class PlaywrightTestInstrument extends PreparedBrowser {
  private _context: BrowserContext | undefined
  private _page: Page | undefined

  constructor(browser: PlaywrightBrowser, localServer: LocalServer, options: PreparedBrowserOptions) {
    super(browser, localServer, options)
  }

  protected async getContext(generator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    const context = await super.getContext(generator)

    await context.addInitScript({
      content: `
      window["__variableDynamicImportRuntimeHelper"] = (map, key) => {
        if (map[key] === undefined) {
          throw new Error("Failed to fetch dynamically imported module: " + key)
        }
        return map[key]()
      };
    ` })

    return context
  }

  async reset(generator?: PlaywrightBrowserContextGenerator): Promise<void> {
    if (this._context !== undefined) {
      await this._context.close()
    }
    this._context = await this.getContext(generator)
    const page = await this._context.newPage()

    await page.setContent(`<html><head><base href="${this.localServer.host}" /></head><body></body></html>`)

    await this.startCoverage(page)

    this._page = this.decoratePageWithBetterExceptionHandling(page)
  }

  get page(): Page {
    return this._page!
  }

  async afterExample(): Promise<void> {
    await this.stopCoverage(this._page!)
  }
}
