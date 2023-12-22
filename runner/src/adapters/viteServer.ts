import { ViteDevServer, createServer } from "vite";
import { LocalServer } from "../localServer.js";
import { Transpiler } from "../transpiler.js";

export interface ViteLocalServerOptions {
  viteConfig?: string
  behaviorGlobs?: Array<string>
}

export class ViteTranspiler implements Transpiler {
  private server: ViteDevServer | undefined;

  async start(): Promise<void> {
    this.server = await createServer({
      optimizeDeps: {
        disabled: true
      },
      server: {
        host: false
      }
    })
  }

  async loadModule(path: string): Promise<any> {
    try {
      return this.server?.ssrLoadModule(`${path}`)
    } catch (err) {
      console.log("Got an error loading module", path, err)
    }
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }
}

export class ViteLocalServer implements LocalServer, Transpiler {
  private server: ViteDevServer | undefined;

  constructor(private options: ViteLocalServerOptions = {}) { }

  async start(): Promise<void> {
    this.server = await createServer({
      configFile: this.options.viteConfig,
      optimizeDeps: {
        entries: this.options.behaviorGlobs
      },
      server: {
        hmr: false,
        headers: { 'Access-Control-Expose-Headers': 'SourceMap,X-SourceMap' }
      }
    })

    await this.server.listen()
  }

  urlForPath(path: string): string {
    return new URL(path, this.host).href
  }

  get host(): string {
    return this.server?.resolvedUrls?.local[0] ?? ""
  }

  async loadModule(path: string): Promise<any> {
    try {
      return this.server?.ssrLoadModule(`${path}`)
    } catch (err) {
      console.log("Got an error loading module", path, err)
    }
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }

}
