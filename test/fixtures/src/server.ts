import { createApp, defineEventHandler } from "h3";

export const app = createApp();

app.use(
  "/fun.html",
  defineEventHandler(() => {
    return "<html><body><h1>Hello!</h1></body></html>"
  }),
)

app.use("/", defineEventHandler(() => {
  return "OK"
}))

