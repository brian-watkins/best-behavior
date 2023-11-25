import { useContext } from "./useContext.js";
import { BrowserContext, JSHandle, Page } from "playwright";
import { ViewControllerModuleLoader } from "./view.js";
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
    let moduleHandle: JSHandle
    
    try {
      moduleHandle = await this.page.evaluateHandle(options.controller.loader, options.controller.args)
    } catch (err) {
      throw new Error("Unable to load view controller module! If you are using variables in your import statement, make sure they are being passed via the `args` parameter. Furthermore, due to limitations in dynamic import processing, you can only use a relative path, and you must specify the exact file extension that matches the file you want to load.")
    }

    try {
      await moduleHandle.evaluateHandle((viewControllerModule, context) => {
        if (window.__bb_viewController !== undefined) {
          window.__bb_viewController.teardown?.(window.__bb_viewHandle)
        }
        window.__bb_viewController = viewControllerModule["default"]
        window.__bb_viewHandle = window.__bb_viewController.render(context.renderArgs)
      }, {
        renderArgs: options.renderArgs
      })
    } catch (err: any) {
      throw { ...err, stack: err.stack?.replaceAll(this.baseUrl, "") }
    }
  }
}
