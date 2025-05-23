import { BehaviorOptions, ConfigurableExample, Example, ExampleOptions, Summary, ValidationMode, defaultOrder } from "esbehavior"
import { AdapterReporter } from "./adapterReporter.js"
import type { BehaviorBrowserWindow } from "../../main/src/behavior/browser/behaviorBrowserWindow.js"
import { isConfigurableBehaviorLike } from "../../main/src/behavior/behaviorMetadata.js"
import { type BehaviorData, BehaviorErrorCode } from "../../main/src/behavior/browser/behaviorData.js"

declare let window: BehaviorBrowserWindow

window.__bb_loadBehavior = async function (behaviorModuleUrl: string): Promise<BehaviorData> {
  const behaviorModule = await import(/* @vite-ignore */ behaviorModuleUrl)

  if (!Object.hasOwn(behaviorModule, "default")) {
    return {
      type: "error",
      reason: BehaviorErrorCode.NO_DEFAULT_EXPORT
    }
  }

  const configurableBehavior = behaviorModule.default

  if (!isConfigurableBehaviorLike(configurableBehavior)) {
    return {
      type: "error",
      reason: BehaviorErrorCode.NOT_A_BEHAVIOR
    }
  }

  const options = new BehaviorOptions()
  const behavior = (typeof configurableBehavior === "function") ?
    configurableBehavior(options) :
    configurableBehavior

  const configuredExamples: Array<ConfiguredExample> = behavior.examples.map(configureExample)
  this.__bb_currentExamples = configuredExamples.map(ex => ex.example)

  return {
    type: "ok",
    description: behavior.description,
    examples: configuredExamples.map(ex => ex.mode),
    validationMode: options.validationMode
  }
}

window.__bb_validateExample = async function (id: number, failFast: boolean): Promise<Summary> {
  const example = window.__bb_currentExamples[id]
  return example.validate(new AdapterReporter(), { failFast, orderProvider: defaultOrder() })
}

window.__bb_skipExample = async function (id: number): Promise<Summary> {
  const example = window.__bb_currentExamples[id]
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