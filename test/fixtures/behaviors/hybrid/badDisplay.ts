import { DisplayContext } from "../../../../runner/src/displayContext.js"

export interface TheArgs {
  name: string
}

export const display: DisplayContext<TheArgs> = {
  render(args) {
    const div = document.createElement("div")
    //@ts-ignore
    div.doFunStuff()
  }
}