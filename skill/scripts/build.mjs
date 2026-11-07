#!/usr/bin/env node
// Build one password-protected pitch page, or manage the output folder.
// Zero dependencies. Node 18+.
//
//   node build.mjs --content content.json --out ../site --slug acme --expires 2026-12-31 --favicon brand/favicon.png
//   PITCH_PASSWORD=... node build.mjs --content content.json --out ../site
//   node build.mjs --out ../site --revoke acme-k7q2
//   node build.mjs --out ../site --clean-expired
//   node build.mjs --gen-password name        # prints name-xxxx
//
// The password is read from the PITCH_PASSWORD environment variable (never from a file in this repo).
// The page text is encrypted (PBKDF2-SHA256 600k rounds, AES-256-GCM). Only ciphertext is deployed.

import { webcrypto, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tpl = join(here, "..", "template");
const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(`--${k}`); return i === -1 ? undefined : args[i + 1]; };
const has = (k) => args.includes(`--${k}`);
const die = (m) => { console.error(`error: ${m}`); process.exit(1); };

const ITER = 600_000;
const b64 = (buf) => Buffer.from(buf).toString("base64");
/** Case-insensitive and trimmed, so "Alex " and "alex" both work. Must match template/viewer.js. */
export const normalise = (p) => p.normalize("NFKC").trim().toLowerCase();

async function encrypt(plaintext, password) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const base = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(normalise(password)), "PBKDF2", false, ["deriveKey"]);
  const key = await webcrypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
}

const out = get("out") ? resolve(get("out")) : null;

if (has("gen-password")) {
  const base = (get("gen-password") || "page").toLowerCase().replace(/[^a-z0-9]/g, "") || "page";
  console.log(`${base}-${randomBytes(3).toString("hex").slice(0, 4)}`);
  process.exit(0);
}

if (has("revoke")) {
  if (!out) die("--out is required");
  const slug = get("revoke");
  if (!slug || slug.includes("/") || slug.includes("..")) die("bad slug");
  rmSync(join(out, slug), { recursive: true, force: true });
  console.log(`removed ${slug}. Redeploy to take it offline.`);
  process.exit(0);
}

if (has("clean-expired")) {
  if (!out || !existsSync(out)) die("--out is required");
  const today = new Date().toISOString().slice(0, 10);
  for (const d of readdirSync(out, { withFileTypes: true })) {
    const f = join(out, d.name, "expires.txt");
    if (d.isDirectory() && existsSync(f) && readFileSync(f, "utf8").trim() < today) {
      rmSync(join(out, d.name), { recursive: true, force: true });
      console.log(`removed expired page ${d.name}`);
    }
  }
  process.exit(0);
}

const contentPath = get("content");
if (!contentPath || !out) die("usage: build.mjs --content content.json --out <dir> [--slug s] [--expires YYYY-MM-DD]");
const password = process.env.PITCH_PASSWORD;
if (!password) die("set PITCH_PASSWORD in the environment (do not put it in a file)");
if (normalise(password).length < 6) die("password is too short (6+ characters)");

const content = JSON.parse(readFileSync(contentPath, "utf8"));
for (const k of ["meta", "hero", "close"]) if (!content[k]) die(`content.${k} is required`);
const base = (get("slug") || content.meta.slug || "page").toLowerCase().replace(/[^a-z0-9-]/g, "");
if (!base) die("slug is empty");
// An unguessable suffix keeps the URL itself private. Pass --exact-slug to skip it.
const slug = has("exact-slug") ? base : `${base}-${randomBytes(3).toString("hex").slice(0, 5)}`;
const expires = get("expires") || content.meta.expires || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
content.meta.expires = expires;

const payload = await encrypt(JSON.stringify(content), password);
const css = readFileSync(join(tpl, "viewer.css"), "utf8");
const js = readFileSync(join(tpl, "viewer.js"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const gate = content.meta.gate || {};
// The favicon is embedded before unlock so the tab looks like the candidate's own site even at the password screen.
let favicon = "";
if (get("favicon")) {
  const f = resolve(get("favicon"));
  const mime = { ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp" }[extname(f).toLowerCase()];
  if (!mime) die("--favicon must be .png, .svg, .ico or .webp");
  const buf = readFileSync(f);
  if (buf.length > 60_000) die("--favicon is over 60 KB; resize it (64 to 128 px is plenty)");
  favicon = `<link rel="icon" href="data:${mime};base64,${buf.toString("base64")}">`;
}
// Optional: load the candidate's fonts on the password screen too (these are not secret). Same names as content.theme.
let gateBrand = "";
if (gate.fontsHref) {
  if (!/^https:\/\/fonts\.googleapis\.com\//.test(gate.fontsHref)) die("meta.gate.fontsHref must be a Google Fonts URL");
  gateBrand += `<link rel="stylesheet" href="${esc(gate.fontsHref)}">`;
}
const vars = ["display", "body", "mono"].filter((k) => gate[k]).map((k) => `--${k}:${String(gate[k]).replace(/[;{}<]/g, "")}`).join(";");
if (vars) gateBrand += `<style>:root{${vars}}</style>`;
const prettyExpiry = new Date(expires + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const html = readFileSync(join(tpl, "viewer.html"), "utf8")
  .replace("{{GATE_EYEBROW}}", esc(gate.eyebrow || "Private"))
  .replace("{{GATE_TITLE}}", esc(gate.title || "A private page"))
  .replace("{{GATE_LINE}}", esc(gate.line || "Enter the password you were given."))
  .replace("{{TAB_TITLE}}", esc(gate.tabTitle || "Private"))
  .replace("{{FAVICON}}", () => favicon)
  .replace("{{GATE_BRAND}}", () => gateBrand)
  .replace("{{EXPIRES_PRETTY}}", esc(prettyExpiry))
  .replace("{{EXPIRES}}", esc(expires))
  .replace("/*{{CSS}}*/", () => css)
  .replace("/*{{JS}}*/", () => js)
  .replace("{{PAYLOAD}}", () => JSON.stringify({ ...payload, expires }).replace(/</g, "\\u003c"));

mkdirSync(join(out, slug), { recursive: true });
writeFileSync(join(out, slug, "index.html"), html);
writeFileSync(join(out, slug, "expires.txt"), expires + "\n");

// Shell files, written once.
const writeOnce = (name, body) => { const p = join(out, name); if (!existsSync(p)) writeFileSync(p, body); };
writeOnce("robots.txt", "User-agent: *\nDisallow: /\n");
writeOnce("index.html", '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private</title><body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;color:#555">This space is private.</body>');
writeOnce("vercel.json", JSON.stringify({
  cleanUrls: true,
  headers: [{ source: "/(.*)", headers: [
    { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Cache-Control", value: "no-store" },
  ] }],
}, null, 2) + "\n");

console.log(`built ${join(out, slug, "index.html")}`);
console.log(`path: /${slug}   expires: ${expires}`);
