import { getBehaviorsMatchingPattern } from "./behaviorCollector.js"
import { OrderProvider, Reporter } from "esbehavior"
import { Logger } from "../logger.js"
import { CoverageManager } from "./coverageManager.js"
import { Validator } from "./validator.js"

export interface RunOptions {
  behaviorPathPatterns: Array<string>
  behaviorFilter?: string
  browserBehaviorPathPatterns?: Array<string>
  coverageManager?: CoverageManager,
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

export async function runBehaviors(validator: Validator, options: RunOptions): Promise<RunResult> {
  let result = RunResult.OK

  try {
    const behaviors = await getBehaviorsMatchingPattern({
      behaviorGlobs: options.behaviorPathPatterns,
      behaviorFilter: options.behaviorFilter,
      browserBehaviorGlobs: options.browserBehaviorPathPatterns,
      logger: options.logger
    })

    if (behaviors.length == 0) {
      return RunResult.NO_BEHAVIORS_FOUND
    }

    await options.coverageManager?.prepareForCoverageCollection()

    const summary = await validator.validate(behaviors, options)

    await options.coverageManager?.finishCoverageCollection()

    if (summary.invalid > 0 || summary.skipped > 0) {
      result = RunResult.NOT_OK
    }
  } catch (err: any) {
    options.reporter.terminate(err)
    result = RunResult.ERROR
  }

  return result
}
