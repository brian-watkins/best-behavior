import { Page } from "playwright"
import { useContext } from "./behaviorContext.js"
import * as acorn from "acorn"
import * as walk from "acorn-walk"

export interface DisplayContext<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

type DisplayContextTypes<Module> = {
  [P in keyof Module as Module[P] extends DisplayContext<any, any> ? P : never]: Module[P]
}

export async function useDisplay<DisplayModule, ExportName extends keyof DisplayContextTypes<DisplayModule>>(loader: () => Promise<DisplayModule>, exportName: ExportName): Promise<Display<DisplayModule[ExportName]>> {
  const behaviorModulePath = useContext().currentBehavior?.path
  if (behaviorModulePath === undefined) {
    throw new Error("Bad attempt to call useDisplay outside of a behavior module.")
  }

  const modulePath = getModulePathFromLoaderCode(loader.toString())
  if (modulePath === undefined) {
    throw new Error(`Could not find module path in code: ${loader.toString()}`)
  }

  const context = useContext()

  const browser = context.displayBrowser
  const page = await browser.getPage()

  // this is the only other place we need the local server ... could
  // we remove this somehow?
  // Actually we /could/ expose a function that the browser page can call
  // that would translate a path to a local url ...
  // that could be part of the display browser adapter
  return new Display(page, context.localServer.urlForPath(modulePath), exportName.toString())
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