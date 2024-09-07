import { ConfigurableBehavior } from "esbehavior";
import { Transpiler } from "../transpiler/index.js";
import { BehaviorEnvironment, BehaviorMetadata } from "./behaviorMetadata.js";
import { getLocalBehavior } from "./local/localBehavior.js";
import { BrowserBehaviorContext } from "./browser/browserBehavior.js";

export class BehaviorFactory {

  constructor(private transpiler: Transpiler, private browserContext: BrowserBehaviorContext) { }

  getBehavior(metadata: BehaviorMetadata): Promise<ConfigurableBehavior> {
    switch (metadata.environment) {
      case BehaviorEnvironment.Local:
        return getLocalBehavior(this.transpiler, metadata)
      case BehaviorEnvironment.Browser:
        return this.browserContext.getBrowserBehavior(metadata)
    }
  }
}