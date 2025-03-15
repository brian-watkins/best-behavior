import { BrowserContext, Page } from "playwright"
import { PlaywrightBrowser } from "../../browser/playwrightBrowser.js"
import { BrowserReporter } from "./browserReporter.js"
import { decoratePage, PreparedBrowser, PreparedBrowserOptions } from "../../browser/preparedBrowser.js"
import { RuntimeAttributes } from "../../validator/index.js"
import { BehaviorBrowserWindow } from "./behaviorBrowserWindow.js"

declare let window: BehaviorBrowserWindow

export interface BehaviorBrowserOptions extends PreparedBrowserOptions {
  homePage?: string
}

export class BehaviorBrowser extends PreparedBrowser {
  private _page: Page | undefined

  constructor(browser: PlaywrightBrowser, private attributes: RuntimeAttributes, private options: BehaviorBrowserOptions) {
    super(browser, attributes.localServer, options)
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
    
    this._page = decoratePage(page, [
      this.betterExceptionHandling()
    ])

    const homePage = this.options.homePage ?? this.attributes.localServer.urlForPath("/@best-behavior")
    await this._page.goto(homePage)

    this._page.evaluate((runContextValue) => {
      window.__best_behavior_run_context = {
        value: runContextValue
      }
    }, this.attributes.runContext)

    this.startCoverage(this._page)

    return this._page
  }

  async finishCoverageCollection(): Promise<void> {
    if (this._page !== undefined) {
      await this.stopCoverage(this._page)
    }
  }
}

