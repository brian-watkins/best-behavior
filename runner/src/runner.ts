import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { OrderProvider, Reporter, Summary } from "esbehavior"
import { BehaviorEnvironment, BehaviorMetadata } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
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
      pattern: options.behaviorPathPattern,
      defaultEnvironment: options.defaultEnvironment
    })
  }

  private async validateBehaviors(behaviors: Array<BehaviorMetadata>, options: RunOptions): Promise<Summary> {
    const runner = new DocumentationRunner(options)
    const validator = new SequentialValidator(this.behaviorFactory, runner)

    return await validator.validate(behaviors, options)
  }
}