import { behavior, effect, example, step } from "esbehavior";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayWith, assignedWith, equalTo, expect, is } from "great-expectations";
import { expectedBehavior } from "./helpers/matchers.js";
import { BehaviorEnvironment } from "../src/behaviorMetadata.js";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";

export default behavior("running behaviors in the browser environment", [

  example(testRunnerContext(BehaviorEnvironment.Local))
    .description("running behavior in browser when the default is local")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/valid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it starts the validation with the correct order provider description", (context) => {
          expect(context.reporter.orderDescription, is(assignedWith(equalTo("Test-Order-Provider-Reverse"))))
        }),
        effect("it uses the order provider to order the behaviors and examples", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "six",
              "five",
              "should only work in a browser",
              "three"
            ]),
            expectedBehavior("Behavior 1", [
              "only in browser",
              "first"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 4,
            invalid: 0,
            skipped: 2
          }))))
        })
      ]
    }),

  ...behaviorBehaviors(BehaviorEnvironment.Browser)

])