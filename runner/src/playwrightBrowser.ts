import { Browser, BrowserContext, Page, chromium } from "playwright";
import { Logger } from "./logger.js";
import { pathInNodeModules, pathTo } from "./path.js";

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
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
}

const sourceMapSupportPath = pathInNodeModules("source-map-support")

export interface PreparedBrowserOptions {
  adapterPath?: string
  logger: Logger
}

export class PreparedBrowser {
  private context: BrowserContext | undefined
  private page: Page | undefined

  constructor(private browser: PlaywrightBrowser, private options: PreparedBrowserOptions) { }

  async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    this.context = await this.browser.newBrowserContext()
    
    if (this.options.adapterPath) {
      await this.context.addInitScript({ path: this.options.adapterPath })
    }

    if (sourceMapSupportPath) {
      await this.context.addInitScript({ path: pathTo(sourceMapSupportPath, "browser-source-map-support.js") })
      await this.context.addInitScript({ content: "sourceMapSupport.install()" })
    }

    this.context.on("console", (message) => {
      this.options.logger.info(message.text())
    })
    this.context.on("weberror", (webError) => {
      this.options.logger.error(webError.error())
    })

    this.page = await this.context.newPage()

    return this.page
  }
}