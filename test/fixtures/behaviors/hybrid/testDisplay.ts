import { DisplayContext } from "../../../../runner/src/index.js"

export interface MyArgs {
  title: string
}

export const superDisplay: DisplayContext<MyArgs, HTMLElement> = {
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

    return root
  },
  teardown: (handle) => {
    document.body.removeChild(handle)
  }
}

export const funnyDisplay: DisplayContext<string> = {
  render: (arg) => {
    const root = document.getElementById("test-app")
    if (root) {
      const title = document.createElement("h1")
      const text = document.createTextNode(arg)
      title.appendChild(text)
      root.appendChild(title)
    }
  },
  teardown: () => {
    const root = document.getElementById("test-app")!
    while (root.hasChildNodes()) {
      root.removeChild(root.lastChild!)
    }
  }
}