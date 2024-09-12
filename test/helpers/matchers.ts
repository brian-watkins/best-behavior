import { Matcher, arrayWith, assignedWith, equalTo, objectWith, objectWithProperty, satisfying, stringContaining } from "great-expectations"
import { BehaviorOutput, ClaimOutput } from "./TestRunner.js"
import MCR from "monocart-coverage-reports"
import path from "node:path"

export function expectedBehavior(description: string, exampleDescriptions: Array<string>): Matcher<BehaviorOutput> {
  return objectWith({
    description: equalTo(description),
    examples: arrayWith(exampleDescriptions.map(ed => {
      return objectWithProperty("description", assignedWith(equalTo(ed)))
    }))
  })
}

export function expectedExampleScripts(examples: Array<Array<string>>): Matcher<BehaviorOutput> {
  return objectWithProperty("examples", arrayWith(examples.map(e => {
    const expectedDescription = e[0]
    const expectedScriptLocation = path.join(process.cwd(), e[1])
    return objectWith({
      description: assignedWith(equalTo(expectedDescription)),
      scriptLocation: equalTo(expectedScriptLocation)
    })
  })))
}

export function expectedClaim(description: string, location: string): Matcher<ClaimOutput> {
  const expandedPath = path.join(process.cwd(), location)

  return objectWith({
    description: assignedWith(equalTo(description)),
    stack: assignedWith(satisfying([
      stringContaining("http://localhost:", { times: 0 }),
      stringContaining(expandedPath)
    ]))
  })
}

export function fileWithCoveredLines(lines: { [key: string]: string | number }): Matcher<MCR.CoverageFile> {
  return objectWithProperty("data",
    assignedWith(objectWithProperty("lines",
      assignedWith(equalTo(lines)))))
}

interface CoverageSummary {
  functions: number | ""
  branches: number | ""
  statements: number | ""
  lines: number | ""
}

export function fileWithCoverageSummary(summary: CoverageSummary): Matcher<MCR.CoverageFile> {
  return objectWithProperty("summary", objectWith({
    functions: objectWithProperty("pct", equalTo(summary.functions)),
    branches: objectWithProperty("pct", equalTo(summary.branches)),
    statements: objectWithProperty("pct", equalTo(summary.statements)),
    lines: objectWithProperty("pct", equalTo(summary.lines)),
  }))
}