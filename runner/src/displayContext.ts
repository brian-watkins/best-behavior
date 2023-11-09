import { Page } from "playwright"
import { LocalBrowser, useLocalBrowser } from "./localBrowser.js"
import { useContext } from "./behaviorContext.js"

export interface DisplayContext<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

export async function useDisplay<Args, Handle = void>(): Promise<Display<Args, Handle>> {
  // we could do useContext whereever I guess? either here and pass
  // the path to the Display or in the display when we call mount?
  // same with useLocalBrowser(). It kind of doesn't matter when we call
  // these things. Execpt that once we create a display, it could be used
  // in the context of the various examples. So we would want the mount
  // function to be available.
  console.log("Current behavior path", useContext().currentBehavior)
  
  const localBrowser = await useLocalBrowser()
  return new Display(localBrowser)
}

export class Display<Args, Handle> {
  constructor(private browser: LocalBrowser) { }

  async mount(args: Args): Promise<void> {

    // we need to load *this* behavior in the browser
    // we could do that by loading some function in the browser that
    // we can call with the path, like we do for browser specs.
    // But then that function would load this module and get the `displayContext`
    // export. It would then call `render` with the passed in args.
    // Later we would need to call `teardown` but this might have to be manually
    // done via the normal example context.

    // we would need to call the adapter function with the behavior path and the args

    // we now have a way to get the 

  }

  get page(): Page {
    return this.browser.page
  }
}