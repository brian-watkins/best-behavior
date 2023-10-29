import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { OrderProvider, Reporter } from "esbehavior"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { Transpiler } from "./transpiler.js"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"
import { DocumentationRunner } from "./documentationRunner.js"

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
    const behaviors = await getBehaviorsMatchingPattern({
      pattern: options.behaviorPathPattern,
      defaultEnvironment: options.defaultEnvironment
    })

    const runner = new DocumentationRunner(options)

    // need to call terminate if this throws an exception
    const validator = new SequentialValidator(this.behaviorFactory, runner)
    const summary = await validator.validate(behaviors, options)

    if (summary.invalid > 0 || summary.skipped > 0) {
      process.exitCode = 1
    }
  }
}