/**
 * Entrada para a Shard Cloud (app Node).
 * A Shard instala as dependências e roda `node index.js`, sem etapa de build.
 * Este arquivo faz o build só quando o código ou as variáveis VITE_* mudaram,
 * e depois sobe o servidor já compilado (.output/server/index.mjs).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = join(root, ".output");
const serverEntry = join(outDir, "server", "index.mjs");
const stampFile = join(outDir, ".build-stamp");

function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, list);
    else list.push(`${full.slice(root.length)}:${st.size}:${Math.round(st.mtimeMs)}`);
  }
  return list;
}

function fingerprint() {
  const h = createHash("sha256");
  for (const f of ["package-lock.json", "vite.config.ts", "tsconfig.json"]) {
    if (existsSync(join(root, f))) h.update(readFileSync(join(root, f)));
  }
  for (const dir of ["src", "public"]) {
    if (existsSync(join(root, dir))) h.update(walk(join(root, dir)).sort().join("\n"));
  }
  for (const [k, v] of Object.entries(process.env).sort()) if (k.startsWith("VITE_")) h.update(`${k}=${v}`);
  return h.digest("hex");
}

const stamp = fingerprint();
const upToDate = existsSync(serverEntry) && existsSync(stampFile) && readFileSync(stampFile, "utf8") === stamp;

if (!upToDate) {
  console.log("[agendapoint] Gerando build de produção…");
  const started = Date.now();
  const result = spawnSync("npx", ["vite", "build"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=768`.trim() },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error("[agendapoint] O build falhou. Veja o log acima.");
    process.exit(result.status ?? 1);
  }
  writeFileSync(stampFile, stamp);
  console.log(`[agendapoint] Build pronto em ${Math.round((Date.now() - started) / 1000)}s.`);
} else {
  console.log("[agendapoint] Build já atualizado, iniciando.");
}

process.env.PORT ??= "80";
process.env.HOST ??= "0.0.0.0";
process.env.NODE_ENV = "production";
console.log(`[agendapoint] Servidor na porta ${process.env.PORT}.`);
await import(pathToFileURL(serverEntry).href);
