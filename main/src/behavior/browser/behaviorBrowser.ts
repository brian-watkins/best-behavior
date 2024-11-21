import { BrowserContext, Page } from "playwright"
import { PlaywrightBrowser } from "../../browser/playwrightBrowser.js"
import { BrowserReporter } from "./browserReporter.js"
import { PreparedBrowser, PreparedBrowserOptions } from "../../browser/preparedBrowser.js"
import { LocalServerContext } from "../../localServer/context.js"

export interface BehaviorBrowserOptions extends PreparedBrowserOptions {
  homePage?: string
}

export class BehaviorBrowser extends PreparedBrowser {
  private _page: Page | undefined

  constructor(browser: PlaywrightBrowser, localServer: LocalServerContext, private options: BehaviorBrowserOptions) {
    super(browser, localServer, options)
  }

  protected async getContext(): Promise<BrowserContext> {
    const context = await super.getContext()

    context.exposeBinding("__bb_pageBinding", ({ page }, ...args) => {
      const pageFunction = eval(args[0])
      return pageFunction(page, args[1])
    })

    return context
  }

  async getPage(reporter: BrowserReporter): Promise<Page> {
    if (this._page !== undefined) {
      return this._page
    }

    const context = await this.getContext()

    await reporter.decorateContext(context)

    const page = await context.newPage()
    this._page = this.decoratePageWithBetterExceptionHandling(page)

    if (this.options.homePage !== undefined) {
      await this._page.goto(this.options.homePage)
    }

    this.startCoverage(this._page)

    return this._page
  }

  async finishCoverageCollection(): Promise<void> {
    if (this._page !== undefined) {
      await this.stopCoverage(this._page)
    }
  }
}

