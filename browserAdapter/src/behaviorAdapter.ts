import { BehaviorOptions, ConfigurableExample, Example, ExampleOptions, Summary, ValidationMode, defaultOrder } from "esbehavior"
import { AdapterReporter } from "./adapterReporter.js"
import { BehaviorData } from "../../types/types.js"

window.loadBehavior = async function (behaviorModuleUrl: string): Promise<BehaviorData> {
  const behaviorModule = await import(behaviorModuleUrl)

  const configurableBehavior = behaviorModule.default

  const options = new BehaviorOptions()
  const behavior = (typeof configurableBehavior === "function") ?
    configurableBehavior(options) :
    configurableBehavior

  window.currentBehavior = behavior

  const configuredExamples: Array<ConfiguredExample> = behavior.examples.map(configureExample)
  this.currentExamples = configuredExamples.map(ex => ex.example)

  return {
    description: behavior.description,
    examples: configuredExamples.map(ex => ex.mode),
    validationMode: options.validationMode
  }
}

window.validateExample = async function (id: number, failFast: boolean): Promise<Summary> {
  const example = window.currentExamples[id]
  return example.validate(new AdapterReporter(), { failFast, orderProvider: defaultOrder() })
}

window.skipExample = async function (id: number): Promise<Summary> {
  const example = window.currentExamples[id]
  return example.skip(new AdapterReporter(), { failFast: false, orderProvider: defaultOrder() })
}

function configureExample(configurableExample: ConfigurableExample): ConfiguredExample {
  const options = new ExampleOptions()
  const example = (typeof configurableExample === "function") ?
    configurableExample(options) :
    configurableExample

  return {
    example,
    mode: options.validationMode
  }
}

interface ConfiguredExample {
  example: Example
  mode: ValidationMode
}