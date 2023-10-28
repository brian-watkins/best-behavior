import { Context, Failure, OrderProvider, Reporter, Summary } from "esbehavior";
import { LocalServer } from "../../src/localServer.js";
import { Runner } from "../../src/runner.js";
import { ClaimResult } from "esbehavior/dist/Claim.js";
import { PlaywrightBrowser } from "../../src/playwrightBrowser.js";
import { BehaviorEnvironment } from "../../src/behaviorMetadata.js";

export function testRunnerContext(environment: BehaviorEnvironment): Context<TestRunner> {
  return {
    init: () => new TestRunner(environment)
  }
}

export class TestRunner {
  private localServer: LocalServer;
  private playwrightBrowser: PlaywrightBrowser
  private runner: Runner;
  private testReporter: TestReporter;
  private testOrderProvider: TestOrderProvider
  private shouldFailFast: boolean = false
  private shouldRunPickedExamplesOnly: boolean = false

  constructor(private defaultBehaviorEnvironment: BehaviorEnvironment) {
    this.localServer = new LocalServer()
    this.playwrightBrowser = new PlaywrightBrowser()
    this.testReporter = new TestReporter()
    this.runner = new Runner(this.localServer, this.playwrightBrowser)
    this.testOrderProvider = new TestOrderProvider()
  }

  setShouldFailFast(shouldFailFast: boolean) {
    this.shouldFailFast = shouldFailFast
  }

  setShouldRunPickedExamplesOnly(shouldRunPickedOnly: boolean) {
    this.shouldRunPickedExamplesOnly = shouldRunPickedOnly
  }

  async runBehaviors(pattern: string): Promise<void> {
    await this.localServer.start()
    await this.runner.run({
      behaviorPathPattern: `./test/fixtures/behaviors/${pattern}`,
      reporter: this.testReporter,
      orderProvider: this.testOrderProvider,
      failFast: this.shouldFailFast,
      runPickedOnly: this.shouldRunPickedExamplesOnly,
      defaultEnvironment: this.defaultBehaviorEnvironment
    })
    await this.localServer.stop()
    await this.playwrightBrowser.stop()
  }

  get reporter(): TestReporter {
    return this.testReporter
  }
}

class TestReporter implements Reporter {
  summary: Summary | undefined;
  orderDescription: string | undefined
  output: Array<BehaviorOutput> = []
  currentBehavior: BehaviorOutput | undefined
  currentExample: ExampleOutput | undefined

  start(orderDescription: string): void {
    this.orderDescription = orderDescription
  }
  end(summary: Summary): void {
    this.summary = summary
  }
  terminate(error: Failure): void {
  
  }
  startBehavior(description: string): void {
    this.currentBehavior = {
      description,
      examples: []
    }
  }
  endBehavior(): void {
    this.output.push(this.currentBehavior!)
    this.currentBehavior = undefined
  }
  startExample(description?: string | undefined): void {
    this.currentExample = {
      description
    }
  }
  endExample(): void {
    this.currentBehavior?.examples.push(this.currentExample!)
    this.currentExample = undefined
  }
  startScript(location: string): void {
  
  }
  endScript(): void {
  
  }
  recordPresupposition(result: ClaimResult): void {
  
  }
  recordAction(result: ClaimResult): void {
  
  }
  recordObservation(result: ClaimResult): void {
  
  }
}

export interface BehaviorOutput {
  description: string
  examples: Array<ExampleOutput>
}

export interface ExampleOutput {
  description: string | undefined
}

class TestOrderProvider implements OrderProvider {
  description: string = "Test-Order-Provider-Reverse"

  order<T>(items: T[]): T[] {
    return items.reverse()
  }
}