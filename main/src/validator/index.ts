import { OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";
import { OutputAction } from "./bufferedOutput.js";
import { LocalServerContext } from "../localServer/context.js";

export interface RuntimeAttributes {
  localServer: LocalServerContext
  context?: any
}

export interface ValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}

export interface ValidationCompleted {
  type: "completed"
  summary: Summary
}

export function validationCompleted(summary: Summary): ValidationCompleted {
  return {
    type: "completed",
    summary
  }
}

export interface ValidationTerminated {
  type: "terminated"
  err: any
}

export function validationTerminated(err: any): ValidationTerminated {
  return {
    type: "terminated",
    err
  }
}

export type ValidationResult = ValidationCompleted | ValidationTerminated


export interface ValidationManager {
  validate(behaviors: Array<BehaviorMetadata>): Promise<ValidationResult>
}

export interface BehaviorValidationTaskResult {
  validationResult: ValidationResult,
  outputActions: Array<OutputAction>,
}
