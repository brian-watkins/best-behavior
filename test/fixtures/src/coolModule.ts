export function addSomeThings(a: number, b: number): number {
  return a + b
}

class FunGreeting {
  private _greeting: string

  constructor(greeting: string) {
    this._greeting = greeting
  }

  greet(name: string): string {
    return `${this._greeting}, ${name}!`
  }
}

export function sayHello(name: string): string {
  const greeter = new FunGreeting("Hello")
  return greeter.greet(name)
}