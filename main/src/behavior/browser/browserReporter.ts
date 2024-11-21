import { ClaimResult, Reporter } from "esbehavior"
import { BrowserContext } from "playwright"
import { LocalServerContext } from "../../localServer/context.js"

export class BrowserReporter {
  private reporter: Reporter | undefined

  constructor(private localServer: LocalServerContext) { }

  async decorateContext(context: BrowserContext): Promise<void> {
    await context.exposeFunction("__bb_startExample", (description: string | undefined) => {
      this.reporter?.startExample(description)
    })
    await context.exposeFunction("__bb_endExample", () => {
      this.reporter?.endExample()
    })
    await context.exposeFunction("__bb_startScript", (location: string) => {
      this.reporter?.startScript(this.fixFilePaths(location))
    })
    await context.exposeFunction("__bb_endScript", () => {
      this.reporter?.endScript()
    })
    await context.exposeFunction("__bb_recordPresupposition", (result: ClaimResult) => {
      this.reporter?.recordPresupposition(this.fixStackIfNecessary(result))
    })
    await context.exposeFunction("__bb_recordAction", (result: ClaimResult) => {
      this.reporter?.recordAction(this.fixStackIfNecessary(result))
    })
    await context.exposeFunction("__bb_recordObservation", (result: ClaimResult) => {
      this.reporter?.recordObservation(this.fixStackIfNecessary(result))
    })
  }

  private fixStackIfNecessary(result: ClaimResult): ClaimResult {
    if (result.type === "invalid-claim" && result.error.stack) {
      result.error.stack = this.fixFilePaths(result.error.stack)
    }
    return result
  }

  private fixFilePaths(valueWithPaths: string): string {
    return this.localServer.convertURLsToLocalPaths(valueWithPaths)
  }

  setDelegate(reporter: Reporter) {
    this.reporter = reporter
  }
}