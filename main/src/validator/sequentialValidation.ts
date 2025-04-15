import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";
import { RuntimeAttributes, ValidationManager, ValidationResult, ValidationTerminated } from "./index.js";
import { Validator } from "./validator.js";
import { addSummary, emptySummary } from "./summary.js";
import { Configuration } from "../config/configuration.js";

export class SequentialValidation implements ValidationManager {

  constructor(private config: Configuration, private attributes: RuntimeAttributes) { }

  async validate(behaviors: Array<BehaviorMetadata>): Promise<ValidationResult> {
    const validator = new Validator(this.config, this.attributes)

    let terminationResult: ValidationTerminated | undefined = undefined

    let summary = emptySummary()

    await validator.init()

    outer:
    for (const behavior of this.config.orderProvider.order(behaviors)) {
      const result = await validator.run(behavior)
      switch (result.type) {
        case "completed": {
          summary = addSummary(summary, result.summary)
          break
        }
        case "terminated": {
          terminationResult = result
          break outer
        }
      }
    }

    await validator.shutdown()

    if (terminationResult !== undefined) {
      return terminationResult
    }

    return {
      type: "completed",
      summary
    }
  }
}
