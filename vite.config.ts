import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "./",
  publicDir: resolve(__dirname, "assets"),
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/renderer/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@renderer": resolve(__dirname, "src/renderer"),
      "@components": resolve(__dirname, "src/renderer/components"),
      "@hooks": resolve(__dirname, "src/renderer/hooks"),
      "@utils": resolve(__dirname, "src/renderer/utils"),
      "@constants": resolve(__dirname, "src/renderer/constants"),
      "@views": resolve(__dirname, "src/renderer/views"),
      "@styles": resolve(__dirname, "src/renderer/styles"),
      "@assets": resolve(__dirname, "src/renderer/assets"),
      "@common": resolve(__dirname, "src/common"),
    },
  },
});
