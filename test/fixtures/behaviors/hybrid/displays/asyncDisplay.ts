import { ViewController } from "../../../../../runner/src/index.js"

export interface CoolArgs {
  title: string
}

const superDisplay: ViewController<CoolArgs> = {
  render: async (args) => {
    const root = document.createElement("div")
    root.id = "display-root"
    document.body.appendChild(root)

    const title = document.createElement("h1")
    title.appendChild(document.createTextNode(args.title))
    root.appendChild(title)
  }
}

export default superDisplay
