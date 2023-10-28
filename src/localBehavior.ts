import { ConfigurableBehavior } from "esbehavior"
import { BehaviorMetadata } from "./behaviorMetadata.js"
import { Transpiler } from "./transpiler.js"

export async function getLocalBehavior(transpiler: Transpiler, behaviorMetadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
  const behaviorModule: any = await transpiler.loadModule(behaviorMetadata.path)
  return behaviorModule.default
}
