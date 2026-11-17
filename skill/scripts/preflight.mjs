#!/usr/bin/env node
// Eligibility gate. Run BEFORE any research or build. Zero dependencies.
//
//   node preflight.mjs --jd job-description.txt [--country "your country"]
//
// Scans the pasted job description for location and work-authorisation rules that no page can overcome.
// Exit 0 = nothing found. Exit 3 = a hard blocker: stop, tell the user, and ask the company one plain question before building anything.

import { readFileSync } from "node:fs";
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf(`--${k}`); return i === -1 ? undefined : a[i + 1]; };
if (!get("jd")) { console.error("usage: preflight.mjs --jd job-description.txt [--country "your country"]"); process.exit(2); }
const t = readFileSync(get("jd"), "utf8"), country = get("country") || "the candidate's country";
const HARD = [
  [/\b(us|u\.s\.|united states)[- ]?(only|based|residents?|citizens?)\b/i, "US-only or US-based"],
  [/\bmust (be )?(based|located|reside|live) in the (us|u\.s\.|united states)\b/i, "must be based in the US"],
  [/\bno (visa )?sponsorship\b|\bwill not sponsor\b|\bunable to sponsor\b/i, "no visa sponsorship"],
  [/\b(authori[sz]ed|eligible|legally permitted) to work in the (us|u\.s\.|united states)\b/i, "must be authorised to work in the US"],
  [/\bremote[^.]{0,40}\b(us|u\.s\.|united states)[- ]?(only|based)\b/i, "remote but US-only"],
  [/\bw-?2\b/i, "US payroll (W-2)"],
];
const SOFT = [
  [/\b(pacific|eastern|central|mountain|pst|est|cst|pt|et)\b[^.]{0,30}\b(time|hours|overlap|preferred|required)\b/i, "a time-zone preference"],
  [/\bsecurity clearance\b|\bbackground check\b/i, "a clearance or background check"],
  [/\bon-?site\b|\bhybrid\b|\bin[- ]office\b/i, "on-site or hybrid work"],
];
const hard = HARD.filter(([re]) => re.test(t)).map(([, m]) => m), soft = SOFT.filter(([re]) => re.test(t)).map(([, m]) => m);
if (soft.length) console.log(`note   soft constraint(s): ${soft.join("; ")}. Plan for them on the page.`);
if (!hard.length) { console.log("preflight passed: no hard location or work-authorisation rule found. Still confirm the company will contract outside its own country if the user is abroad."); process.exit(0); }
console.log(`STOP   hard blocker(s): ${hard.join("; ")}`);
console.log(`\nA page cannot fix a rule. Before building anything:\n  1. Tell the user plainly what the posting says.\n  2. Suggest one question to the recruiter: "Is a contractor based in ${country} workable for this role?"\n  3. Build only if the user hears yes, or tells you to go ahead anyway knowing the risk.\n  4. If they go ahead, put a clear "where I am and how it works" answer on the page (the 'hire' section).`);
process.exit(3);
