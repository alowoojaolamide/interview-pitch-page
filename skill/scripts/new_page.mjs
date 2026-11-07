#!/usr/bin/env node
// Start a new pitch page from the full-featured example. Zero dependencies.
//   node new_page.mjs --workspace ~/pitch --slug acme
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf(`--${k}`); return i === -1 ? undefined : a[i + 1]; };
const ws = get("workspace") && resolve(get("workspace")), slug = (get("slug") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
if (!ws || !slug) { console.error("usage: new_page.mjs --workspace <dir> --slug <company>"); process.exit(1); }
const dir = join(ws, "pages", slug), file = join(dir, "content.json");
if (existsSync(file)) { console.error(`${file} already exists; not overwriting`); process.exit(1); }
mkdirSync(dir, { recursive: true });
const c = JSON.parse(readFileSync(join(here, "..", "examples", "acme", "content.json"), "utf8"));
c.meta.slug = slug; c.meta.title = "Candidate × " + slug; c.meta.for = "Name";
writeFileSync(file, JSON.stringify(c, null, 2) + "\n");
const rf = join(ws, "research", `${slug}.json`);
if (!existsSync(rf)) writeFileSync(rf, JSON.stringify({ company: slug, fetchedAt: new Date().toISOString().slice(0, 10), sources: [] }, null, 2) + "\n");
console.log(`created ${file}\ncreated ${rf}\nEvery placeholder in the page is fictional. Replace all of it with this candidate's real evidence, then run:
  node ${join(here, "verify_claims.mjs")} --content ${file} --profile ${join(ws, "profile.json")} --research ${rf}`);
