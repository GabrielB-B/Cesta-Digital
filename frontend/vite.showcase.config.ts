import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-showcase",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./showcase/index.html", import.meta.url)),
    },
  },
});
