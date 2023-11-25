import { Behavior, ClaimResult, Example, Summary, ValidationMode } from "esbehavior"

export interface BehaviorData {
  description: string
  examples: Array<ValidationMode>
  validationMode: ValidationMode
}

export interface BehaviorBrowserWindow extends Window {
  __bb_currentExamples: Array<Example>
  __bb_loadBehavior(path: string): Promise<BehaviorData>
  __bb_validateExample(id: number, failFast: boolean): Promise<Summary>
  __bb_skipExample(id: number): Promise<Summary>
  __bb_startExample(description: string | undefined): void
  __bb_endExample(): void
  __bb_startScript(location: string): void
  __bb_endScript(): void
  __bb_recordPresupposition(result: ClaimResult): void
  __bb_recordAction(result: ClaimResult): void
  __bb_recordObservation(result: ClaimResult): void
  __bb_pageBinding(pageFunction: string, arg: any): Promise<any>
}
