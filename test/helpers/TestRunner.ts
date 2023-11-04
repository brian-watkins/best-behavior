import { ClaimResult, Context, Failure, OrderProvider, Reporter, Summary } from "esbehavior";
import { BehaviorEnvironment } from "../../runner/src/behaviorMetadata.js";
import { run } from "../../runner/src/index.js";
import { Logger } from "../../runner/src/logger.js";

export function testRunnerContext(environment: BehaviorEnvironment): Context<TestRunner> {
  return {
    init: () => new TestRunner(environment)
  }
}

export class TestRunner {
  private testReporter = new TestReporter()
  private testOrderProvider = new TestOrderProvider()
  private testLogger = new TestLogger()
  private shouldFailFast: boolean = false
  private shouldRunPickedExamplesOnly: boolean = false

  constructor(private defaultBehaviorEnvironment: BehaviorEnvironment) { }

  setShouldFailFast(shouldFailFast: boolean) {
    this.shouldFailFast = shouldFailFast
  }

  setShouldRunPickedExamplesOnly(shouldRunPickedOnly: boolean) {
    this.shouldRunPickedExamplesOnly = shouldRunPickedOnly
  }

  async runBehaviors(pattern: string): Promise<void> {
    await run({
      behaviorGlob: `./test/fixtures/behaviors/${pattern}`,
      failFast: this.shouldFailFast,
      runPickedOnly: this.shouldRunPickedExamplesOnly,
      showBrowser: false,
      viteConfigPath: undefined,
      behaviorEnvironment: this.defaultBehaviorEnvironment,
      reporter: this.testReporter,
      orderProvider: this.testOrderProvider,
      logger: this.testLogger,
      rootPath: "./dist"
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

class TestLogger implements Logger {
  infoLines: Array<string> = []
  errorLines: Array<Error> = []

  info(line: string): void {
    this.infoLines.push(line)
  }

  error(err: Error): void {
    this.errorLines.push(err)
  }
}