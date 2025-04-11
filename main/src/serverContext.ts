import { tokenizeArgs } from "args-tokenizer";
import { Context } from "esbehavior";
import { ChildProcess, spawn } from "node:child_process"
import waitOn from "wait-on"
import { consoleLogger, Logger } from "./logger.js";

export interface ServerContextOptions<T = undefined> {
  command: string
  env?: Record<string, string>,
  cwd?: string,
  killSignal?: NodeJS.Signals,
  resource: string,
  timeout?: number,
  waitOnOptions?: waitOn.WaitOnOptions,
  logger?: Logger
  value?: T
}

export function serverContext<T = void>(options: ServerContextOptions<T>): Context<T> {
  let serverProcess: ChildProcess
  return {
    init: async () => {
      const [command, ...args] = tokenizeArgs(options.command)
      serverProcess = spawn(command, args, {
        cwd: options.cwd,
        detached: true,
        env: { ...process.env, ...options.env }
      })

      serverProcess.stdout?.on("data", (chunk) => {
        options.logger?.info(chunk.toString().trim(), "ServerContext")
      })

      serverProcess.stderr?.on("data", (chunk) => {
        options.logger?.error(chunk.toString().trim(), "ServerContext")
      })

      serverProcess.on("error", (err) => {
        const logger = options.logger ?? consoleLogger()
        logger.error(`Error running command: ${options.command}`, "ServerContext")
        logger.error(err, "ServerContext")
      })

      await waitOn({
        resources: [
          options.resource
        ],
        timeout: options.timeout,
        ...options.waitOnOptions
      })

      return options.value as T
    },
    teardown: async () => {
      process.kill(-serverProcess.pid!, options.killSignal)
    }
  }
}