import { behavior } from "esbehavior";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { BehaviorEnvironment } from "../src/behaviorMetadata.js";

export default behavior("running behaviors in the local JS environment", [

  ...behaviorBehaviors(BehaviorEnvironment.Local)

])
