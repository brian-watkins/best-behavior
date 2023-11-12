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
    // Maybe we should fix this somehow?
    console.log("Bad attempt to call useDisplay outside of a behavior module.")
    process.exit(1)
  }

  const modulePath = getModulePathFromLoaderCode(loader.toString())
  if (modulePath === undefined) {
    // Maybe we should fix this?
    console.log("Could not find module path in code", loader.toString())
    process.exit(1)
  }

  const context = useContext()

  const browser = context.displayBrowser
  const page = await browser.newPage()

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
      return window.loadDisplay(options.displayModuleURL, options.displayExportName, options.args)
    }, {
      displayModuleURL: this.displayModuleURL,
      displayExportName: this.displayExportName,
      args
    })
  }
}