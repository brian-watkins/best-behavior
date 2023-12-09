import { build } from "vite"
import fs from "fs"

await build({
  root: "./browserAdapter",
  base: "/dist/adapter",
  build: {
    outDir: "../dist/adapter",
    minify: true,
    emptyOutDir: true,
    lib: {
      entry: [
        "./src/behaviorAdapter.ts",
      ],
      formats: ["cjs"],
      fileName: (_, entry) => {
        return `${entry}.cjs`
      }
    }
  }
})

const sourceMapSupport = fs.readFileSync("./node_modules/source-map-support/browser-source-map-support.js")

fs.writeFileSync("./dist/adapter/sourceMapSupport.cjs", sourceMapSupport + "\nsourceMapSupport.install();")

