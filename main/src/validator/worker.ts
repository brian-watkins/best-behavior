import { parentPort, workerData } from "node:worker_threads"
import { getConfiguration } from "../config/configuration.js"
import { Validator } from "./validator.js"
import { BufferedOutput } from "./bufferedOutput.js"
import { LocalServerContext } from "../localServer/context.js"
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js"
import { BehaviorValidationTaskResult, RuntimeAttributes } from "./index.js"

interface WorkerMessage {
  action: string
  args?: any
}

class Worker {
  private validator!: Validator
  private bufferedOutput = new BufferedOutput()

  async initialize(): Promise<void> {
    const config = await getConfiguration(workerData.runOptions)

    // Parallel validation always ignores failing fast
    config.failFast = false

    config.reporter = this.bufferedOutput
    config.logger = this.bufferedOutput

    console = this.bufferedOutput.console()

    const attributes: RuntimeAttributes = {
      localServer: new LocalServerContext(workerData.localServer.host, workerData.localServer.root),
      runContext: workerData.runContext
    }

    this.validator = new Validator(config, attributes)
    
    await this.validator.init()
  }

  async run(behavior: BehaviorMetadata): Promise<BehaviorValidationTaskResult> {
    this.bufferedOutput.reset()

    const result = await this.validator.run(behavior)

    return {
      validationResult: result,
      outputActions: this.bufferedOutput.getActions(),
    }
  }

  shutdown(): Promise<void> {
    return this.validator.shutdown()
  }
}

let worker = new Worker()

parentPort?.on("message", async (message: WorkerMessage) => {
  switch (message.action) {
    case "initialize": {
      await worker!.initialize()
      parentPort?.postMessage({ message: "initialized" })
      break
    }
    case "shutdown": {
      await worker!.shutdown()
      parentPort?.postMessage({ message: "ready-to-terminate" })
      break
    }
    case "run": {
      const taskResult = await worker!.run(message.args)
      parentPort?.postMessage({
        message: "task-result",
        taskResult
      })
      break
    }
  }
})
