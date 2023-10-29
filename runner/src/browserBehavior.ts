import path from "path"
import url from 'url';
import { Behavior, BehaviorOptions, ClaimResult, ConfigurableBehavior, Example, ExampleOptions, ExampleValidationOptions, Reporter, Summary, ValidationMode } from "esbehavior"
import { Page } from "playwright"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalServer } from "./localServer.js"
import { BehaviorData } from "../../types/types.js";


export class BrowserBehaviorContext {
  private page: Page | undefined
  private browserReporter: BrowserReporter | undefined

  constructor(private localServer: LocalServer, private playwrightBrowser: PlaywrightBrowser) { }

  private async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    const browser = await this.playwrightBrowser.getPlaywrightBrowser()
    const context = await browser.newContext()

    this.page = await context.newPage()

    this.browserReporter = new BrowserReporter(this.page)
    await this.browserReporter.start()

    await this.page.goto(this.localServer.url(`/browserAdapter/index.html`))
  
    return this.page
  }

  async getBrowserBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const page = await this.getPage()
    const data: BehaviorData = await page.evaluate((path) => window.loadBehavior(path), this.localServer.url(metadata.path))
      return (b: BehaviorOptions) => {
        b.validationMode = data.validationMode
        return new Behavior(data.description, data.examples.map((mode: ValidationMode, index: number) => {
          return (m: ExampleOptions) => {
            m.validationMode = mode
            return new BrowserExample(index, page, this.browserReporter!)
          }
        }))
      }
  }
}

// Consider whether we need this once we get the import working
function basePath() {
  return path.relative("", url.fileURLToPath(new URL('.', import.meta.url)))
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