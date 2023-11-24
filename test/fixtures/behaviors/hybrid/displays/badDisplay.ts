import { ViewController } from "../../../../../runner/src/index.js"

export interface TheArgs {
  name: string
}

const display: ViewController<TheArgs> = {
  render() {
    const div = document.createElement("div")
    //@ts-ignore
    div.doFunStuff()
  }
}

export default display