import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      "@generated": path.resolve(root, "./generated"),
      // Marqueur Next non exécutable hors contexte serveur : stub pour les tests.
      "server-only": path.resolve(root, "./scripts/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
