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
  },
});
