
export function render(arg: string) {
  const root = document.getElementById("test-app")
  if (root) {
    const title = document.createElement("h1")
    const text = document.createTextNode(arg)
    title.appendChild(text)
    root.appendChild(title)
  }
}
