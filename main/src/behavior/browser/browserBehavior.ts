import { BehaviorOptions, ConfigurableBehavior, Example, ExampleValidationOptions, Reporter, Summary } from "esbehavior"
import { Page } from "playwright"
import { BehaviorMetadata } from "../behaviorMetadata.js"
import { BehaviorBrowserWindow } from "./behaviorBrowserWindow.js"
import { BehaviorData, BehaviorErrorCode } from "./behaviorData.js"
import { BehaviorSyntaxError, NoDefaultExportError, NotABehaviorError } from "../behaviorError.js"
import { BrowserReporter } from "./browserReporter.js"
import { BehaviorBrowser } from "./behaviorBrowser.js"
import { LocalServerContext } from "../../localServer/context.js"

declare let window: BehaviorBrowserWindow

export class BrowserBehaviorContext {
  private browserReporter: BrowserReporter

  constructor(private localServer: LocalServerContext, private behaviorBrowser: BehaviorBrowser) {
    this.browserReporter = new BrowserReporter(localServer)
  }

  async getBrowserBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const page = await this.behaviorBrowser.getPage(this.browserReporter)

    const data: BehaviorData = await page
      .evaluate((path) => window.__bb_loadBehavior(path), this.localServer.urlForPath(metadata.path))
      .catch((err) => ({ type: "syntax-error", cause: err }))

    switch (data.type) {
      case "syntax-error":
        throw new BehaviorSyntaxError(metadata.path, data.cause)
      case "error":
        switch (data.reason) {
          case BehaviorErrorCode.NO_DEFAULT_EXPORT:
            throw new NoDefaultExportError(metadata.path)
          case BehaviorErrorCode.NOT_A_BEHAVIOR:
            throw new NotABehaviorError(metadata.path)
        }
      case "ok":
        return (b: BehaviorOptions) => {
          b.validationMode = data.validationMode
          return {
            description: data.description,
            examples: data.examples.map((mode, index) => {
              return (m) => {
                m.validationMode = mode
                return new BrowserExample(index, page, this.browserReporter)
              }
            })
          }
        }
    }
  }
}

class BrowserExample implements Example {
  constructor(private id: number, private page: Page, private browserReporter: BrowserReporter) { }

  validate(reporter: Reporter, options: ExampleValidationOptions): Promise<Summary> {
    this.browserReporter.setDelegate(reporter)
    return this.page.evaluate((args) => window.__bb_validateExample(args.id, args.failFast), {
      id: this.id,
      failFast: options.failFast
    })
  }

  skip(reporter: Reporter, _: ExampleValidationOptions): Promise<Summary> {
    this.browserReporter.setDelegate(reporter)
    return this.page.evaluate((args) => window.__bb_skipExample(args.id), {
      id: this.id
    })
  }
}

