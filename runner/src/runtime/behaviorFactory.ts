import { ConfigurableBehavior } from "esbehavior";
import { Transpiler } from "../transpiler.js";
import { BrowserBehaviorContext } from "./browserBehavior.js";
import { getLocalBehavior } from "./localBehavior.js";
import { BehaviorEnvironment, BehaviorMetadata } from "./behaviorMetadata.js";

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