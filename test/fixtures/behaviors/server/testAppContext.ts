import { contextMap } from "esbehavior";
import { browserContext } from "../../../../main/src/browser.js";
import { serverContext } from "../../../../main/src/serverContext.js";

export const testAppContext = contextMap({
  server: serverContext({
    command: "npm run test:server",
    env: {
      PORT: "3030"
    },
    resource: "http://localhost:3030",
    cwd: "./test/fixtures",
    timeout: 2000,
    value: {
      baseUrl: "http://localhost:3030"
    }
  }),
  browser: browserContext({
    contextGenerator: (browser) => browser.newContext({
      baseURL: "http://localhost:3030"
    })
  })
})
