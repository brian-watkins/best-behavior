import { build } from "vite"

await build({
  root: "./browserAdapter",
  base: "/dist/adapter",
  build: {
    outDir: "../dist/adapter",
    emptyOutDir: true,
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "browserAdapter"
    }
  }
})