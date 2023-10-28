import { ConfigurableBehavior, OrderProvider, Reporter, Summary } from "esbehavior"
import { addBehavior, addSummary, emptySummary } from "esbehavior/dist/Summary.js"
import { BehaviorRunner, FailFastBehaviorRunner, NullReporter, PickedOnlyBehaviorRunner, SkipBehaviorRunner, StandardBehaviorRunner } from "./behaviorRunner.js"

// NOTE: This could probably go INSIDE esbehavior

export interface BehaviorValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export class DocumentationRunner {
  private hasFailed = false
  private summary = emptySummary()

  getSummary(): Summary {
    return this.summary
  }

  async run(configurableBehavior: ConfigurableBehavior, options: BehaviorValidationOptions): Promise<void> {
    const runner = this.getRunner(options)

    this.summary = addBehavior(this.summary)

    const behavior = runner.start(configurableBehavior)

    let summary = emptySummary()
    for (const configurableExample of options.orderProvider.order(behavior.examples)) {
      const exampleSummary = await runner.run(configurableExample, options)
      summary = addSummary(summary)(exampleSummary)
    }

    runner.end(behavior)

    if (summary.invalid > 0) {
      this.hasFailed = true
    }

    this.summary = addSummary(this.summary)(summary)
  }

  getRunner(options: BehaviorValidationOptions): BehaviorRunner {
    if (options.failFast && this.hasFailed) {
      return new SkipBehaviorRunner(new NullReporter())
    } 
    
    const runner = options.runPickedOnly ?
      new PickedOnlyBehaviorRunner(options.reporter) :
      new StandardBehaviorRunner(options.reporter)
    
    if (options.failFast) {
      return new FailFastBehaviorRunner(runner)
    }

    return runner
  }
}