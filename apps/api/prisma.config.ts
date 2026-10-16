import path from "node:path";
import { defineConfig } from "prisma/config";
import { loadEnvFiles } from "./src/infrastructure/config/load-env";

loadEnvFiles();

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // `generate` não precisa de banco; migrations exigem DATABASE_URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
