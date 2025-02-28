import { Browser, BrowserContext, chromium } from "playwright";

export type PlaywrightBrowserGenerator = (showBrowser: boolean) => Promise<Browser>

export type PlaywrightBrowserContextGenerator = (browser: Browser, localServerURL?: string) => Promise<BrowserContext>

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
  baseURL: string
  browserGenerator: PlaywrightBrowserGenerator | undefined
  browserContextGenerator: PlaywrightBrowserContextGenerator | undefined
}

export class PlaywrightBrowser {
  private browser: Browser | undefined;

  constructor(private options: PlaywrightBrowserOptions) { }

  private async start(): Promise<void> {
    const generator = this.options.browserGenerator ?? defaultBrowserGenerator
    this.browser = await generator(this.options.showBrowser)
  }

  get isVisible(): boolean {
    return this.isOpen && this.options.showBrowser
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

const defaultBrowserContextGenerator: PlaywrightBrowserContextGenerator = (browser, localServerURL) => {
  return browser.newContext({
    baseURL: localServerURL
  })
}