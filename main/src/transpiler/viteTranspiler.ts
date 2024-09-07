import { register } from "node:module"
import { LoaderMessage, ServerMessage, SourceMessage } from "./loaderMessages.js"
import { MessageChannel, MessagePort } from "node:worker_threads"
import { Transpiler, TranspilerOptions } from "./index.js"

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
    await this.sendLoaderRequest({
      type: "set-config",
      viteConfig: options.viteConfig,
      behaviorGlobs: options.behaviorGlobs
    }, "vite-configured")
  }

  async loadModule(modulePath: string): Promise<any> {
    try {
      return import(/* @vite-ignore */ `vite:${modulePath}`)
    } catch (err) {
      return undefined
    }
  }

  async getSource(path: string): Promise<string | undefined> {
    const response = await this.sendLoaderRequest<SourceMessage>({ type: "get-source", path }, "source")
    return response.source
  }

  async stop(): Promise<void> {
    await this.sendLoaderRequest({ type: "shutdown" }, "shutdown-ok")
  }

  private sendLoaderRequest<T extends ServerMessage>(message: LoaderMessage, responseMessageType: T["type"]): Promise<T> {
    return new Promise((resolve) => {
      const listener = (message: T) => {
        if (message.type === responseMessageType) {
          resolve(message)
        }
      }

      this.loader.once("message", listener)
      this.loader.postMessage(message)
    })
  }
}

export const viteTranspiler = new ViteTranspiler()