import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Règle liée au React Compiler (non activé ici). Les chargements de
      // données au montage (dashboard, uploads, réinitialisation de brouillon)
      // sont intentionnels et déjà protégés contre les courses.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "generated/**", "scripts/**", "next-env.d.ts"]),
]);
