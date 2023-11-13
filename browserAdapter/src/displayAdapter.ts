import { DisplayContext } from "../../runner/src/displayContext.js"

let currentHandle: any | undefined = undefined
let currentContext: DisplayContext<any> | undefined = undefined

window.loadDisplay = async function (moduleURL: string, exportName: string, args: any) {
  if (currentHandle !== undefined) {
    currentContext?.teardown?.(currentHandle)
  }
  const displayModule = await import(moduleURL)
  currentContext = displayModule[exportName]
  currentHandle = currentContext?.render(args)
}
