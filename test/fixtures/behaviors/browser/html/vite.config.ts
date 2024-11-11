import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: [
      "monocart-coverage-reports"
    ]
  }
})