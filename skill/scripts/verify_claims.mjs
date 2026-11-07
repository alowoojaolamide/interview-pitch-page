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
    }
    Object.values(v).forEach(imgs);
  }
})(content);

const LABELS = ["public", "measured", "design", "judgement"];
for (const r of (content.ledger && content.ledger.rows) || []) {
  if (r.gap && r.label) fails.push(`honest-gap row must not carry an evidence label: ${r.ask.slice(0, 60)}`);
  if (!r.gap && !LABELS.includes(r.label)) fails.push(`ledger row needs a label (${LABELS.join("/")}) or gap:true: ${r.ask.slice(0, 60)}`);
  if (!r.did || !r.will) fails.push(`ledger row needs did and will: ${r.ask.slice(0, 60)}`);
}
if (!(content.meta && content.meta.expires)) warns.push("meta.expires is empty; the build will default to 30 days");
if (!content.sources || !content.sources.length) warns.push("no sources listed");

console.log(`checked ${strings.length} text fields`);
warns.forEach((w) => console.log(`warn  ${w}`));
fails.forEach((f) => console.log(`FAIL  ${f}`));
if (fails.length) { console.log(`\n${fails.length} problem(s). Fix the page, or add the source to the evidence bank.`); process.exit(1); }
console.log("claims check passed");
