import { ConfigurableBehavior } from "esbehavior"
import { BehaviorMetadata, isConfigurableBehaviorLike } from "../behaviorMetadata.js"
import { ModuleLoader } from "../../transpiler/index.js"
import { BehaviorSyntaxError, NoDefaultExportError, NotABehaviorError } from "../behaviorError.js"

export async function getLocalBehavior(moduleLoader: ModuleLoader, behaviorMetadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
  const behaviorModule: any = await moduleLoader.load(behaviorMetadata.path)
    .catch((err) => { throw new BehaviorSyntaxError(behaviorMetadata.path, err) })

  if (!Object.hasOwn(behaviorModule, "default")) {
    throw new NoDefaultExportError(behaviorMetadata.path)
  }

  const configurableBehavior = behaviorModule.default

  if (!isConfigurableBehaviorLike(configurableBehavior)) {
    throw new NotABehaviorError(behaviorMetadata.path)
  }

  return configurableBehavior
}
