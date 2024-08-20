import { addStuff } from "../../../src/addStuff.js"

export interface MyArgs {
  title: string
}

export function render(args: MyArgs) {
  const root = document.createElement("div")
  root.id = "display-root"
  document.body.appendChild(root)

  const title = document.createElement("h1")
  title.appendChild(document.createTextNode(args.title))
  root.appendChild(title)

  const instructions = document.createElement("div")
  instructions.append(document.createTextNode(`Try to click ${addStuff(7, 5)} times!`))
  root.appendChild(instructions)

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
