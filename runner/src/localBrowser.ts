import { useContext } from "./behaviorContext.js";
import { LocalServer } from "./localServer.js";
import { PlaywrightBrowser } from "./playwrightBrowser.js";
import { Page } from "playwright";

export async function useLocalBrowser(): Promise<LocalBrowser> {
  // @ts-ignore
  // const localBrowser = globalThis[Symbol.for("LocalBrowserInstance")]!
  // await localBrowser[Symbol.for("PreparePage")]()
  // return localBrowser

  const localBrowser: any = useContext().browser
  await localBrowser[Symbol.for("PreparePage")]()
  return localBrowser
}

export class LocalBrowser {
  private _page: Page | undefined;

  // static configure(localServer: LocalServer, playwrightBrowser: PlaywrightBrowser) {
    // @ts-ignore
    // globalThis[Symbol.for("LocalBrowserInstance")] = new LocalBrowser(localServer, playwrightBrowser)
  // }

  constructor (private localServer: LocalServer, private playwrightBrowser: PlaywrightBrowser) { }

  async loadLocalPage(path: string): Promise<void> {
    await this.page.goto(this.localServer.urlForPath(path))
  }

  async [Symbol.for("PreparePage")](): Promise<void> {
    this._page = await this.playwrightBrowser.newPage()
  }

  get page(): Page {
    return this._page!
  }
}

