import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { SequentialValidator } from "./sequentialValidator.js"
import { DocumentationRunner, OrderProvider, Reporter, Summary } from "esbehavior"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Logger } from "../logger.js"
import { CoverageManager } from "./coverageManager.js"

export interface RunOptions {
  behaviorPathPatterns: Array<string>
  behaviorFilter?: string
  browserBehaviorPathPatterns?: Array<string>
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
  logger: Logger
}

export enum RunResult {
  OK = "OK",
  NO_BEHAVIORS_FOUND = "NO BEHAVIORS FOUND",
  ERROR = "ERROR",
  NOT_OK = "NOT OK"
}

export class Runner {
  constructor(private behaviorFactory: BehaviorFactory, private coverageManager: CoverageManager | undefined) { }

  async run(options: RunOptions): Promise<RunResult> {
    let result = RunResult.OK

    try {
      const behaviors = await this.getBehaviors(options)

      if (behaviors.length == 0) {
        return RunResult.NO_BEHAVIORS_FOUND
      }

      await this.coverageManager?.prepare()

      const summary = await this.validateBehaviors(behaviors, options)

      await this.coverageManager?.finish()

      if (summary.invalid > 0 || summary.skipped > 0) {
        result = RunResult.NOT_OK
      }
    } catch (err: any) {
      options.reporter.terminate(err)
      result = RunResult.ERROR
    }

    return result
  }

  private async getBehaviors(options: RunOptions): Promise<Array<BehaviorMetadata>> {
    return await getBehaviorsMatchingPattern({
      behaviorGlobs: options.behaviorPathPatterns,
      behaviorFilter: options.behaviorFilter,
      browserBehaviorGlobs: options.browserBehaviorPathPatterns,
      logger: options.logger
    })
  }

  private async validateBehaviors(behaviors: Array<BehaviorMetadata>, options: RunOptions): Promise<Summary> {
    const runner = new DocumentationRunner(options)
    const validator = new SequentialValidator(this.behaviorFactory, runner)

    return await validator.validate(behaviors, options)
  }
}