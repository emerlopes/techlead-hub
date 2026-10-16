import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC emite os metadados de decorators que a injeção de dependência do Nest exige.
const plugins = [swc.vite({ module: { type: "es6" } })];

export default defineConfig({
  test: {
    projects: [
      {
        plugins,
        test: { name: "unit", include: ["src/**/*.test.ts"], environment: "node" },
      },
      {
        plugins,
        test: {
          name: "integration",
          include: ["test/**/*.int-test.ts"],
          environment: "node",
          globalSetup: ["test/global-setup.ts"],
          // Os testes compartilham um banco: arquivos rodam em sequência.
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
