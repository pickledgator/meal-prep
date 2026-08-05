import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      // The Hono server; Basic-auth headers pass through untouched. PORT is
      // shared with server/src/env.ts so `PORT=8788 pnpm dev` moves both ends
      // together (8080 is often taken by the trip-planning dev server).
      "/api": {
        target: `http://localhost:${process.env.PORT ?? 8080}`,
        changeOrigin: false,
      },
    },
  },
});
