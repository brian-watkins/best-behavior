import { ViewController } from "../../../../../runner/src/index.js"

export interface MyArgs {
  title: string
}

const superDisplay: ViewController<MyArgs> = {
  render: (args) => {
    const root = document.createElement("div")
    root.id = "display-root"
    document.body.appendChild(root)

    const title = document.createElement("h1")
    title.appendChild(document.createTextNode(args.title))
    root.appendChild(title)

    const clickCount = document.createElement("div")
    clickCount.dataset["counter"] = "true"
    const clickCountText = document.createTextNode(`Clicks: 0`)
    clickCount.appendChild(clickCountText)
    root.appendChild(clickCount)

    const button = document.createElement("button")
    button.appendChild(document.createTextNode("Click me!"))
    let totalClicks = 0
    button.addEventListener("click", () => {
      totalClicks = totalClicks + 1
      clickCountText.nodeValue = `Clicks: ${totalClicks}`
    })
    root.appendChild(button)
  }
}

export default superDisplay
