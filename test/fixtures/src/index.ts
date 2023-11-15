export interface SomeInterfaceThatWillNotShowUpInTheCompiledOutput {
  name: string
}

//@ts-ignore
window.funStuff.doThings()