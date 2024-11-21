import { Summary } from "esbehavior"

export function emptySummary(): Summary {
  return { behaviors: 0, examples: 0, valid: 0, invalid: 0, skipped: 0 }
}

export function addSummary(current: Summary, next: Summary): Summary {
  return {
    behaviors: current.behaviors + next.behaviors,
    examples: current.examples + next.examples,
    valid: current.valid + next.valid,
    invalid: current.invalid + next.invalid,
    skipped: current.skipped + next.skipped
  }
}
