import { behavior, effect, example, step } from "esbehavior";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { BehaviorEnvironment } from "../runner/src/behaviorMetadata.js";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { assignedWith, equalTo, expect, is } from "great-expectations";

export default behavior("running behaviors in the local JS environment", [

  ...behaviorBehaviors(BehaviorEnvironment.Local),

  example(testRunnerContext(BehaviorEnvironment.Local))
    .description("running behaviors that use playwright and local server")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/outside/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 1,
            valid: 2,
            invalid: 0,
            skipped: 0
          }))))
        })
      ]
    })

])
