import { register } from "node:module"
import { ServerMessage } from "./loaderMessages.js"
import { MessageChannel, MessagePort } from "node:worker_threads"
import { Transpiler, TranspilerOptions } from "../transpiler.js"

class ViteTranspiler implements Transpiler {
  private loader: MessagePort

  constructor() {
    const ports = new MessageChannel()

    this.loader = ports.port1

    register("./viteLoader.js", {
      parentURL: import.meta.url,
      data: {
        port: ports.port2
      },
      transferList: [ports.port2]
    })
  }

  async setConfig(options: TranspilerOptions): Promise<void> {
    return new Promise((resolve) => {
      function listener(message: ServerMessage) {
        if (message.type === "vite-configured") {
          resolve()
        }
      }

      this.loader.once("message", listener)
      this.loader.postMessage({
        type: "set-config",
        viteConfig: options.viteConfig,
        behaviorGlobs: options.behaviorGlobs
      })
    })
  }

  async loadModule(modulePath: string): Promise<any> {
    try {
      return import(`vite:${modulePath}`)
    } catch (err) {
      console.log("Got an error loading module", modulePath, err)
      return undefined
    }
  }

  async getSource(path: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const listener = (message: ServerMessage) => {
        if (message.type === "source" && message.path === path) {
          resolve(message.source)
        }
      }

      this.loader.once("message", listener)
      this.loader.postMessage({ type: "get-source", path })
    })
  }

  shutdown() {
    this.loader.close()
  }
}

export const viteTranspiler = new ViteTranspiler()