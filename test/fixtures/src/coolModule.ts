export function addSomeThings(a: number, b: number): number {
  return a + b
}

class FunGreeting {
  constructor(private _greeting: string) { }

  greet(name: string): string {
    return `${this._greeting}, ${name}!`
  }
}

export function sayHello(name: string): string {
  const greeter = new FunGreeting("Hello")
  return greeter.greet(name)
}