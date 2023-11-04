import { ViteDevServer, createServer } from "vite";
import { LocalServer } from "./localServer.js";
import { Transpiler } from "./transpiler.js";

export interface ViteLocalServerOptions {
  viteConfigPath: string | undefined
}

export class ViteLocalServer implements LocalServer, Transpiler {
  private server: ViteDevServer | undefined;
  
  constructor(private options: ViteLocalServerOptions) { }

  async start(): Promise<void> {
    this.server = await createServer({
      configFile: this.options.viteConfigPath,
      // root: "../",
      // server: {
        // port: 5957
      // },
      server: {
        hmr: false
      },
      optimizeDeps: {
        // Note that for this we need to use the behaviors path ...
        include: [ "./**/*.behavior.ts" ]
      },
      // plugins: [
        // tsConfigPaths()
      // ],
      // css: {
        // postcss: "examples"
      // }
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
    return this.server?.ssrLoadModule(path)
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }

}