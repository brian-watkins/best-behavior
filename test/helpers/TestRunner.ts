import { ClaimResult, Context, Failure, OrderProvider, Reporter, Summary } from "esbehavior";
import { Logger } from "../../dist/main/index.js"
import { run, RunResult } from "../../dist/main/runtime/index.js"
import { CoverageReporter, V8CoverageData } from "../../dist/main/runtime/coverageReporter.js";
import MCR from "monocart-coverage-reports";

export interface TestRunnerOptions {
  browserGlob?: string
  browserBehaviorHTML?: string
}

export function testRunnerContext(options: TestRunnerOptions = {}): Context<TestRunner> {
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
  private behaviorFilter: string | undefined
  private configFile: string | undefined
  private testCoverageReporter = new TestCoverageReporter()
  private shouldCollectCoverage: boolean = false
  public runResult: RunResult | undefined

  constructor(private options: TestRunnerOptions) {
    this.setShouldCollectCoverage(false)
  }

  setConfigFile(path: string) {
    this.configFile = path
  }

  setShouldCollectCoverage(shouldCollectCoverage: boolean) {
    // this.coverageReporter.shouldCollectCoverage = shouldCollectCoverage
    this.shouldCollectCoverage = shouldCollectCoverage
  }

  setShouldFailFast(shouldFailFast: boolean) {
    this.shouldFailFast = shouldFailFast
  }

  setShouldRunPickedExamplesOnly(shouldRunPickedOnly: boolean) {
    this.shouldRunPickedExamplesOnly = shouldRunPickedOnly
  }

  setBehaviorFilter(filter: string) {
    this.behaviorFilter = filter
  }

  async runBehaviors(pattern?: string): Promise<void> {
    this.runResult = await run({
      config: this.configFile,
      behaviorGlobs: pattern ? [`./test/fixtures/behaviors/${pattern}`] : undefined,
      behaviorFilter: this.behaviorFilter,
      browserBehaviors: {
        globs: this.options.browserGlob ? [this.options.browserGlob] : undefined,
        html: this.options.browserBehaviorHTML
      },
      failFast: this.shouldFailFast,
      runPickedOnly: this.shouldRunPickedExamplesOnly,
      showBrowser: false,
      viteConfig: undefined,
      reporter: this.testReporter,
      collectCoverage: this.shouldCollectCoverage,
      coverageReporter: this.testCoverageReporter,
      orderProvider: this.testOrderProvider,
      logger: this.testLogger,
    })
  }

  get reporter(): TestReporter {
    return this.testReporter
  }

  get coverageReporter(): TestCoverageReporter {
    return this.testCoverageReporter!
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
  terminatedWithError: Failure | undefined
  private shouldTerminate: boolean = false

  expectTermination() {
    this.shouldTerminate = true
  }

  start(orderDescription: string): void {
    this.orderDescription = orderDescription
  }
  end(summary: Summary): void {
    this.summary = summary
  }
  terminate(error: Failure): void {
    if (!this.shouldTerminate) {
      console.log("TEST REPORTER TERMINATED UNEXPECTEDLY", error)
    }
    this.terminatedWithError = error
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
        this.invalidClaims.push({ description: result.description, message: result.error.message, stack: result.error.stack })
    }
  }
}

class TestCoverageReporter implements CoverageReporter {
  private mcr!: MCR.CoverageReport;
  coverageResults: MCR.CoverageResults | undefined

  async start(): Promise<void> {
    this.mcr = new MCR.CoverageReport({
      reports: "none",
      clean: true,
      entryFilter: (entry) => entry.url.includes("test/fixtures/src")
    })
  }

  async recordData(coverageData: Array<V8CoverageData>): Promise<void> {
    await this.mcr.add(coverageData)
  }

  async end(): Promise<void> {
    this.coverageResults = await this.mcr.generate()
  }

  coveredFile(path: string): MCR.CoverageFile | undefined {
    return this.coverageResults?.files.find(file => file.url === path)
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
  message: string | undefined
  stack: string | undefined
}

class TestOrderProvider implements OrderProvider {
  description: string = "Test-Order-Provider-Reverse"

  order<T>(items: T[]): T[] {
    return items.slice().reverse()
  }
}

class TestLogger implements Logger {
  infoLines: Array<string> = []
  errorLines: Array<string> = []

  info(line: string): void {
    this.infoLines.push(line)
  }

  error(err: string): void {
    this.errorLines.push(err)
  }
}