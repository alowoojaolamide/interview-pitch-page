#!/usr/bin/env node
// One-time setup of the candidate's PRIVATE workspace. Zero dependencies.
//   node init_workspace.mjs ~/pitch
// Creates profile.json (from the example), pages/, research/, brand/ and a deploy folder with the right ignore file.
// The workspace must live OUTSIDE the public skill repo and must never be committed anywhere public.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
const writeOnce = (p, body) => { if (!existsSync(p)) writeFileSync(p, body); };
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
if (!target) { console.error("usage: init_workspace.mjs <workspace-dir>"); process.exit(1); }
const ws = resolve(target);
if (ws.startsWith(resolve(here, "..", ".."))) { console.error("error: put the workspace outside the skill repo"); process.exit(1); }

for (const d of ["pages", "research", "brand", "assets", "pitch-pages"]) mkdirSync(join(ws, d), { recursive: true });
const profile = join(ws, "profile.json");
if (!existsSync(profile)) copyFileSync(join(here, "..", "examples", "profile.example.json"), profile);
writeOnce(join(ws, "pitch-pages", ".vercelignore"), ".env*\n.vercel\nexpires.txt\n");
writeOnce(join(ws, ".gitignore"), "*\n");
writeOnce(join(ws, "brand", "README.txt"), "Put the candidate's favicon here as favicon.png (64 to 128 px, under 60 KB), plus any brand notes.\n");
console.log(`workspace ready: ${ws}
next:
  1. edit ${join(ws, "profile.json")}: real, confirmed facts only (see references/profile.md)
  2. save a favicon at ${join(ws, "brand", "favicon.png")}
  3. node ${join(here, "new_page.mjs")} --workspace ${ws} --slug <company>`);
