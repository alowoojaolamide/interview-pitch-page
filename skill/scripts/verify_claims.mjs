#!/usr/bin/env node
// QA gate: block a pitch page that states numbers or results nobody has sourced.
//
//   node verify_claims.mjs --content content.json --profile profile.json [--research research.json]
//
// Checks
//  1. Every number in the page text appears in the profile's claims, the research facts, or content.meta.allowNumbers.
//  2. No result language (percent changes, "increased", "boosted", ...) unless sourced.
//  3. No term listed in profile.forbid_terms.
//  4. Images are https and come from profile.assets_base (or are listed in content.meta.allowHosts).
//  5. Ledger rows: "label" is a known evidence label, and honest-gap rows carry no label.
//
// Exit code 1 when anything fails. Warnings never fail the run.

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(`--${k}`); return i === -1 ? undefined : args[i + 1]; };
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
if (!get("content") || !get("profile")) { console.error("usage: verify_claims.mjs --content c.json --profile p.json [--research r.json]"); process.exit(2); }

const content = read(get("content"));
const profile = read(get("profile"));
const research = get("research") ? read(get("research")) : { sources: [] };

const strings = [];
(function walk(v, key) {
  if (typeof v === "string") { if (!/^(https?:|mailto:)/.test(v) && !["src", "href", "url"].includes(key)) strings.push({ key, v }); }
  else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "allowNumbers" || k === "allowHosts" || k === "slug" || k === "expires" || k === "theme") continue; walk(x, k); }
})(content, "");

const STRIP_TIMES = /\b\d{1,2}(:\d{2})?(\s?(to|-|–)\s?\d{1,2}(:\d{2})?)?\s?(am|pm)\b/gi;
const NUM = /\$?\d[\d,]*(?:\.\d+)?\s?(?:%|k|K|x|bn|M)?/g;
const norm = (t) => t.replace(/[\s,]/g, "").toLowerCase();
const numbers = (s) => (s.replace(STRIP_TIMES, " ").match(NUM) || []).map(norm).filter((n) => !/^0\d$/.test(n));

const corpusText = [
  ...(profile.claims || []).map((c) => c.text),
  ...(profile.gaps || []),
  ...(research.sources || []).flatMap((s) => s.facts || []),
  ...((content.meta && content.meta.allowNumbers) || []).map(String),
].join(" \n ");
const known = new Set(numbers(corpusText));
const knownLoose = new Set([...known].map((n) => n.replace(/[^\d.]/g, "")));

const fails = [], warns = [];
for (const { key, v } of strings) {
  for (const n of numbers(v)) {
    const loose = n.replace(/[^\d.]/g, "");
    if (!known.has(n) && !knownLoose.has(loose)) fails.push(`unsourced number "${n}" in ${key}: ${v.slice(0, 90)}…`);
  }
  if (/\d\s?%/.test(v) && !known.has(norm((v.match(/\d[\d.]*\s?%/) || [""])[0]))) fails.push(`percentage in ${key}: ${v.slice(0, 90)}…`);
  if (/\b(increased|boosted|grew|improved|reduced|lifted|doubled|tripled|uplift|roi)\b/i.test(v)) warns.push(`result language in ${key}: "${v.slice(0, 90)}…" (keep only if sourced)`);
  for (const t of profile.forbid_terms || []) if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(v)) fails.push(`forbidden term "${t}" in ${key}`);
}

const hosts = new Set([profile.assets_base, ...((content.meta && content.meta.allowHosts) || [])].filter(Boolean).map((u) => { try { return new URL(u).host; } catch { return u; } }));
(function imgs(v) {
  if (Array.isArray(v)) return v.forEach(imgs);
  if (v && typeof v === "object") {
    if (typeof v.src === "string") {
      try { const u = new URL(v.src); if (u.protocol !== "https:") fails.push(`image is not https: ${v.src}`); else if (hosts.size && !hosts.has(u.host)) warns.push(`image host not in allowlist: ${u.host}`); }
      catch { fails.push(`bad image url: ${v.src}`); }
      if (!v.alt) warns.push(`image without alt text: ${v.src}`);
      if (!v.w || !v.h) warns.push(`image without w and h (the page will jump as it loads, which breaks nav jumps): ${v.src}`);
    }
    Object.values(v).forEach(imgs);
  }
})(content);

