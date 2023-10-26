import { OrderProvider, Reporter, Summary } from "esbehavior";
import { ServerBehaviorValidator } from "./serverValidator.js";
import { Documentation } from "./collector.js";
import { addBehavior, addSummary, emptySummary } from "esbehavior/dist/Summary.js";

export interface DocumentationValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export class SequentialDocumentationValidator {
  constructor (private serverValidator: ServerBehaviorValidator) { }

  async validate(documentation: Documentation, options: DocumentationValidationOptions): Promise<Summary> {
    let summary = emptySummary()

    // This really needs to track if any failures have happened and tell the
    // behavior runner to either skip with a NullReporter or validate like normal
    // We could have a DocumentationRunner with a start, end, and run functions
    // so it's up to us to do the iteration or whatever and call the run function
    // as necessary
    for (const behavior of options.orderProvider.order(documentation.behaviors)) {
      summary = addBehavior(summary)
      const behaviorSummary = await this.serverValidator.validate(behavior, options)
      summary = addSummary(summary)(behaviorSummary)
    }

    return summary
  }
}
