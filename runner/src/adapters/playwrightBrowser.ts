import { Browser, BrowserContext, Page, chromium } from "playwright";
import { Logger } from "../logger.js";
import { pathInNodeModules, pathTo } from "../path.js";

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
  private page: Page | undefined

  constructor(private browser: PlaywrightBrowser, private options: PreparedBrowserOptions) { }

  protected async getContext(): Promise<BrowserContext> {
    const context = await this.browser.newBrowserContext()
    
    if (this.options.adapterPath) {
      await context.addInitScript({ path: this.options.adapterPath })
    }

    if (sourceMapSupportPath) {
      await context.addInitScript({ path: pathTo(sourceMapSupportPath, "browser-source-map-support.js") })
      await context.addInitScript({ content: "sourceMapSupport.install()" })
    }

    context.on("console", (message) => {
      this.options.logger.info(message.text())
    })
    context.on("weberror", (webError) => {
      this.options.logger.error(webError.error())
    })

    return context
  }

  async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    const context = await this.getContext()
    this.page = await context.newPage()

    return this.page
  }
}