const LABELS = ["public", "measured", "design", "judgement"];
const STRENGTH = ["done", "partial", "gap"];
const words = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
for (const r of (content.ledger && content.ledger.rows) || []) {
  if (r.strength && !STRENGTH.includes(r.strength)) fails.push(`row strength must be done, partial or gap: ${r.ask.slice(0, 60)}`);
  if (r.strength && r.strength !== "done" && !r.statusNote) warns.push(`row marked ${r.strength} should say why in statusNote: ${r.ask.slice(0, 60)}`);
  if (r.strength && (!r.didShort || !r.willShort)) warns.push(`needs-map row has no didShort/willShort (the page falls back to the long text): ${r.ask.slice(0, 60)}`);
  for (const k of ["didShort", "willShort"]) if (words(r[k]) > 20) warns.push(`${k} is ${words(r[k])} words; keep the on-screen line to about 15: ${r.ask.slice(0, 60)}`);
}
for (const r of (content.ledger && content.ledger.rows) || []) {
  if (r.gap && r.label) fails.push(`honest-gap row must not carry an evidence label: ${r.ask.slice(0, 60)}`);
  if (!r.gap && !LABELS.includes(r.label)) fails.push(`ledger row needs a label (${LABELS.join("/")}) or gap:true: ${r.ask.slice(0, 60)}`);
  if (!r.did || !r.will) fails.push(`ledger row needs did and will: ${r.ask.slice(0, 60)}`);
}
if (!(content.meta && content.meta.expires)) warns.push("meta.expires is empty; the build will default to 30 days");
if (!content.sources || !content.sources.length) warns.push("no sources listed");

// Voice lint: a page that keeps talking about its own sources reads like homework. Keep that to the footer.
const META = [/\byou asked\b/i, /\byour (role|job) (description|post|posting|ad)\b/i, /\bI read your\b/i, /\bfrom your (site|website|pages)\b/i, /\bpublic pages\b/i, /\byour words\b/i, /\bwhat I heard\b/i, /\bto test with you\b/i, /\byou wrote\b/i, /\byou said\b/i];
let metaHits = 0; const metaWhere = [];
for (const { key, v } of strings) { if (key === "fine") continue; for (const re of META) if (re.test(v)) { metaHits++; metaWhere.push(`${key}: "${v.slice(0, 70)}…"`); } }
if (metaHits > 3) warns.push(`voice: ${metaHits} lines talk about the sources or the job post (limit about 3). Rewrite them as the candidate's own point of view and keep sourcing to the footer:\n        ${metaWhere.join("\n        ")}`);
let quoted = 0; for (const { v } of strings) quoted += (v.match(/[“"][^”"]{6,}[”"]/g) || []).length;
if (quoted > 12) warns.push(`voice: ${quoted} quoted passages; quote the company's words only to make a point (about five on a page).`);

if (content.scope) {
  const sc = content.scope, used = (sc.features || []).filter((f) => f.in).reduce((n, f) => n + (+f.hours || 0), 0), cap = sc.budget && +sc.budget.hours;
  if (cap && used > cap) fails.push(`scope: the default first loop is ${used} hours but the budget is ${cap}. Move something to "waits".`);
  else if (cap && used < cap * 0.8) warns.push(`scope: the default first loop uses only ${used} of ${cap} hours; leave about 5 to 15% room, not more.`);
  if (cap && (sc.features || []).filter((f) => !f.in).every((f) => used + (+f.hours || 0) <= cap)) warns.push("scope: nothing on the waits side overflows the budget; include at least one tempting item that does, so the trade-off shows.");
}
console.log(`checked ${strings.length} text fields`);
warns.forEach((w) => console.log(`warn  ${w}`));
fails.forEach((f) => console.log(`FAIL  ${f}`));
if (fails.length) { console.log(`\n${fails.length} problem(s). Fix the page, or add the source to the evidence bank.`); process.exit(1); }
console.log("claims check passed");
