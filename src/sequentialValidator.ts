import { OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorMetadata } from "./behaviorMetadata.js";
import { BehaviorFactory } from "./behaviorFactory.js";
import { DocumentationRunner } from "./documentationRunner.js";

export interface DocumentationValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export interface Documentation {
  pattern: string
  behaviors: Array<BehaviorMetadata>
}

export class SequentialValidator {
  constructor (private behaviorFactory: BehaviorFactory) { }

  async validate(documentation: Documentation, options: DocumentationValidationOptions): Promise<Summary> {
    const runner = new DocumentationRunner()

    for (const metadata of options.orderProvider.order(documentation.behaviors)) {
      const configurableBehavior = await this.behaviorFactory.getBehavior(metadata)
      await runner.run(configurableBehavior, options)
    }

    return runner.getSummary()
  }
}
