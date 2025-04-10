import url from "node:url"
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";
import { Configuration, getRunOptions } from "../config/configuration.js";
import { BehaviorValidationTaskResult, RuntimeAttributes, validationCompleted, ValidationManager, ValidationResult, ValidationTerminated } from "./index.js";
import { addSummary, emptySummary } from "./summary.js";
import { WorkerPool } from "./workerPool.js";
import { applyActions } from "./bufferedOutput.js";


export class ParallelValidation implements ValidationManager {
  private pool = new WorkerPool()

  constructor(private config: Configuration, private attributes: RuntimeAttributes) { }

  async validate(behaviors: Array<BehaviorMetadata>): Promise<ValidationResult> {
    await this.config.coverageReporter?.start()

    await this.pool.init(pathToFile("./worker.js"), {
      runOptions: getRunOptions(this.config),
      localServer: {
        host: this.attributes.localServer.host,
        root: this.attributes.localServer.root
      },
      context: this.attributes.context
    })

    const tasks: Array<Promise<ValidationResult>> = []

    for (const behavior of behaviors) {
      tasks.push(this.validateBehavior(behavior))
    }

    const results = await Promise.all(tasks)

    let terminationResult: ValidationTerminated | undefined = undefined

    let summary = emptySummary()

    outer:
    for (const result of results) {
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

    await this.pool.shutdown()

    await this.config.coverageReporter?.end()

    if (terminationResult !== undefined) {
      return terminationResult
    }

    return validationCompleted(summary)
  }

  private async validateBehavior(behavior: BehaviorMetadata): Promise<ValidationResult> {
    let result: ValidationResult

    try {
      const taskResult = await this.pool.runTask<BehaviorValidationTaskResult>(behavior)
      applyActions(this.config.reporter, this.config.logger, taskResult.outputActions)
      if (taskResult.validationResult.type === "terminated") {
        this.pool.abortQueuedTasks()
      }
      result = taskResult.validationResult
    } catch (err) {
      result = validationCompleted(emptySummary())
    }

    return result 
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}
