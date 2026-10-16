// ESLint compartilhado dos pacotes Node (API, worker, contratos). A web usa eslint-config-next.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**", "src/generated/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Sem `consistent-type-imports`: a injeção de dependências do Nest precisa das classes
      // dos construtores importadas em runtime (emitDecoratorMetadata).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
