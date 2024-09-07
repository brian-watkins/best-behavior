import { OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorMetadata } from "../behavior/behaviorMetadata.js";

export interface ValidationOptions {
  reporter: Reporter
  orderProvider: OrderProvider
  failFast: boolean
  runPickedOnly: boolean
}


export interface Validator {
  validate(behaviors: Array<BehaviorMetadata>, options: ValidationOptions): Promise<Summary>
}