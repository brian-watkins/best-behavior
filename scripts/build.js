import { build } from "vite"

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
        "./src/displayAdapter.ts"
      ],
      formats: ["cjs"],
      fileName: (_, entry) => {
        return `${entry}.cjs`
      }
    }
  }
})