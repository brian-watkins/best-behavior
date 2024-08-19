import { Matcher, arrayWith, assignedWith, equalTo, objectWith, objectWithProperty } from "great-expectations"
import { BehaviorOutput } from "./TestRunner.js"
import MCR from "monocart-coverage-reports"

export function expectedBehavior(description: string, exampleDescriptions: Array<string>): Matcher<BehaviorOutput> {
  return objectWith({
    description: equalTo(description),
    examples: arrayWith(exampleDescriptions.map(ed => {
      return objectWithProperty("description", assignedWith(equalTo(ed)))
    }))
  })
}

export function fileWithCoveredLines(lines: { [key: string]: string | number }): Matcher<MCR.CoverageFile> {
  return objectWithProperty("data",
    assignedWith(objectWithProperty("lines",
      assignedWith(equalTo(lines)))))
}