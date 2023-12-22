import { ClaimResult, Failure, Reporter, Summary } from "esbehavior";
import type { BehaviorBrowserWindow } from "../../runner/src/behaviorBrowserWindow";

declare let window: BehaviorBrowserWindow

// this needs to just handle stuff from the example
export class AdapterReporter implements Reporter {

  start(orderDescription: string): void {
    
  }
  end(summary: Summary): void {
    
  }
  terminate(error: Failure): void {
    
  }
  startBehavior(description: string): void {
    
  }
  endBehavior(): void {
    
  }
  startExample(description?: string | undefined): void {
    window.__bb_startExample(description)
  }
  endExample(): void {
    window.__bb_endExample()
  }
  startScript(location: string): void {
    window.__bb_startScript(location)
  }
  endScript(): void {
    window.__bb_endScript()
  }
  recordPresupposition(result: ClaimResult): void {
    window.__bb_recordPresupposition(result)
  }
  recordAction(result: ClaimResult): void {
    window.__bb_recordAction(result)
  }
  recordObservation(result: ClaimResult): void {
    window.__bb_recordObservation(result)
  }

}