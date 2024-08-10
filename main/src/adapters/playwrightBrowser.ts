import { Browser, BrowserContext, chromium, Page } from "playwright";
import { Logger } from "../logger.js";
import url from "url"
import { CoverageReporter } from "../runtime/coverageReporter.js";

export type PlaywrightBrowserGenerator = (showBrowser: boolean) => Promise<Browser>

export type PlaywrightBrowserContextGenerator = (browser: Browser, localServerURL?: string) => Promise<BrowserContext>

const defaultBrowserContextGenerator: PlaywrightBrowserContextGenerator = (browser, localServerURL) => {
  return browser.newContext({
    baseURL: localServerURL
  })
}

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
  baseURL: string
  browserGenerator: PlaywrightBrowserGenerator | undefined
  browserContextGenerator: PlaywrightBrowserContextGenerator | undefined
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
    const generator = this.options.browserGenerator ?? defaultBrowserGenerator
    this.browser = await generator(this.options.showBrowser)
  }

  get isOpen(): boolean {
    return this.browser !== undefined
  }

  get baseURL(): string {
    return this.options.baseURL
  }

  async stop(): Promise<void> {
    await this.browser?.close()
  }

  async newBrowserContext(contextGenerator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    if (!this.browser) {
      await this.start()
    }

    const generator = contextGenerator ?? this.options.browserContextGenerator ?? defaultBrowserContextGenerator
    return generator(this.browser!, this.options.baseURL)
  }
}

const defaultBrowserGenerator: PlaywrightBrowserGenerator = (showBrowser) => {
  return chromium.launch({
    headless: !showBrowser
  })
}

export interface PreparedBrowserOptions {
  adapterPath?: string
  coverageReporter?: CoverageReporter
  logger: Logger
}

export class PreparedBrowser {
  constructor(protected browser: PlaywrightBrowser, private browserOptions: PreparedBrowserOptions) { }

  protected async getContext(generator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    const context = await this.browser.newBrowserContext(generator)

    if (this.browserOptions.adapterPath) {
      await context.addInitScript({ path: this.browserOptions.adapterPath })
    }

    await context.addInitScript({ path: pathToFile("../../adapter/sourceMapSupport.cjs") })

    context.on("console", (message) => {
      this.browserOptions.logger.info(message.text(), "Browser")
    })
    context.on("weberror", (webError) => {
      this.browserOptions.logger.error(`${webError.error().stack}`, "Browser Error")
    })

    return context
  }

  async startCoverage(page: Page): Promise<void> {
    if (this.browserOptions.coverageReporter !== undefined) {
      await page.coverage.startJSCoverage({
        resetOnNavigation: false
      })
    }
  }

  async stopCoverage(page: Page): Promise<void> {
    if (this.browserOptions.coverageReporter !== undefined) {
      const coverageData = await page.coverage.stopJSCoverage()
      await this.browserOptions.coverageReporter.recordData(coverageData)  
    }
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}