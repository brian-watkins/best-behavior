import { ClaimResult, Context, Failure, OrderProvider, Reporter, Summary } from "esbehavior";
import { run, Logger } from "../../dist/runner/index.js"

export interface TestRunnerOptions {
  browserGlob: string | undefined
}

export function testRunnerContext(options: TestRunnerOptions): Context<TestRunner> {
  return {
    init: () => new TestRunner(options)
  }
}

export class TestRunner {
  private testReporter = new TestReporter()
  private testOrderProvider = new TestOrderProvider()
  private testLogger = new TestLogger()
  private shouldFailFast: boolean = false
  private shouldRunPickedExamplesOnly: boolean = false

  constructor(private options: TestRunnerOptions) { }

  setShouldFailFast(shouldFailFast: boolean) {
    this.shouldFailFast = shouldFailFast
  }

  setShouldRunPickedExamplesOnly(shouldRunPickedOnly: boolean) {
    this.shouldRunPickedExamplesOnly = shouldRunPickedOnly
  }

  async runBehaviors(pattern: string): Promise<void> {
    await run({
      behaviorsGlob: `./test/fixtures/behaviors/${pattern}`,
      browserBehaviorsGlob: this.options.browserGlob,
      failFast: this.shouldFailFast,
      runPickedOnly: this.shouldRunPickedExamplesOnly,
      showBrowser: false,
      viteConfig: undefined,
      reporter: this.testReporter,
      orderProvider: this.testOrderProvider,
      logger: this.testLogger,
    })
  }

  get reporter(): TestReporter {
    return this.testReporter
  }

  get logs(): TestLogger {
    return this.testLogger
  }
}

class TestReporter implements Reporter {
  summary: Summary | undefined;
  orderDescription: string | undefined
  output: Array<BehaviorOutput> = []
  currentBehavior: BehaviorOutput | undefined
  currentExample: ExampleOutput | undefined
  invalidClaims: Array<ClaimOutput> = []

  start(orderDescription: string): void {
    this.orderDescription = orderDescription
  }
  end(summary: Summary): void {
    this.summary = summary
  }
  terminate(error: Failure): void {
    console.log("TEST REPORTER TERMINATE", error)
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
      description,
      scriptLocation: ""
    }
  }
  endExample(): void {
    this.currentBehavior?.examples.push(this.currentExample!)
    this.currentExample = undefined
  }
  startScript(location: string): void {
    this.currentExample!.scriptLocation = location
  }
  endScript(): void {

  }
  recordPresupposition(result: ClaimResult): void {
    this.recordClaim(result)
  }
  recordAction(result: ClaimResult): void {
    this.recordClaim(result)
  }
  recordObservation(result: ClaimResult): void {
    this.recordClaim(result)
  }
  private recordClaim(result: ClaimResult): void {
    switch (result.type) {
      // we don't assert anything about other claims yet
      case "invalid-claim":
        this.invalidClaims.push({ description: result.description, stack: result.error.stack })
    }
  }
}

export interface BehaviorOutput {
  description: string
  examples: Array<ExampleOutput>
}

export interface ExampleOutput {
  description: string | undefined
  scriptLocation: string
}

export interface ClaimOutput {
  description: string
  stack: string | undefined
}

class TestOrderProvider implements OrderProvider {
  description: string = "Test-Order-Provider-Reverse"

  order<T>(items: T[]): T[] {
    return items.reverse()
  }
}

class TestLogger implements Logger {
  infoLines: Array<string> = []
  errorLines: Array<string> = []

  info(line: string): void {
    this.infoLines.push(line)
  }

  error(err: Error): void {
    this.errorLines.push(err.stack!)
  }
}