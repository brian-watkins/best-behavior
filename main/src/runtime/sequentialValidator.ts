import { DocumentationRunner, Summary } from "esbehavior";
import { BehaviorMetadata } from "./behaviorMetadata.js";
import { BehaviorFactory } from "./behaviorFactory.js";
import { ValidationOptions, Validator } from "./validator.js";

export class SequentialValidator implements Validator {

  constructor(private behaviorFactory: BehaviorFactory) { }

  async validate(behaviors: Array<BehaviorMetadata>, options: ValidationOptions): Promise<Summary> {
    const runner = new DocumentationRunner(options)

    runner.start()

    for (const metadata of options.orderProvider.order(behaviors)) {
      const configurableBehavior = await this.behaviorFactory.getBehavior(metadata)

      await runner.run(configurableBehavior, options)
    }

    runner.end()

    return runner.getSummary()
  }
}
