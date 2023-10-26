import { getDocumentationMatchingPattern } from "./collector.js"
import { ServerBehaviorValidator, Transpiler } from "./serverValidator.js"
import { SequentialDocumentationValidator } from "./documentationValidator.js"
import { OrderProvider, Reporter } from "esbehavior"

export interface RunOptions {
  behaviorPathPattern: string
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export class Runner {
  private serverValidator: ServerBehaviorValidator
  private documentationValidator: SequentialDocumentationValidator

  constructor(private transpiler: Transpiler) {
    this.serverValidator = new ServerBehaviorValidator(this.transpiler)
    this.documentationValidator = new SequentialDocumentationValidator(this.serverValidator)
  }

  async run(options: RunOptions): Promise<void> {
    const documentation = await getDocumentationMatchingPattern(options.behaviorPathPattern)
  
    options.reporter.start(options.orderProvider.description)

    // need to call terminate if this throws an exception
    const summary = await this.documentationValidator.validate(documentation, options)

    options.reporter.end(summary)

    if (summary.invalid > 0 || summary.skipped > 0) {
      process.exitCode = 1
    }
  }
}