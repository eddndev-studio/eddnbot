import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [TanStackRouterVite({ quoteStyle: "double" }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/admin": "http://localhost:3001",
      "/health": "http://localhost:3001",
      "/ai": "http://localhost:3001",
      "/whatsapp": "http://localhost:3001",
      "/quotas": "http://localhost:3001",
      "/conversations": "http://localhost:3001",
      "/usage": "http://localhost:3001",
    },
  },
});
