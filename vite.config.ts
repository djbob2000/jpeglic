import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "./",
  root: "src/renderer",
  publicDir: "../../assets",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: false,
    rollupOptions: {
      input: "src/renderer/index.html",
    },
  },
  resolve: {
    alias: {
      "@": resolve("src"),
      "@renderer": resolve("src/renderer"),
      "@components": resolve("src/renderer/components"),
      "@hooks": resolve("src/renderer/hooks"),
      "@utils": resolve("src/renderer/utils"),
      "@constants": resolve("src/renderer/constants"),
      "@views": resolve("src/renderer/views"),
      "@styles": resolve("src/renderer/styles"),
      "@assets": resolve("src/renderer/assets"),
      "@common": resolve("src/common"),
      "@bindings": resolve("src/bindings"),
    },
  },
});
