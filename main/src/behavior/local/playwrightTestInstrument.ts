import { BrowserContext, Page } from "playwright"
import { PreparedBrowser, PreparedBrowserOptions } from "../../browser/preparedBrowser.js"
import { PlaywrightBrowser, PlaywrightBrowserContextGenerator } from "../../browser/playwrightBrowser.js"
import { LocalServerContext } from "../../localServer/context.js"

export class PlaywrightTestInstrument extends PreparedBrowser {
  private _context: BrowserContext | undefined
  private _page: Page | undefined

  constructor(browser: PlaywrightBrowser, localServer: LocalServerContext, options: PreparedBrowserOptions) {
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
