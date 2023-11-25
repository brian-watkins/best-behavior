
interface BehaviorData {
  description: string
  examples: Array<ValidationMode>
  validationMode: ValidationMode
}

export declare global {
  interface Window {
    currentBehavior: Behavior
    currentExamples: Array<Example>
    loadBehavior(path: string): Promise<BehaviorData>
    loadDisplay(url: string, exportName: string, args: any): void
    validateExample(id: number, failFast: boolean): Promise<Summary>
    skipExample(id: number): Promise<Summary>
    esb_startExample(description: string | undefined): void
    esb_endExample(): void
    esb_startScript(location: string): void
    esb_endScript(): void
    esb_recordPresupposition(result: ClaimResult): void
    esb_recordAction(result: ClaimResult): void
    esb_recordObservation(result: ClaimResult): void
    __bb_pageBinding(pageFunction: string, arg: any): Promise<any>
    __bb_viewHandle: any | undefined = undefined
    __bb_viewController: ViewController<any> | undefined = undefined
  }

  var __best_behavior_context: BehaviorContext
}
