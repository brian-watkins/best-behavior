import { useContext } from "./useContext.js";
import { LocalServer } from "./localServer.js";
import { Page } from "playwright";

export async function useLocalBrowser(): Promise<LocalBrowser> {
  const page = await useContext().basicBrowser.getPage()
  return new PlaywrightLocalBrowser(page, useContext().localServer)
}

export interface LocalBrowser {
  page: Page
  loadLocal(path: string): Promise<void>
}

class PlaywrightLocalBrowser implements LocalBrowser {
  constructor(readonly page: Page, private localServer: LocalServer) { }

  async loadLocal(path: string): Promise<void> {
    await this.page.goto(this.localServer.urlForPath(path))
  }
}
