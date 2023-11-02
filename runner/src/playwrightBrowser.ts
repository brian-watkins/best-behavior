import { Browser, chromium } from "playwright";

export interface PlaywrightBrowserOptions {
  showBrowser: boolean
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

  async getPlaywrightBrowser(): Promise<Browser> {
    if (!this.browser) {
      await this.start()
    }

    return this.browser!
  }
}