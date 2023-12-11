import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { DocumentationRunner, OrderProvider, Reporter, Summary } from "esbehavior"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Logger } from "./logger.js"

export interface RunOptions {
  behaviorPathPattern: string
  behaviorFilter?: string
  browserBehaviorPathPattern?: string
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
  logger: Logger
}

export class Runner {
  constructor(private behaviorFactory: BehaviorFactory) { }

  async run(options: RunOptions): Promise<void> {
    try {
      const behaviors = await this.getBehaviors(options)

      if (behaviors.length == 0) {
        process.exitCode = 1
        return
      }

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
      behaviorGlob: options.behaviorPathPattern,
      behaviorFilter: options.behaviorFilter,
      browserBehaviorPattern: options.browserBehaviorPathPattern,
      logger: options.logger
    })
  }

  private async validateBehaviors(behaviors: Array<BehaviorMetadata>, options: RunOptions): Promise<Summary> {
    const runner = new DocumentationRunner(options)
    const validator = new SequentialValidator(this.behaviorFactory, runner)

    return await validator.validate(behaviors, options)
  }
}