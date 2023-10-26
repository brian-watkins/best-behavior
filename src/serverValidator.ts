import { ConfigurableBehavior, OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorMetadata } from "./collector.js";
import { addSummary, emptySummary } from "esbehavior/dist/Summary.js";
import { BehaviorRunner, FailFastBehaviorRunner, NullReporter, PickedOnlyBehaviorRunner, SkipBehaviorRunner, StandardBehaviorRunner } from "./behaviorRunner.js";
import { BehaviorOptions, ValidationMode } from "esbehavior/dist/Behavior.js";

export interface Transpiler {
  loadModule<T>(path: string): Promise<T>
}

export interface BehaviorValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export class ServerBehaviorValidator {
  private hasFailed = false

  constructor(private transpiler: Transpiler) { }

  private async loadBehavior(behaviorMetadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    const behaviorModule: any = await this.transpiler.loadModule(behaviorMetadata.path)
    return behaviorModule.default
  }

  // We also need to support the fact that a Behavior as a whole can be skipped (or picked)
  // So what we get from loadBehavior is actually a ConfigurableBehavior ...
  // this just sucks though because I feel like I've written all this before already ...
  // Is there a different level of abstraction we can work with?

  // Note that here with the getRunner function we're generating a one-off runner
  // just for this behavior. But could we pass in a runner to this? which would keep
  // state overall for all the behaviors (regarding failfast)?
  // Maybe but if we're thinking about running behaviors in their own processes
  // (or in a browser) then we wouldn't be able to pass in the behavior runner across
  // the process boundary

  // Right now there's only one 'environment' and so we can store state here -- and
  // this 'validator' is kind of operating like a behavior runner, basically a summary
  // behavior runner.

  // But we maybe could think about having a RemoteBehaviorRunner ... so when you
  // start it loads the Behavior in the remote environment and can track the number
  // of examples. Then it can call to run each example and get the summary individually.
  // it couldn't have the same signature though. Unless we had like a RemoteBehavior
  // that implements Behavior. Then all the Runner logic would be on the Node side or
  // in the main process, including the order provider etc. And the RemoteRunner would
  // do the communication with the other process as it went through and ran each
  // behavior. Maybe that would work?

  // So what I'm saying here is that I really just need to write a RemoteBehavior
  // and then that could just work like normal with all the behavior runners?

  // to get here we need to (1) write a test for skipping behaviors (DONE)
  // (2) write a test for browser behaviors

  async validate(behaviorMetadata: BehaviorMetadata, options: BehaviorValidationOptions): Promise<Summary> {
    const configurableBehavior = await this.loadBehavior(behaviorMetadata)

    const runner = this.getRunner(options)

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

    return summary
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
