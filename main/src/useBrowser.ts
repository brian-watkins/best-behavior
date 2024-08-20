import { useContext } from "./useContext.js";
import { BrowserContext, Page } from "playwright";
import { PlaywrightBrowser, PlaywrightBrowserContextGenerator, PreparedBrowser, PreparedBrowserOptions } from "./adapters/playwrightBrowser.js";
import { Context } from "esbehavior";

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
        page: playwrightTestInstrument.getPage()
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

  constructor(browser: PlaywrightBrowser, options: PreparedBrowserOptions) {
    super(browser, options)
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
    this._page = await this._context.newPage()
    await this._page.setContent(`<html><head><base href="http://localhost:5173/" /></head><body></body></html>`)

    await this.startCoverage(this._page)
  }

  getPage(): Page {
    return pageWithBetterExceptionHandling(this._page!, this.browser.baseURL)
  }

  async afterExample(): Promise<void> {
    await this.stopCoverage(this._page!)
  }
}

function pageWithBetterExceptionHandling(page: Page, baseURL: string): Page {
  return new Proxy(page, {
    get(target, prop) {
      //@ts-ignore
      const val = target[prop]
      if (typeof val === "function") {
        return (...args: Array<any>) => {
          try {
            const result = val.apply(target, args)
            if (result instanceof Promise) {
              return result.catch((err: any) => {
                throw errorWithCorrectedStack(err, baseURL)
              })
            }
            return result
          } catch (err: any) {
            throw errorWithCorrectedStack(err, baseURL)
          }
        }
      } else {
        return val
      }
    }
  })
}

function errorWithCorrectedStack(error: Error, baseURL: string): Error {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.replaceAll(baseURL, "")
  }
}