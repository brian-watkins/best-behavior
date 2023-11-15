import { BehaviorOptions, ClaimResult, ConfigurableBehavior, Example, ExampleValidationOptions, Reporter, Summary } from "esbehavior"
import { Page } from "playwright"
import { PreparedBrowser } from "./playwrightBrowser.js"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalServer } from "./localServer.js"
import { BehaviorData } from "../../types/types.js";

export class BrowserBehaviorContext {
  private page: Page | undefined
  private browserReporter: BrowserReporter | undefined

  constructor(private localServer: LocalServer, private behaviorBrowser: PreparedBrowser) { }

  private async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    this.page = await this.behaviorBrowser.getPage()

    this.browserReporter = new BrowserReporter(this.page)
    await this.browserReporter.start()

    return this.page
  }

  async getBrowserBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const page = await this.getPage()
    const data: BehaviorData = await page.evaluate((path) => window.loadBehavior(path), this.localServer.urlForPath(metadata.path))

    return (b: BehaviorOptions) => {
      b.validationMode = data.validationMode
      return {
        description: data.description,
        examples: data.examples.map((mode, index) => {
          return (m) => {
            m.validationMode = mode
            return new BrowserExample(index, page, this.browserReporter!)
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

class BrowserReporter {
  private reporter: Reporter | undefined
  private currentOrigin: string = ""

  constructor(private page: Page) { }

  async start(): Promise<void> {
    // Note that if we used context.exposeFunction this would not be
    // vulnerable to loss when the page is reloaded ... I think
    // And this is more about decorating the browser ... so I wonder if we
    // subclass PreparedBrowser to add this in?
    // We're thinking that we might expose a function on displayBrowser as well
    // so what is the pattern to expose functions on the context?
    //
    // We could extend PreparedBrowser and override getContext() ...
    // And then I guess we'd need to expose BrowserReporter as a property of the
    // BehaviorBrowser? ...

    await this.page.exposeFunction("esb_startExample", (description: string | undefined) => {
      this.reporter?.startExample(description)
    })
    await this.page.exposeFunction("esb_endExample", () => {
      this.reporter?.endExample()
    })
    await this.page.exposeFunction("esb_startScript", (location: string) => {
      this.setCurrentOrigin(location)
      this.reporter?.startScript(location.replace(this.currentOrigin, ""))
    })
    await this.page.exposeFunction("esb_endScript", () => {
      this.reporter?.endScript()
    })
    await this.page.exposeFunction("esb_recordPresupposition", (result: ClaimResult) => {
      this.reporter?.recordPresupposition(this.fixStackIfNecessary(result))
    })
    await this.page.exposeFunction("esb_recordAction", (result: ClaimResult) => {
      this.reporter?.recordAction(this.fixStackIfNecessary(result))
    })
    await this.page.exposeFunction("esb_recordObservation", (result: ClaimResult) => {
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