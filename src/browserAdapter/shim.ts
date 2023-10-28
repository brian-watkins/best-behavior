import { ConfigurableExample, Example, ExampleOptions, Summary, defaultOrder } from "esbehavior"
import { BehaviorOptions, ValidationMode } from "esbehavior/dist/Behavior.js"
import { AdapterReporter } from "./adapterReporter.js"

// Note might have to exclude this from getting transpiled when
// we build the module? Otherwise the path that is used to load this
// from the index.html page might be messed up
// Unless maybe we use vite to build everything?

export interface BehaviorData {
  description: string
  examples: Array<ValidationMode>
  validationMode: ValidationMode
}

window.loadBehavior = async function (path: string): Promise<BehaviorData> {
  const behaviorModule = await import(/* @vite-ignore */ `http://localhost:5957/${path}`)

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