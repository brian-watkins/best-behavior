import { Worker } from "node:worker_threads"
import os from "node:os"

export class WorkerPool {
  private workers: Array<TaskWorker> = []
  private tasks: Array<Task> = []
  private poolSize: number

  constructor() {
    this.poolSize = Math.max(1, (os.availableParallelism() / 2) + 1)
  }

  async init(filename: string, workerData: any): Promise<void> {
    const initializers: Array<Promise<void>> = []
    for (let i = 0; i < this.poolSize; i++) {
      const taskWorker = new TaskWorker(filename, workerData)
      this.workers.push(taskWorker)
      initializers.push(taskWorker.initialize())
      taskWorker.onBecomingAvailableForWork((worker) => this.runNextTask(worker))
    }
    await Promise.all(initializers)
  }

  async runTask<T>(args: any): Promise<T> {
    const task = new Task(args)

    const availableWorker = this.workers.find(worker => worker.isAvailableForWork)
    if (availableWorker !== undefined) {
      availableWorker.runTask(task)
    } else {
      this.tasks.push(task)
    }

    return task.promise()
  }

  abortQueuedTasks() {
    for (const task of this.tasks) {
      task.rejectWith("Task aborted")
    }
    this.tasks = []
  }

  private runNextTask(worker: TaskWorker) {
    const nextTask = this.tasks.shift()
    if (nextTask !== undefined) {
      worker.runTask(nextTask)
    }
  }

  async shutdown(): Promise<void> {
    const terminators: Array<Promise<void>> = []
    for (const taskWorker of this.workers) {
      terminators.push(taskWorker.gracefulShutdown())
    }
    await Promise.all(terminators)
  }
}

class Task {
  private resolve: ((result: any) => void) | undefined
  private reject: ((reason: any) => void) | undefined

  constructor(readonly args: any) { }

  resolveWith(result: any) {
    this.resolve?.(result)
  }

  rejectWith(reason: any) {
    this.reject?.(reason)
  }

  promise(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class TaskWorker {
  private worker: Worker
  private isWorking: boolean = false
  private notifyAvailableForWork: ((worker: TaskWorker) => void) | undefined

  constructor(filename: string, data: any) {
    this.worker = new Worker(filename, {
      workerData: data
    })
  }

  get isAvailableForWork(): boolean {
    return !this.isWorking
  }

  onBecomingAvailableForWork(handler: (worker: TaskWorker) => void) {
    this.notifyAvailableForWork = handler
  }

  async initialize(): Promise<void> {
    await this.sendRequest({ action: "initialize" })
  }

  async runTask(task: Task): Promise<void> {
    this.isWorking = true
    const response = await this.sendRequest({ action: "run", args: task.args })
    this.isWorking = false
    task.resolveWith(response.taskResult)
    this.notifyAvailableForWork?.(this)
  }

  async gracefulShutdown(): Promise<void> {
    await this.sendRequest({ action: "shutdown" })
    await this.worker.terminate()
  }

  private sendRequest(message: any): Promise<any> {
    return new Promise((resolve) => {
      this.worker.once("message", (message: any) => {
        resolve(message)
      })
      this.worker.postMessage(message)
    })
  }
}