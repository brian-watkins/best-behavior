import { JSHandle, Page } from "playwright"
import { useContext } from "./useContext.js"

export interface ViewController<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

export interface ViewOptions<ViewControllerModule extends { default: ViewController<any, any> }> {
  controller: BrowserModuleLoader<ViewControllerModule>
  html?: string
}

export interface BrowserModuleLoader<V> {
  loader: (args: any) => Promise<V>
  args?: any
}

export async function useView<ViewControllerModule extends { default: ViewController<any, any> }>(options: ViewOptions<ViewControllerModule>): Promise<View<ViewControllerModule>> {
  const context = useContext()

  const browser = context.displayBrowser
  const page = await browser.getPage()

  const displayHtml = options.html ? context.localServer.urlForPath(options.html) : "about:blank"
  if (page.url() !== displayHtml) {
    await page.goto(displayHtml)
  }

  return new View(page, options.controller)
}

export class View<ControllerModule extends { default: ViewController<any, any> }> {
  constructor(readonly page: Page, private controllerModule: BrowserModuleLoader<ControllerModule>) { }

  async mount(args: ControllerModule["default"] extends ViewController<infer Args, any> ? Args : never): Promise<void> {
    const host = useContext().localServer.host.toString()

    await this.page.evaluate(`window["__vite_ssr_dynamic_import__"] = (path) => { const url = new URL(path, "${host}"); return import(url.href); }`)
    await this.page.evaluate(`window["__vite_ssr_import_0__"] = { default: (map, key) => map[key]() }`)

    let moduleHandle: JSHandle
    try {
      moduleHandle = await this.page.evaluateHandle(this.controllerModule.loader, this.controllerModule.args)
    } catch (err) {
      throw new Error("Unable to load view controller module! If you are using variables in your import statement, make sure they are being passed via the `args` parameter. Furthermore, due to limitations in dynamic import processing, you can only use a relative path, and you must specify the exact file extension that matches the file you want to load.")
    }

    try {
      await this.page.evaluate((context) => {
        if (window.currentHandle !== undefined) {
          window.currentContext?.teardown?.(window.currentHandle)
        }
        window.currentContext = context.moduleHandle["default"]
        window.currentHandle = window.currentContext?.render(context.renderArgs)
      }, {
        moduleHandle,
        renderArgs: args
      })
    } catch (err: any) {
      throw { ...err, stack: err.stack?.replaceAll(host, "") }
    }
  }
}