import { ViteDevServer, createServer } from "vite";
import { LocalServer } from "../localServer.js";

export interface ViteLocalServerOptions {
  viteConfig?: string
  behaviorGlobs?: Array<string>
}

export class ViteLocalServer implements LocalServer {
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
      },
    })

    await this.server.listen()
  }

  urlForPath(path: string): string {
    return new URL(path, this.host).href
  }

  get host(): string {
    return this.server?.resolvedUrls?.local[0] ?? ""
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }
}
