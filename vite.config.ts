import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/upload-video": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api/file": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api/upload": {
        target: "https://kolibri-fabrik.vercel.app",
        changeOrigin: true,
        secure: true,
      },
      "/api/message": {
        target: "https://kolibri-fabrik.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
