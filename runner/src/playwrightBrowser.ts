import { Browser, BrowserContext, Page, chromium } from "playwright";
import { Logger } from "./logger.js";
import fs from "fs"

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
  logger: Logger
}

export function browserLogger(logger: Logger): Logger {
  return {
    info: (line) => {
      if (line.startsWith("[vite]")) return
      logger.info(line)
    },
    error: (err) => {
      logger.error(err)
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

export class PreparedBrowser {
  constructor(private browser: PlaywrightBrowser, private adapterPath: string) { }

  async newPage(): Promise<Page> {
    const page = await this.browser.newPage()

    const adapter = fs.readFileSync(this.adapterPath, "utf8")
    await page.evaluate(adapter)

    return page
  }
}