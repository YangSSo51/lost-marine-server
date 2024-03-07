import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  ssr: {
    noExternal: ["typedi"]
  },
  plugins: [
    ...VitePluginNode({
      adapter: "express",
      appPath: "./src/server.ts",
      exportName: "viteNodeApp",
      initAppOnBoot: true,
      tsCompiler: "esbuild",
      swcOptions: {}
    }),
    tsconfigPaths()
  ],
  optimizeDeps: {}
});
