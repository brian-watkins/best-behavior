import { Browser, chromium } from "playwright";

export class PlaywrightBrowser {
  private browser: Browser | undefined;
  
  private async start(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true
    })
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