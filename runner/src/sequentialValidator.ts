import { DocumentationRunner, OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorMetadata } from "./behaviorMetadata.js";
import { BehaviorFactory } from "./behaviorFactory.js";

export interface DocumentationValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export class SequentialValidator {

  constructor(private behaviorFactory: BehaviorFactory, private runner: DocumentationRunner) { }

  async validate(behaviors: Array<BehaviorMetadata>, options: DocumentationValidationOptions): Promise<Summary> {
    this.runner.start()

    for (const metadata of options.orderProvider.order(behaviors)) {
      const configurableBehavior = await this.behaviorFactory.getBehavior(metadata)

      await this.runner.run(configurableBehavior, options)
    }

    this.runner.end()

    return this.runner.getSummary()
  }
}
