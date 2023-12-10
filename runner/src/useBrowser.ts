import { useContext } from "./useContext.js";
import { BrowserContext, JSHandle, Page } from "playwright";
import { ViewController, ViewControllerModuleLoader } from "./view.js";
import { PlaywrightBrowserContextGenerator, PreparedBrowser } from "./adapters/playwrightBrowser.js";

export async function useBrowser(context?: PlaywrightBrowserContextGenerator): Promise<BrowserTestInstrument> {
  const browserTestInstrument = useContext().browserTestInstrument
  await browserTestInstrument.reset(context)
  return browserTestInstrument
}

export interface ViewOptions<RenderArgs> {
  controller: ViewControllerModuleLoader<RenderArgs, any>
  renderArgs: RenderArgs
}

export interface BrowserTestInstrument {
  page: Page
  mountView<RenderArgs>(options: ViewOptions<RenderArgs>): Promise<void>
}

export class PlaywrightTestInstrument extends PreparedBrowser implements BrowserTestInstrument {
  private _context: BrowserContext | undefined

  protected async getContext(generator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    const context = await super.getContext(generator)

    await context.addInitScript({
      content: `
      window["__vite_ssr_dynamic_import__"] = (path) => { const url = new URL(path, "${this.browser.baseURL}"); return import(url.href); };
      window["__vite_ssr_import_0__"] = { default: (map, key) => map[key]() };
    ` })

    return context
  }

  async reset(generator?: PlaywrightBrowserContextGenerator): Promise<void> {
    if (this._context !== undefined) {
      await this._context.close()
    }
    this._context = await this.getContext(generator)
    this._page = await this._context.newPage()
  }

  get page(): Page {
    return this._page!
  }

  async mountView(options: ViewOptions<any>): Promise<void> {
    let moduleHandle: JSHandle<{ default: ViewController<any, any> }>

    try {
      moduleHandle = await this.page.evaluateHandle(options.controller.loader, options.controller.args)
    } catch (err) {
      throw new Error("Unable to load the view controller module in the browser! If you are using variables in your import statement, make sure they are specified via the `args` parameter. Also, check that the dynamic import path is relative and specifies the exact extension of the file you want to load. See the README for other limitations of dynamic import variables.")
    }

    try {
      await moduleHandle.evaluateHandle(async (viewControllerModule, context) => {
        await viewControllerModule["default"].render(context.renderArgs)
      }, {
        renderArgs: options.renderArgs
      })
    } catch (err: any) {
      throw { ...err, stack: err.stack?.replaceAll(this.browser.baseURL, "") }
    }
  }
}
