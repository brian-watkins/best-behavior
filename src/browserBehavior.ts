import { Behavior, ConfigurableBehavior, Example, ExampleValidationOptions, Reporter, Summary } from "esbehavior"
import { ClaimResult } from "esbehavior/dist/Claim.js"
import { Page } from "playwright"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import path from "path"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { BehaviorOptions, ExampleOptions, ValidationMode } from "esbehavior/dist/Behavior.js"
import * as url from 'url';
import { BehaviorData } from "./browserAdapter/shim.js"
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export class BrowserBehaviorContext {
  private page: Page | undefined
  private browserReporter: BrowserReporter | undefined

  constructor(private playwrightBrowser: PlaywrightBrowser) { }

  async getPage(): Promise<Page> {
    if (this.page !== undefined) {
      return this.page
    }

    const browser = await this.playwrightBrowser.getPlaywrightBrowser()
    const context = await browser.newContext()

    this.page = await context.newPage()

    this.browserReporter = new BrowserReporter(this.page)
    await this.browserReporter.start()

    const basePath = path.relative("", __dirname)
    await this.page.goto(`http://localhost:5957/${basePath}/browserAdapter/index.html`)
  
    return this.page
  }

  getBrowserReporter(): BrowserReporter {
    return this.browserReporter!
  }
}

export async function getBrowserBehavior(context: BrowserBehaviorContext, metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
  const page = await context.getPage()
  const data: BehaviorData = await page.evaluate((path) => window.loadBehavior(path), metadata.path)
    return (b: BehaviorOptions) => {
      b.validationMode = data.validationMode
      return new Behavior(data.description, data.examples.map((mode: ValidationMode, index: number) => {
        return (m: ExampleOptions) => {
          m.validationMode = mode
          return new BrowserExample(index, page, context.getBrowserReporter())
        }
      }))
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