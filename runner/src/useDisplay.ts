import { Page } from "playwright"
import { useContext } from "./useContext.js"
import * as acorn from "acorn"
import * as walk from "acorn-walk"

export interface DisplayContext<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

type DisplayContextTypes<Module> = {
  [P in keyof Module as Module[P] extends DisplayContext<any, any> ? P : never]: Module[P]
}

export interface DisplayOptions<DisplayModule, ExportName extends keyof DisplayContextTypes<DisplayModule>> {
  module: () => Promise<DisplayModule>
  export: ExportName
  html?: string
}

export async function useDisplay<DisplayModule, ExportName extends keyof DisplayContextTypes<DisplayModule>>(options: DisplayOptions<DisplayModule, ExportName>): Promise<Display<DisplayModule[ExportName]>> {
  const behaviorModulePath = useContext().currentBehavior?.path
  if (behaviorModulePath === undefined) {
    throw new Error("Bad attempt to call useDisplay outside of a behavior module.")
  }

  const modulePath = getModulePathFromLoaderCode(options.module.toString())
  if (modulePath === undefined) {
    throw new Error(`Could not find module path in code: ${options.module.toString()}`)
  }

  const context = useContext()

  const browser = context.displayBrowser
  const page = await browser.getPage()

  const displayHtml = options.html ? context.localServer.urlForPath(options.html) : "about:blank"
  if (page.url() !== displayHtml) {
    await page.goto(displayHtml)
  }

  return new Display(page, context.localServer.urlForPath(modulePath), options.export.toString())
}

function getModulePathFromLoaderCode(code: string): string | undefined {
  const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: "script" })
  let modulePath: string | undefined = undefined
  walk.simple(ast, {
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "__vite_ssr_dynamic_import__") {
        if (node.arguments[0].type === "Literal") {
          modulePath = node.arguments[0].value as string
        }
      }
    }
  })

  return modulePath
}

export class Display<Context> {
  constructor(readonly page: Page, private displayModuleURL: string, private displayExportName: string) { }

  async mount(args: Context extends DisplayContext<infer R, any> ? R : never): Promise<void> {
    await this.page.evaluate((options) => {
      window.loadDisplay(options.displayModuleURL, options.displayExportName, options.args)
    }, {
      displayModuleURL: this.displayModuleURL,
      displayExportName: this.displayExportName,
      args
    })
  }
}