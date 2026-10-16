#!/usr/bin/env node
// Cria o `.env` a partir do `.env.example` com uma senha aleatória para o PostgreSQL.
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const target = `${root}.env`;

if (existsSync(target)) {
  console.log(".env já existe; nada foi alterado.");
  process.exit(0);
}

copyFileSync(`${root}.env.example`, target);
const password = randomBytes(24).toString("base64url");
writeFileSync(target, readFileSync(target, "utf8").replaceAll("troque-esta-senha", password));
console.log(".env criado com senha aleatória para o PostgreSQL.");
