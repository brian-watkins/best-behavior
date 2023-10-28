import { Matcher, arrayWith, assignedWith, equalTo, objectWith, objectWithProperty } from "great-expectations"
import { BehaviorOutput } from "./TestRunner.js"

export function expectedBehavior(description: string, exampleDescriptions: Array<string>): Matcher<BehaviorOutput> {
  return objectWith({
    description: equalTo(description),
    examples: arrayWith(exampleDescriptions.map(ed => {
      return objectWithProperty("description", assignedWith(equalTo(ed)))
    }))
  })
}