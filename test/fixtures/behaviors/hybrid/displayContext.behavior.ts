import { behavior, effect, example, fact, step } from "esbehavior";
import { DisplayContext, useDisplay } from "../../../../runner/src/displayContext.js"
import { expect, is } from "great-expectations";

interface MyArgs {
  title: string
}

export const browserContext: DisplayContext<MyArgs, HTMLElement> = {
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

export default behavior("browser context", [

  example({ init: () => useDisplay() })
    .description("use a browser context")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mount({ title: "Something cool" })
        })
      ],
      perform: [
        step("take action on the component", async (context) => {
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
        })
      ],
      observe: [
        effect("it uses the args to render the element", async (context) => {
          const titleText = await context.page.locator("h1").innerText({ timeout: 200 })
          expect(titleText, is("Something cool"))
        }),
        effect("it updates in response to events as expected", async (context) => {
          const counterText = await context.page.locator("[data-counter]").innerText({ timeout: 200 })
          expect(counterText, is("Clicks: 3"))
        })
      ]
    })

])
