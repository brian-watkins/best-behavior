import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { DocumentationRunner, OrderProvider, Reporter, Summary } from "esbehavior"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { BehaviorContext } from "./behaviorContext.js"

export interface RunOptions {
  behaviorPathPattern: string
  browserBehaviorPathPattern: string | undefined
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
  behaviorContext: BehaviorContext
}

export class Runner {
  constructor(private behaviorFactory: BehaviorFactory) { }

  async run(options: RunOptions): Promise<void> {
    try {
      const behaviors = await this.getBehaviors(options)
      const summary = await this.validateBehaviors(behaviors, options)
      if (summary.invalid > 0 || summary.skipped > 0) {
        process.exitCode = 1
      }
    } catch (err: any) {
      options.reporter.terminate(err)
      process.exitCode = 1
    }
  }

  private async getBehaviors(options: RunOptions): Promise<Array<BehaviorMetadata>> {
    return await getBehaviorsMatchingPattern({
      behaviorPattern: options.behaviorPathPattern,
      browserBehaviorPattern: options.browserBehaviorPathPattern
    })
  }

  private async validateBehaviors(behaviors: Array<BehaviorMetadata>, options: RunOptions): Promise<Summary> {
    const runner = new DocumentationRunner(options)
    const validator = new SequentialValidator(options.behaviorContext, this.behaviorFactory, runner)

    return await validator.validate(behaviors, options)
  }
}