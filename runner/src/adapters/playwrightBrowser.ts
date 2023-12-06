import { Browser, BrowserContext, BrowserContextOptions, Page, chromium } from "playwright";
import { Logger } from "../logger.js";
import { pathInNodeModules, pathTo } from "../path.js";

export type PlaywrightBrowserGenerator = (showBrowser: boolean) => Promise<Browser>

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
  generator: PlaywrightBrowserGenerator | undefined
}

export function browserLogger(host: string, logger: Logger): Logger {
  return {
    info: (line, source) => {
      if (line.startsWith("[vite]")) return
      logger.info(line.replaceAll(host, ""), source)
    },
    error: (err, source) => {
      logger.error(err.replaceAll(host, ""), source)
    }
  }
}

export class PlaywrightBrowser {
  private browser: Browser | undefined;

  constructor(private options: PlaywrightBrowserOptions) { }

  private async start(): Promise<void> {
    const generator = this.options.generator ?? defaultBrowserGenerator
    this.browser = await generator(this.options.showBrowser)
  }

  get isOpen(): boolean {
    return this.browser !== undefined
  }

  async stop(): Promise<void> {
    await this.browser?.close()
  }

  async newBrowserContext(options?: BrowserContextOptions): Promise<BrowserContext> {
    if (!this.browser) {
      await this.start()
    }

    return this.browser!.newContext(options)
  }
}

const defaultBrowserGenerator: PlaywrightBrowserGenerator = (showBrowser) => {
  return chromium.launch({
    headless: !showBrowser
  })
} 

const sourceMapSupportPath = pathInNodeModules("source-map-support")

export interface PreparedBrowserOptions {
  adapterPath?: string
  baseUrl?: string
  logger: Logger
}

export class PreparedBrowser {
  protected _page: Page | undefined

  constructor(private browser: PlaywrightBrowser, private options: PreparedBrowserOptions) { }

  protected async getContext(): Promise<BrowserContext> {
    const context = await this.browser.newBrowserContext({
      baseURL: this.options.baseUrl
    })
    
    if (this.options.adapterPath) {
      await context.addInitScript({ path: this.options.adapterPath })
    }

    if (sourceMapSupportPath) {
      await context.addInitScript({ path: pathTo(sourceMapSupportPath, "browser-source-map-support.js") })
      await context.addInitScript({ content: "sourceMapSupport.install()" })
    }

    context.on("console", (message) => {
      this.options.logger.info(message.text(), "Browser")
    })
    context.on("weberror", (webError) => {
      this.options.logger.error(`${webError.error().stack}`, "Browser Error")
    })

    return context
  }

  async getPage(): Promise<Page> {
    if (this._page !== undefined) {
      return this._page
    }

    const context = await this.getContext()
    this._page = await context.newPage()

    return this._page
  }
}