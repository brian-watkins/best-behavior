import { BehaviorOptions, ClaimResult, ConfigurableBehavior, Example, ExampleValidationOptions, Reporter, Summary } from "esbehavior"
import { BrowserContext, Page } from "playwright"
import { PreparedBrowser } from "../adapters/playwrightBrowser.js"
import { BehaviorMetadata } from "../behaviorMetadata.js"
import { LocalServer } from "../localServer.js"
import { BehaviorData } from "../../../types/types.js";

export class BrowserBehaviorContext {
  constructor(private localServer: LocalServer, private behaviorBrowser: BehaviorBrowser) { }

  async getBrowserBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const page = await this.behaviorBrowser.getPage()

    const data: BehaviorData = await page.evaluate((path) => window.loadBehavior(path), this.localServer.urlForPath(metadata.path))

    return (b: BehaviorOptions) => {
      b.validationMode = data.validationMode
      return {
        description: data.description,
        examples: data.examples.map((mode, index) => {
          return (m) => {
            m.validationMode = mode
            return new BrowserExample(index, page, this.behaviorBrowser.reporter)
          }
        })
      }
    }
  }
}

class BrowserExample implements Example {
  constructor(private id: number, private page: Page, private browserReporter: BrowserReporter) { }

  validate(reporter: Reporter, options: ExampleValidationOptions): Promise<Summary> {
    this.browserReporter.setReporter(reporter)
    return this.page.evaluate((args) => window.validateExample(args.id, args.failFast), {
      id: this.id,
      failFast: options.failFast
    })
  }

  skip(reporter: Reporter, _: ExampleValidationOptions): Promise<Summary> {
    this.browserReporter.setReporter(reporter)
    return this.page.evaluate((args) => window.skipExample(args.id), {
      id: this.id
    })
  }
}

export class BehaviorBrowser extends PreparedBrowser {
  readonly reporter = new BrowserReporter()

  protected async getContext(): Promise<BrowserContext> {
    const context = await super.getContext()

    context.exposeBinding("__bb_pageBinding", ({page}, ...args) => {
      const pageFunction = eval(args[0])
      return pageFunction(page, args[1])
    })

    await this.reporter.decorateContext(context)

    return context
  }
}

class BrowserReporter {
  private reporter: Reporter | undefined
  private currentOrigin: string = ""

  constructor() { }

  async decorateContext(context: BrowserContext): Promise<void> {
    await context.exposeFunction("esb_startExample", (description: string | undefined) => {
      this.reporter?.startExample(description)
    })
    await context.exposeFunction("esb_endExample", () => {
      this.reporter?.endExample()
    })
    await context.exposeFunction("esb_startScript", (location: string) => {
      this.setCurrentOrigin(location)
      this.reporter?.startScript(location.replace(this.currentOrigin, ""))
    })
    await context.exposeFunction("esb_endScript", () => {
      this.reporter?.endScript()
    })
    await context.exposeFunction("esb_recordPresupposition", (result: ClaimResult) => {
      this.reporter?.recordPresupposition(this.fixStackIfNecessary(result))
    })
    await context.exposeFunction("esb_recordAction", (result: ClaimResult) => {
      this.reporter?.recordAction(this.fixStackIfNecessary(result))
    })
    await context.exposeFunction("esb_recordObservation", (result: ClaimResult) => {
      this.reporter?.recordObservation(this.fixStackIfNecessary(result))
    })
  }

  private fixStackIfNecessary(result: ClaimResult): ClaimResult {
    if (result.type === "invalid-claim") {
      result.error.stack = result.error.stack?.replaceAll(this.currentOrigin, "")
    }
    return result
  }

  private setCurrentOrigin(location: string) {
    const locationUrl = new URL(location.substring(0, location.lastIndexOf(":")))
    this.currentOrigin = `${locationUrl.origin}/`
  }

  setReporter(reporter: Reporter) {
    this.reporter = reporter
  }
}