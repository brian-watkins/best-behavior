import { LocalServer } from "./localServer.js";
import { PlaywrightBrowser } from "./playwrightBrowser.js";
import { Page } from "playwright";

export async function useLocalBrowser(): Promise<LocalBrowser> {
  //@ts-ignore
  const localBrowser = globalThis[Symbol.for("LocalBrowserInstance")]!
  await localBrowser[Symbol.for("PreparePage")]()
  return localBrowser
}

export class LocalBrowser {
  private _page: Page | undefined;

  static configure(localServer: LocalServer, playwrightBrowser: PlaywrightBrowser) {
    //@ts-ignore
    globalThis[Symbol.for("LocalBrowserInstance")] = new LocalBrowser(localServer, playwrightBrowser)
  }

  private constructor (private localServer: LocalServer, private playwrightBrowser: PlaywrightBrowser) { }

  async loadLocalPage(path: string): Promise<void> {
    await this.page.goto(this.localServer.urlForPath(path))
  }

  async [Symbol.for("PreparePage")](): Promise<void> {
    const browser = await this.playwrightBrowser.getPlaywrightBrowser()
    const context = await browser.newContext()
    const page = await context.newPage()
    page.on("console", (message) => {
      const text = message.text()
      if (text.startsWith("[vite]")) return
      console.log(text.replace(this.localServer.host, ''))
    })
    page.on("pageerror", console.log)
    this._page = page
  }

  get page(): Page {
    return this._page!
  }
}

