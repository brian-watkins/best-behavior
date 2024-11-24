import { ViteLocalServer } from "./localServer/viteServer.js"
import { bold, red } from "./logger.js"
import { Configuration } from "./config/configuration.js"
import { SequentialValidation } from "./validator/sequentialValidation.js"
import { ValidationManager } from "./validator/index.js"
import { getBehaviorsMatchingPattern } from "./behavior/behaviorCollector.js"
import { ParallelValidation } from "./validator/parallelValidation.js"

export enum ValidationRunResult {
  OK = "OK",
  NO_BEHAVIORS_FOUND = "NO BEHAVIORS FOUND",
  ERROR = "ERROR",
  NOT_OK = "NOT OK"
}

export async function run(config: Configuration): Promise<ValidationRunResult> {
  if (config.behaviorGlobs === undefined) {
    config.logger.error(bold(red("No behaviors specified!")))
    config.logger.error("Provide a glob via the --behaviors CLI option or the behaviorGlobs property of the config file.")
    return ValidationRunResult.NO_BEHAVIORS_FOUND
  }

  const viteServer = new ViteLocalServer({
    viteConfig: config.viteConfig,
    behaviorGlobs: config.behaviorGlobs
  })
  await viteServer.start()

  const validator = config.parallel ?
    new ParallelValidation(config, viteServer.getContext()) :
    new SequentialValidation(config, viteServer.getContext())

  const result = await runBehaviors(config, validator)

  if (!config.showBrowser) {
    await viteServer.stop()
  }

  return result
}

async function runBehaviors(config: Configuration, validator: ValidationManager): Promise<ValidationRunResult> {
  const behaviorCollectionResult = await getBehaviorsMatchingPattern({
    behaviorGlobs: config.behaviorGlobs ?? [],
    behaviorFilter: config.behaviorFilter,
    browserBehaviorGlobs: config.browserBehaviors?.globs,
  })

  if (behaviorCollectionResult.type === "failed") {
    config.reporter.terminate(behaviorCollectionResult.err)
    return ValidationRunResult.ERROR
  }

  if (behaviorCollectionResult.behaviors.length === 0) {
    config.logger.info(bold(red(`No behaviors found!`)))
    return ValidationRunResult.NO_BEHAVIORS_FOUND
  }

  config.reporter.start(config.orderProvider.description)

  const result = await validator.validate(behaviorCollectionResult.behaviors)

  if (result.type === "terminated") {
    config.reporter.terminate(result.err)
    return ValidationRunResult.ERROR
  }

  config.reporter.end(result.summary)

  if (result.summary.invalid > 0 || result.summary.skipped > 0) {
    return ValidationRunResult.NOT_OK
  }

  return ValidationRunResult.OK
}
