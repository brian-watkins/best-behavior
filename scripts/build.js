import { build } from "vite"

await build({
  root: "./browserAdapter",
  base: "/dist/adapter",
  build: {
    outDir: "../dist/adapter",
    minify: true,
    emptyOutDir: true,
    lib: {
      entry: "./src/index.ts",
      formats: ["cjs"],
      fileName: "browserAdapter"
    }
  }
})