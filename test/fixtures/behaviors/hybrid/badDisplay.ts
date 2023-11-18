import { ViewController } from "../../../../runner/src/index.js"

export interface TheArgs {
  name: string
}

export const display: ViewController<TheArgs> = {
  render() {
    const div = document.createElement("div")
    //@ts-ignore
    div.doFunStuff()
  }
}