import path from "node:path";
import { defineConfig } from "vite";

// Config dédiée aux vérifications d'intégration backend (hors suite unitaire).
// - résout les alias du projet
// - stubbe "server-only" (marqueur Next non exécutable hors contexte serveur)
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
      "@generated": path.resolve(__dirname, "../generated"),
      "server-only": path.resolve(__dirname, "server-only-stub.ts"),
    },
  },
});