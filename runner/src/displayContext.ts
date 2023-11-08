import { Page } from "playwright"
import { useLocalBrowser } from "./localBrowser.js"

export interface DisplayContext<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

export async function useDisplay<Args, Handle = void>(): Promise<Display<Args, Handle>> {
  // this might need to call useLocalBrowser under the hood ...
  // or do we just need a playwright browser here?
  // I guess it depends on whether we need to load html?
  const localBrowser = await useLocalBrowser()
  return new Display(localBrowser.page)
}

export class Display<Args, Handle> {
  constructor(private _page: Page) { }

  async mount(args: Args): Promise<void> {
    // we need to load *this* behavior in the browser
    // we could do that by loading some function in the browser that
    // we can call with the path, like we do for browser specs.
    // But then that function would load this module and get the `displayContext`
    // export. It would then call `render` with the passed in args.
    // Later we would need to call `teardown` but this might have to be manually
    // done via the normal example context.
  }

  get page(): Page {
    return this._page
  }
}