import path from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

// Config dédiée aux vérifications d'intégration backend (hors suite unitaire).
// - résout les alias du projet
// - stubbe "server-only" (marqueur Next non exécutable hors contexte serveur)
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "../src"),
      "@generated": path.resolve(root, "../generated"),
      "server-only": path.resolve(root, "server-only-stub.ts"),
    },
  },
});
