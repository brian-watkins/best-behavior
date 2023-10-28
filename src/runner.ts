import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { OrderProvider, Reporter } from "esbehavior"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { Transpiler } from "./transpiler.js"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"

export interface RunOptions {
  behaviorPathPattern: string
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
  defaultEnvironment: BehaviorEnvironment
}

export class Runner {
  private behaviorFactory: BehaviorFactory

  constructor(private transpiler: Transpiler, private playwright: PlaywrightBrowser) {
    this.behaviorFactory = new BehaviorFactory(this.transpiler, new BrowserBehaviorContext(this.playwright))
  }

  async run(options: RunOptions): Promise<void> {
    // Why do we need to return the pattern from this function?
    const documentation = await getBehaviorsMatchingPattern({
      pattern: options.behaviorPathPattern,
      defaultEnvironment: options.defaultEnvironment
    })
  
    options.reporter.start(options.orderProvider.description)

    // need to call terminate if this throws an exception
    const validator = new SequentialValidator(this.behaviorFactory)
    const summary = await validator.validate(documentation, options)

    options.reporter.end(summary)

    if (summary.invalid > 0 || summary.skipped > 0) {
      process.exitCode = 1
    }
  }
}