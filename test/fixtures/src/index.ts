export interface SomeInterfaceThatWillNotShowUpInTheCompiledOutput {
  name: string
}

console.log("Hello from the web page", new Error("Something bad"))

//@ts-ignore
window.funStuff.doThings()