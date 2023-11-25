import { useContext } from "./useContext.js";
import { BrowserContext, JSHandle, Page } from "playwright";
import { ViewController, ViewControllerModuleLoader } from "./view.js";
import { PlaywrightBrowser, PreparedBrowser } from "./adapters/playwrightBrowser.js";
import { Logger } from "./logger.js";

export async function useBrowser(): Promise<BrowserTestInstrument> {
  const browser = useContext().browser
  await browser.preparePage()
  return browser
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
  constructor(browser: PlaywrightBrowser, private baseUrl: string, logger: Logger) {
    super(browser, {
      baseUrl,
      logger
    })
  }

  protected async getContext(): Promise<BrowserContext> {
    const context = await super.getContext()

    await context.addInitScript({ content: `
      window["__vite_ssr_dynamic_import__"] = (path) => { const url = new URL(path, "${this.baseUrl}"); return import(url.href); };
      window["__vite_ssr_import_0__"] = { default: (map, key) => map[key]() };
    ` })

    return context
  }

  async preparePage(): Promise<void> {
    const page = await this.getPage()
    
    if (page.url() !== "about:blank") {
      await page.goto("about:blank")
    }
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
        if (window.__bb_viewController !== undefined) {
          await window.__bb_viewController.teardown?.(window.__bb_viewHandle)
        }
        window.__bb_viewController = viewControllerModule["default"]
        window.__bb_viewHandle = await window.__bb_viewController.render(context.renderArgs)
      }, {
        renderArgs: options.renderArgs
      })
    } catch (err: any) {
      throw { ...err, stack: err.stack?.replaceAll(this.baseUrl, "") }
    }
  }
}
