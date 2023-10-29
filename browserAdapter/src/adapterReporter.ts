import { ClaimResult, Failure, Reporter, Summary } from "esbehavior";

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
    window.esb_startExample(description)
  }
  endExample(): void {
    window.esb_endExample()
  }
  startScript(location: string): void {
    window.esb_startScript(location)
  }
  endScript(): void {
    window.esb_endScript()
  }
  recordPresupposition(result: ClaimResult): void {
    window.esb_recordPresupposition(result)
  }
  recordAction(result: ClaimResult): void {
    window.esb_recordAction(result)
  }
  recordObservation(result: ClaimResult): void {
    window.esb_recordObservation(result)
  }

}