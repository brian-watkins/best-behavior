import { expect, is } from "great-expectations"

export function doAwesomeStuff(a: number, b: number): number {
  expect(7, is(7))
  return a * b * 2
}