import { ViewController } from "../../../../../runner/src/index.js"

const funnyDisplay: ViewController<string> = {
  render: (arg) => {
    const root = document.getElementById("test-app")
    if (root) {
      const title = document.createElement("h1")
      const text = document.createTextNode(arg)
      title.appendChild(text)
      root.appendChild(title)
    }
  }
}

export default funnyDisplay