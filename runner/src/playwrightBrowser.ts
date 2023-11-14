import { Browser, BrowserContext, Page, chromium } from "playwright";
import { Logger } from "./logger.js";
import fs from "fs"
import { pathInNodeModules, pathTo } from "./path.js";

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
  logger: Logger
}

export function browserLogger(host: string, logger: Logger): Logger {
  return {
    info: (line) => {
      if (line.startsWith("[vite]")) return
      logger.info(line.replaceAll(host, ""))
    },
    error: (err) => {
      logger.error({ ...err, stack: err.stack?.replaceAll(host, "") })
    }
  }
}

export class PlaywrightBrowser {
  private browser: Browser | undefined;

  constructor(private options: PlaywrightBrowserOptions) { }

  private async start(): Promise<void> {
    this.browser = await chromium.launch({
      headless: !this.options.showBrowser
    })
  }

  get isOpen(): boolean {
    return this.browser !== undefined
  }

  async stop(): Promise<void> {
    await this.browser?.close()
  }

  async newBrowserContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.start()
    }

    return this.browser!.newContext()
  }

  async newPage(): Promise<Page> {
    const context = await this.newBrowserContext()
    const page = await context.newPage()
    page.on("console", (message) => {
      this.options.logger.info(message.text())
    })
    page.on("pageerror", (error) => {
      this.options.logger.error(error)
    })
    return page
  }
}

const sourceMapSupportPath = pathInNodeModules("source-map-support")

export class PreparedBrowser {
  private page: Page | undefined

  constructor(private browser: PlaywrightBrowser, private adapterPath: string) { }

  async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    this.page = await this.browser.newPage()

    const adapter = fs.readFileSync(this.adapterPath, "utf8")
    await this.page.evaluate(adapter)

    if (sourceMapSupportPath) {
      await this.page.addScriptTag({
        path: pathTo(sourceMapSupportPath, "browser-source-map-support.js")
      })
      await this.page.addScriptTag({
        content: "sourceMapSupport.install()"
      })
    }

    return this.page
  }
}