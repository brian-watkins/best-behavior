import { Behavior, ConfigurableBehavior, ConfigurableExample, Example, ExampleOptions, ExampleValidationOptions, Failure, Reporter, Summary, behavior } from "esbehavior"
import { BehaviorOptions, ValidationMode } from "esbehavior/dist/Behavior.js"
import { ClaimResult } from "esbehavior/dist/Claim.js"

// Hopefully this could be moved INSIDE esbehavior

export interface BehaviorRunner {
  start(behavior: ConfigurableBehavior): Behavior
  end(behavior: Behavior): void
  run(configurableExample: ConfigurableExample, options: ExampleValidationOptions): Promise<Summary>
}

interface ConfiguredExample {
  validationMode: ValidationMode
  example: Example
}

interface ConfiguredBehavior {
  validationMode: ValidationMode
  behavior: Behavior
}

export class StandardBehaviorRunner implements BehaviorRunner {
  protected behaviorMode: ValidationMode | undefined

  constructor(protected reporter: Reporter) { }

  start(configurableBehavior: ConfigurableBehavior): Behavior {
    const configuredBehavior = this.configureBehavior(configurableBehavior)
    this.reporter.startBehavior(configuredBehavior.behavior.description)
    return configuredBehavior.behavior
  }

  end(_: Behavior) {
    this.reporter.endBehavior()
  }

  protected configureBehavior(configurableBehavior: ConfigurableBehavior): ConfiguredBehavior {
    const behaviorOptions = new BehaviorOptions()
    const behavior = typeof configurableBehavior === "function" ?
      configurableBehavior(behaviorOptions) :
      configurableBehavior

    // this side effect feels a little weird I guess
    this.behaviorMode = behaviorOptions.validationMode

    return {
      validationMode: behaviorOptions.validationMode,
      behavior
    }
  }

  protected configureExample(configurableExample: ConfigurableExample): ConfiguredExample {
    const exampleOptions = new ExampleOptions()
    const example = typeof configurableExample === "function" ?
      configurableExample(exampleOptions) :
      configurableExample

    return {
      validationMode: this.behaviorMode === ValidationMode.Skipped ?
        ValidationMode.Skipped :
        exampleOptions.validationMode,
      example
    }
  }

  run(configurableExample: ConfigurableExample, options: ExampleValidationOptions): Promise<Summary> {
    const configuredExample = this.configureExample(configurableExample)

    if (configuredExample.validationMode === ValidationMode.Skipped) {
      return configuredExample.example.skip(this.reporter, options)
    } else {
      return configuredExample.example.validate(this.reporter, options)
    }
  }
}

export class PickedOnlyBehaviorRunner extends StandardBehaviorRunner {
  private behavior: Behavior | undefined
  private hasSeenPicked = false

  start(configurableBehavior: ConfigurableBehavior): Behavior {
    // What happens if the Behavior is skipped?
    // if it's picked I guess we know what to do
    // if it is skipped then all the examples will be set to skipped mode
    // so none will be picked. Should we write a test for this?
    this.behavior = this.configureBehavior(configurableBehavior).behavior
    this.hasSeenPicked = false
    return this.behavior
  }

  end(_: Behavior): void {
    if (this.hasSeenPicked) {
      this.reporter.endBehavior()
    }
  }

  run(configurableExample: ConfigurableExample, options: ExampleValidationOptions): Promise<Summary> {
    // we might want to override configureExample? to put this logic there?
    const configuredExample = this.configureExample(configurableExample)
    if (this.behaviorMode === ValidationMode.Picked && configuredExample.validationMode !== ValidationMode.Skipped) {
      configuredExample.validationMode = ValidationMode.Picked
    }
    
    if (configuredExample.validationMode === ValidationMode.Picked) {
      if (!this.hasSeenPicked) {
        this.reporter.startBehavior(this.behavior!.description)
        this.hasSeenPicked = true
      }
      return configuredExample.example.validate(this.reporter, options)
    } else {
      return configuredExample.example.skip(new NullReporter(), options)
    }
  }
}

// Note that this is a one-off right now; it needs more work to
// be able to handle multiple behaviors ...
export class FailFastBehaviorRunner implements BehaviorRunner {
  private skipRunner = new SkipBehaviorRunner(new NullReporter())
  private hasInvalid = false

  constructor(private runner: BehaviorRunner) { }

  start(behavior: ConfigurableBehavior): Behavior {
    return this.runner.start(behavior)
  }

  end(behavior: Behavior) {
    this.runner.end(behavior)
  }

  async run(configurableExample: ConfigurableExample, options: ExampleValidationOptions): Promise<Summary> {
    if (this.hasInvalid) {
      return this.skipRunner.run(configurableExample, options)
    }

    const summary = await this.runner.run(configurableExample, options)

    if (summary.invalid > 0) {
      this.hasInvalid = true
    }

    return summary
  }
}

export class SkipBehaviorRunner extends StandardBehaviorRunner {
  constructor(reporter: Reporter) {
    super(reporter)
  }

  run(configurableExample: ConfigurableExample, options: ExampleValidationOptions): Promise<Summary> {
    const configuredExample = this.configureExample(configurableExample)
    return configuredExample.example.skip(this.reporter, options)
  }
}

export class NullReporter implements Reporter {
  start(orderDescription: string): void { }
  end(summary: Summary): void { }
  terminate(error: Failure): void { }
  startBehavior(description: string): void { }
  endBehavior(): void { }
  startExample(description?: string | undefined): void { }
  endExample(): void { }
  startScript(location: string): void { }
  endScript(): void { }
  recordPresupposition(result: ClaimResult): void { }
  recordAction(result: ClaimResult): void { }
  recordObservation(result: ClaimResult): void { }
}