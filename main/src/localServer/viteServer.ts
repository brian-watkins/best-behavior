import { ViteDevServer, createServer } from "vite";
import { LocalServerContext } from "./context.js";

export interface ViteLocalServerOptions {
  viteConfig?: string
  behaviorGlobs?: Array<string>
}

export class ViteLocalServer {
  private server: ViteDevServer | undefined;

  constructor(private options: ViteLocalServerOptions = {}) { }

  async start(): Promise<void> {
    this.server = await createServer({
      configFile: this.options.viteConfig,
      optimizeDeps: {
        entries: this.options.behaviorGlobs,
        esbuildOptions: {
          logLevel: "silent"
        }
      },
      server: {
        hmr: false,
        headers: { 'Access-Control-Expose-Headers': 'SourceMap,X-SourceMap' }
      }
    })

    await this.server.listen()
  }

  getContext(): LocalServerContext {
    return new LocalServerContext(this.host, this.root)
  }

  get host(): string {
    return this.server?.resolvedUrls?.local[0] ?? ""
  }

  get root(): string {
    return this.server?.config.root ?? ""
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }
}
