import { ClaimResult, Failure, Reporter, Summary } from "esbehavior";
import { Logger } from "../logger.js";
import { Writable } from "node:stream"

export enum ReporterMethod {
  START_BEHAVIOR,
  END_BEHAVIOR,
  START_EXAMPLE,
  END_EXAMPLE,
  START_SCRIPT,
  END_SCRIPT,
  RECORD_PRESUPPOSITION,
  RECORD_ACTION,
  RECORD_OBSERVATION,
}

export interface ReporterAction {
  type: "reporter"
  method: ReporterMethod,
  args?: any
}

export enum LogLevel {
  INFO,
  ERROR
}

export interface LogAction {
  type: "log"
  level: LogLevel
  message: string
  source?: string
}


export type OutputAction = ReporterAction | LogAction

export class BufferedOutput implements Reporter, Logger {
  private actions: Array<OutputAction> = []

  reset() {
    this.actions = []
  }

  private addReporterAction(method: ReporterMethod, args?: any) {
    this.actions.push({
      type: "reporter",
      method,
      args
    })
  }

  private addLogAction(level: LogLevel, message: string, source?: string) {
    this.actions.push({
      type: "log",
      level,
      message,
      source
    })
  }

  getActions(): Array<OutputAction> {
    return this.actions
  }

  info(line: string, source?: string): void {
    this.addLogAction(LogLevel.INFO, line, source)
  }

  error(error: string, source?: string): void {
    this.addLogAction(LogLevel.ERROR, error, source)
  }

  console(): Console {
    return new console.Console(
      new Writable({
        write: (chunk, _, done) => {
          this.info(chunk.toString().trim())
          done()
        },
      }),
      new Writable({
        write: (chunk, _, done) => {
          this.error(chunk.toString().trim())
          done()
        },
      })
    )
  }

  start(_: string): void { }
  end(_: Summary): void { }
  terminate(_: Failure): void { }

  startBehavior(description: string): void {
    this.addReporterAction(ReporterMethod.START_BEHAVIOR, description)
  }

  endBehavior(): void {
    this.addReporterAction(ReporterMethod.END_BEHAVIOR)
  }

  startExample(description?: string): void {
    this.addReporterAction(ReporterMethod.START_EXAMPLE, description)
  }

  endExample(): void {
    this.addReporterAction(ReporterMethod.END_EXAMPLE)
  }

  startScript(location: string): void {
    this.addReporterAction(ReporterMethod.START_SCRIPT, location)
  }

  endScript(): void {
    this.addReporterAction(ReporterMethod.END_SCRIPT)
  }

  recordPresupposition(result: ClaimResult): void {
    this.addReporterAction(ReporterMethod.RECORD_PRESUPPOSITION, result)
  }

  recordAction(result: ClaimResult): void {
    this.addReporterAction(ReporterMethod.RECORD_ACTION, result)
  }

  recordObservation(result: ClaimResult): void {
    this.addReporterAction(ReporterMethod.RECORD_OBSERVATION, result)
  }
}

export function applyActions(reporter: Reporter, logger: Logger, actions: Array<OutputAction>) {
  for (const action of actions) {
    switch (action.type) {
      case "reporter": {
        switch (action.method) {
          case ReporterMethod.START_BEHAVIOR:
            reporter.startBehavior(action.args)
            break
          case ReporterMethod.END_BEHAVIOR:
            reporter.endBehavior()
            break
          case ReporterMethod.START_EXAMPLE:
            reporter.startExample(action.args)
            break
          case ReporterMethod.END_EXAMPLE:
            reporter.endExample()
            break
          case ReporterMethod.START_SCRIPT:
            reporter.startScript(action.args)
            break
          case ReporterMethod.END_SCRIPT:
            reporter.endScript()
            break
          case ReporterMethod.RECORD_PRESUPPOSITION:
            reporter.recordPresupposition(action.args)
            break
          case ReporterMethod.RECORD_ACTION:
            reporter.recordAction(action.args)
            break
          case ReporterMethod.RECORD_OBSERVATION:
            reporter.recordObservation(action.args)
            break
        }
        break
      }
      case "log": {
        switch (action.level) {
          case LogLevel.INFO:
            logger.info(action.message, action.source)
            break
          case LogLevel.ERROR:
            logger.error(action.message, action.source)
            break
        }
        break
      }
    }
  }
}