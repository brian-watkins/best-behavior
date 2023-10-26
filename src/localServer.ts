import { ViteDevServer, createServer } from "vite";
import { Transpiler } from "./serverValidator.js";

export class LocalServer implements Transpiler {
  private server: ViteDevServer | undefined;
  
  async start(): Promise<void> {
    this.server = await createServer({
      // root: "../",
      server: {
        port: 5957
      },
      optimizeDeps: {
        include: [ "./**/*.behavior.ts" ]
      }
      // plugins: [
        // tsConfigPaths()
      // ],
      // css: {
        // postcss: "examples"
      // }
    })
    
    await this.server.listen()
  }

  async loadModule(path: string): Promise<any> {
    return this.server?.ssrLoadModule(path)
  }

  async stop(): Promise<void> {
    await this.server?.close()
  }

}