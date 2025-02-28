import { PluginOption, ViteDevServer, createServer } from "vite";
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
        hmr: false
      },
      plugins: [
        defaultPagePlugin()
      ]
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

function defaultPagePlugin(): PluginOption {
  return {
    name: "best-behavior",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.originalUrl === "/@best-behavior") {
          res.writeHead(200, { 'Content-Type':'text/html'});
          res.end(`<html><head><link rel="shortcut icon" href="data:," /></head><body></body></html>`);
        }
        else {
          next()
        }
      })
    }
  }
}