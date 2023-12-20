import { useContext } from "./useContext.js";
import { BrowserContext, Page } from "playwright";
import { PlaywrightBrowserContextGenerator, PreparedBrowser } from "./adapters/playwrightBrowser.js";

export async function useBrowser(context?: PlaywrightBrowserContextGenerator): Promise<BrowserTestInstrument> {
  const browserTestInstrument = useContext().browserTestInstrument
  await browserTestInstrument.reset(context)
  return browserTestInstrument
}

export interface BrowserTestInstrument {
  page: Page
}

export class PlaywrightTestInstrument extends PreparedBrowser implements BrowserTestInstrument {
  private _context: BrowserContext | undefined

  protected async getContext(generator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    const context = await super.getContext(generator)

    await context.addInitScript({
      content: `
      window["__vite_ssr_dynamic_import__"] = (path) => {
        const url = new URL(path, "${this.browser.baseURL}");
        return import(url.href);
      };
      window["__vite_ssr_import_0__"] = {
        default: (map, key) => {
          if (map[key] === undefined) {
            throw new Error("Failed to fetch dynamically imported module: " + key)
          }
          return map[key]()
        }
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
  }

  get page(): Page {
    return pageWithBetterExceptionHandling(this._page!, this.browser.baseURL)
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
  return { ...error, stack: error.stack?.replaceAll(baseURL, "") }
}