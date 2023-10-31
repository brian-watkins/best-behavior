import fs from "fs"
import { BehaviorOptions, ClaimResult, ConfigurableBehavior, Example, ExampleValidationOptions, Reporter, Summary } from "esbehavior"
import { Page } from "playwright"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalServer } from "./localServer.js"
import { BehaviorData } from "../../types/types.js";

export interface BrowserBehaviorContextOptions {
  adapterPath: string
}

export class BrowserBehaviorContext {
  private page: Page | undefined
  private browserReporter: BrowserReporter | undefined

  constructor(private localServer: LocalServer, private playwrightBrowser: PlaywrightBrowser, private options: BrowserBehaviorContextOptions) { }

  private async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    const browser = await this.playwrightBrowser.getPlaywrightBrowser()
    const context = await browser.newContext()

    this.page = await context.newPage()

    this.browserReporter = new BrowserReporter(this.page)
    await this.browserReporter.start()

    const adapter = fs.readFileSync(this.options.adapterPath, "utf8")
    await this.page.evaluate(adapter)

    return this.page
  }

  async getBrowserBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const page = await this.getPage()
    const data: BehaviorData = await page.evaluate((path) => window.loadBehavior(path), this.localServer.url(metadata.path))

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

  constructor(private page: Page) { }

  async start(): Promise<void> {
    await this.page.exposeFunction("esb_startExample", (description: string | undefined) => {
      this.reporter?.startExample(description)
    })
    await this.page.exposeFunction("esb_endExample", () => {
      this.reporter?.endExample()
    })
    await this.page.exposeFunction("esb_startScript", (location: string) => {
      this.reporter?.startScript(location)
    })
    await this.page.exposeFunction("esb_endScript", () => {
      this.reporter?.endScript()
    })
    await this.page.exposeFunction("esb_recordPresupposition", (result: ClaimResult) => {
      this.reporter?.recordPresupposition(result)
    })
    await this.page.exposeFunction("esb_recordAction", (result: ClaimResult) => {
      this.reporter?.recordAction(result)
    })
    await this.page.exposeFunction("esb_recordObservation", (result: ClaimResult) => {
      this.reporter?.recordObservation(result)
    })
  }

  setReporter(reporter: Reporter) {
    this.reporter = reporter
  }
}