import { ConfigurableBehavior } from "esbehavior"
import { BehaviorMetadata, NoDefaultExportError, NotABehaviorError, isConfigurableBehaviorLike } from "./behaviorMetadata.js"
import { Transpiler } from "./transpiler.js"

export async function getLocalBehavior(transpiler: Transpiler, behaviorMetadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
  const behaviorModule: any = await transpiler.loadModule(behaviorMetadata.path)

  if (!Object.hasOwn(behaviorModule, "default")) {
    throw new NoDefaultExportError(behaviorMetadata.path)
  }

  const configurableBehavior = behaviorModule.default

  if (!isConfigurableBehaviorLike(configurableBehavior)) {
    throw new NotABehaviorError(behaviorMetadata.path)
  }

  return configurableBehavior
}
