import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      "/rooms": {
        target: "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
    },
    historyApiFallback: true, // Fallback semua path ke index.html untuk dev server
  },
  // Fallback all paths to index.html for SPA
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
