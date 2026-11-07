#!/usr/bin/env node
// Generate the PRIVATE interview cue card from a page's own data. Zero dependencies.
//
//   node cue_card.mjs --content pages/acme/content.json --profile profile.json --out ~/pitch/cue-cards/acme \
//        --when "Tuesday 10 Nov, 1:00 to 1:30 pm Pacific (9:00 pm in your time zone)" [--name Sam] [--company "Acme Studio"]
//
// Writes cue-card.md (editable notes) and cue-card.html (16:9 slides: open in a browser and print to PDF, "Background graphics" on).
// Everything computed here (counts, hours, the scope click path) comes from content.json, so it never drifts from the page.
// The "say" lines are a scaffold in the candidate's voice: the agent rewrites them. Lines marked FILL IN need a human answer.
// The output is private. It refuses to write inside the public skill repo and must never be pushed or shown on screen.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf(`--${k}`); return i === -1 ? undefined : a[i + 1]; };
const die = (m) => { console.error("error: " + m); process.exit(1); };
if (!get("content") || !get("out")) die("usage: cue_card.mjs --content content.json [--profile profile.json] --out <dir> [--when text] [--name Them] [--company Co]");
const out = resolve(get("out"));
if (out.startsWith(resolve(here, "..", ".."))) die("write the cue card outside the public skill repo");
const c = JSON.parse(readFileSync(resolve(get("content")), "utf8"));
const prof = get("profile") ? JSON.parse(readFileSync(resolve(get("profile")), "utf8")) : { person: {}, claims: [], gaps: [], never_say: [] };
const name = get("name") || (c.meta && c.meta.for) || "them";
const company = get("company") || (c.meta && c.meta.title && c.meta.title.split("×").pop().trim()) || "the company";
const when = get("when") || "(add the date, time and time zones)";
const strip = (t) => String(t || "").replace(/\*\*?([^*]+)\*\*?/g, "$1");
const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mm = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/* ---------- facts computed from the page ---------- */
const rows = (c.ledger && c.ledger.rows) || [];
const state = (r) => (r.gap || r.strength === "gap" ? "gap" : r.strength === "partial" ? "partial" : "done");
const n = { done: 0, partial: 0, gap: 0 }; rows.forEach((r) => n[state(r)]++);
const gapRow = rows.find((r) => state(r) === "gap"), partRows = rows.filter((r) => state(r) === "partial");
const segs = (c.plan && c.plan.timeline && c.plan.timeline.segments) || [];
const hrs = { listen: 0, design: 0, eng: 0, mkt: 0 }; segs.forEach((s) => Object.keys(hrs).forEach((k) => (hrs[k] += +((s.hours || {})[k] || 0))));
const totalH = Object.values(hrs).reduce((x, y) => x + y, 0), designPct = totalH ? Math.round((hrs.design / totalH) * 100) : 0;
const sc = c.scope, B = sc && sc.budget, feats = (sc && sc.features) || [];
const used = feats.filter((f) => f.in).reduce((x, f) => x + (+f.hours || 0), 0);
const perWeek = B && B.weeks ? B.hours / B.weeks : 1;
const tempt = feats.filter((f) => !f.in).sort((x, y) => y.hours - x.hours).find((f) => B && used + f.hours > B.hours);
const over = tempt ? used + tempt.hours - B.hours : 0, lateWeeks = over ? Math.ceil(over / perWeek) : 0;

/* ---------- the run of show (about 15 minutes) ---------- */
const beats = [];
const add = (id, label, secs, say, doIt) => beats.push({ id, label, secs, say, doIt });
add("open", "Opening", 45, `I built this to show you how I think, not to read it to you. It is about fifteen minutes, then your questions.`, "Unlock, let the first screen sit for a breath.");
if (c.heard) add("heard", c.heard.nav || "My read", 90, (c.heard.items || []).map((i) => strip(i.headline || i.quote)).join(" · "), "Do not read the cards aloud. Pick the one she reacts to.");
if (c.story) {
  const ch = c.story.chapters || [];
  add("story", c.story.nav || "The proof", 270, `${strip(c.story.project || "")}: ${strip(c.story.intro || "")}`.trim(), `Walk the chapters with the side list. Spend longest on: ${ch.slice(1, 3).map((x) => x.title).join(" and ") || "the first two chapters"}.`);
}
if (rows.length) add("map", c.ledger.nav || "How I'd work", 120, `${rows.length} needs from the role: ${n.done} done, ${n.partial} partly${n.gap ? `, ${n.gap} honest gap` : ""}.` + (gapRow ? ` The gap is "${strip(gapRow.ask)}": ${strip(gapRow.statusNote || gapRow.didShort || "")}` : ""), `${gapRow ? `Click "${gapRow.ask}" on purpose. ` : ""}${partRows[0] ? `Then one "partly" tile ("${partRows[0].ask}") and say why.` : ""}`);
if (c.creative && (c.creative.items || []).length) add("brand", c.creative.nav || "Brand work", 45, `Because the role covers launch creative: ${(c.creative.items || []).slice(0, 4).map((i) => strip(i.caption)).join("; ")}.`, "Open one piece in the lightbox, then close it.");
if (segs.length) add("plan", c.plan.nav || "90 days", 165, `${totalH} hours in all, about ${designPct}% is design: the rest is listening, working with engineering and marketing.`, `Click ${segs.slice(0, 3).map((s) => s.weeks).join(", then ")}. At each stop name the call you need: ${segs.slice(0, 3).map((s) => `"${strip(s.decision || "")}"`).join("; ")}.`);
if (c.plan && c.plan.timeline && c.plan.timeline.next) add("next", "Next phase", 30, strip(c.plan.timeline.next.intro || ""), "Toggle once, show the horizons, toggle back.");
if (c.close) add("close", c.close.nav || "Why me", 60, (c.close.reasons || []).map((r) => strip(r.title)).join(" · "), "Scroll to the end and stop.");
add("hand", "Hand over", 15, "That is my fifteen minutes. What would you like to dig into?", sc ? "Do not open Scope yet. The button fades in at the end; point to it only if she asks." : "Stop talking.");
let t = 0; beats.forEach((b) => { b.at = t; t += b.secs; });
const totalSecs = t;

/* ---------- likely questions ---------- */
const qa = [];
qa.push(["Where are you based, and can you work with us?", "FILL IN: your honest answer on location, eligibility and overlap hours. Check the posting's rules and say it plainly. Ask early whether your situation is workable."]);
qa.push(["Hours and rate?", "State the hours you can give. Do not name a rate: ask what the budget is."]);
for (const r of [gapRow, ...partRows].filter(Boolean)) qa.push([`${state(r) === "gap" ? "Have you done" : "How much have you done of"}: ${strip(r.ask)}?`, `${strip(r.statusNote || "")} What carries over: ${strip(r.didShort || r.did || "")} First step: ${strip(r.willShort || r.will || "")}`.trim()]);
const measured = (prof.claims || []).filter((x) => x.label === "measured");
qa.push(["What results did you get?", measured.length ? `Only these dated figures: ${measured.map((x) => strip(x.text)).join(" | ")} Say you do not quote lifts you have not measured.` : "Say you do not quote lifts you have not measured. Use only dated figures from your evidence bank."]);
qa.push(["Team and leadership?", "FILL IN: one sentence on the team you lead or led, from your evidence bank. Nothing under NDA beyond what your portfolio already shows."]);
const asks = (c.ask && c.ask.items) || [];

/* ---------- scope-sheet click path ---------- */
const scopeSteps = sc ? [
  `Open Scope (press S, or tap the button). It starts at ${used} of ${B.hours} hours (${B.label || ""}).`,
  tempt ? `Tap "${tempt.name}" into the first loop. The meter goes over: "Over by ${over} hours, about ${lateWeeks} ${lateWeeks === 1 ? "week" : "weeks"} later." Say: "That is the kind of call I would want to make with you."` : "Move one waiting item into the first loop to show the trade-off.",
  "Tap it back out (or Reset). Point at the calls: " + ((sc.calls || []).map((q) => strip(q.q)).join("; ") || "none") + ".",
  "Offer to email it: the Send button opens a message with her choices already in it.",
] : [];

const dont = ["Do not mention any figure that is not on the page or in your evidence bank.", ...(prof.never_say || []).map((x) => "Never: " + x), "Do not open Full detail on the call; say it exists for afterwards.", "Pause after each screen: a CEO reads faster than you talk."];
const gaps = (prof.gaps || []);
const nextSteps = ["Eligibility and terms: confirm your situation is workable, and the hours and start date.", sc ? "A first small step: offer the one-page scope you just showed, built from what she said." : "A first small step: offer a one-page scope for the first piece of work.", "The decision: when will she decide, and who else should you talk to?"];

/* ---------- markdown ---------- */
const md = [];
md.push(`# Cue card: ${company}, ${name}`, `${when}. PRIVATE. Never on the shared page. Use a phone timer.`, "",
  "**Shape of the 30 minutes:** 15 you present, 10 her questions, 5 next steps.", `**Planned run of show:** ${mm(totalSecs)}${totalSecs > 900 ? " (over 15:00: cut a beat)" : ""}.`, "",
  "**Before the call:** test the page on the device you will share from, in a private window. Have the password ready (say it aloud). Close other tabs and notifications.", "",
  "## Part 1. Present", "", "| Clock | Section | Say (one idea) | Do |", "|---|---|---|---|");
beats.forEach((b) => md.push(`| ${mm(b.at)} | ${b.label} | ${b.say.replace(/\|/g, "/")} | ${b.doIt.replace(/\|/g, "/")} |`));
md.push("", "If you are behind at 8:00, skip Brand and the next phase. If ahead, spend the time on the proof.", "", "## Part 2. Her questions (10 minutes). Short, honest answers", "");
qa.forEach(([q, ans]) => md.push(`- **${q}** ${ans}`));
md.push("", "## Questions to ask her (pick two)", ...asks.map((x, i) => `${i + 1}. ${strip(x.q)}`), asks.length ? "Listen for: budget and hours, who the engineers are, how decisions are made." : "", "", "## Part 3. Next steps (5 minutes)", "");
if (scopeSteps.length) md.push("**Open the Scope button first (about 2 minutes):**", ...scopeSteps.map((s, i) => `${i + 1}. ${s}`), "");
md.push("Then ask for three things, in this order:", ...nextSteps.map((s, i) => `${i + 1}. ${s}`), `End with: "Thank you for your time today." Send the link and a two-line thank-you within an hour. Offer to refresh the page with what ${name} said.`, "", "## Do and do not", ...dont.map((x) => `- ${x}`), "", "## Your honest gaps (say \"I have not\")", ...(gaps.length ? gaps.map((x) => `- ${x}`) : ["- (none listed in your evidence bank)"]), "");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "cue-card.md"), md.join("\n"));

/* ---------- html slides ---------- */
const slide = (inner, cls = "") => `<section class="s ${cls}"><div class="in">${inner}</div></section>`;
const cards = (items) => `<div class="cards">${items.join("")}</div>`;
const card = (h, say, doIt) => `<article class="card"><p class="clock">${esc(h)}</p><p class="say">${esc(say)}</p>${doIt ? `<p class="do"><b>DO</b> ${esc(doIt)}</p>` : ""}</article>`;
const S = [];
S.push(slide(`<p class="eyebrow">Cue card · private</p><h1>${esc(company)},<br>${esc(name)}</h1><p class="lead">${esc(when)}</p>`, "title"));
const bar = `<div class="bar"><i style="flex:15">15 present</i><i style="flex:10">10 your questions</i><i style="flex:5">5 next steps</i></div>`;
S.push(slide(`<h2>The shape</h2>${bar}<ul class="big"><li>Test the page on the device you will share from.</li><li>Have the password ready, say it aloud.</li><li>Phone timer. Close tabs and notifications.</li></ul>`));
S.push(slide(`<h2>The clock</h2><table>${beats.map((b) => `<tr><td class="t">${mm(b.at)}</td><td>${esc(b.label)}</td><td class="m">${esc(mm(b.secs))}</td></tr>`).join("")}<tr class="sum"><td class="t">${mm(totalSecs)}</td><td>Total</td><td></td></tr></table>`));
for (let i = 0; i < beats.length; i += 2) S.push(slide(`<h2>What to say</h2>${cards(beats.slice(i, i + 2).map((b) => card(`${mm(b.at)}  ${b.label}`, b.say, b.doIt)))}`));
for (let i = 0; i < qa.length; i += 3) S.push(slide(`<h2>Her questions ${Math.floor(i / 3) + 1} of ${Math.ceil(qa.length / 3)}</h2><div class="qa">${qa.slice(i, i + 3).map(([q, ans]) => `<div><p class="q">${esc(q)}</p><p class="a">${esc(ans)}</p></div>`).join("")}</div>`));
if (asks.length) S.push(slide(`<h2>Ask her two of these</h2><ol class="big">${asks.map((x) => `<li>${esc(strip(x.q))}</li>`).join("")}</ol><p class="listen"><b>Listen for</b> budget and hours, who the engineers are, how decisions are made.</p>`));
if (scopeSteps.length) S.push(slide(`<h2>Scope: open it first</h2><ol class="big">${scopeSteps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`));
S.push(slide(`<h2>Next steps</h2><ol class="big">${nextSteps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p class="lead">"Thank you for your time today."</p>`));
S.push(slide(`<h2>Do, do not, after</h2><div class="three"><div><h3>Do not</h3><ul>${dont.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h3>Say "I have not"</h3><ul>${(gaps.length ? gaps : ["(none listed)"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h3>After</h3><ul><li>Thank-you within an hour, with one specific thing she said.</li><li>Refresh the page with her feedback.</li><li>Revoke any access tokens you created.</li></ul></div></div>`));
const css = `@page{size:1920px 1080px;margin:0}*{box-sizing:border-box}body{margin:0;background:#050912;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#eef1f8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{width:1920px;height:1080px;padding:96px 120px;background:#0b1328;position:relative;overflow:hidden;page-break-after:always;break-after:page;margin:0 auto 24px}
@media print{.s{margin:0}body{background:none}}
.s:after{content:"PRIVATE";position:absolute;right:120px;top:48px;font-size:20px;letter-spacing:.2em;color:#ffb020;opacity:.7}
h1{font-size:150px;line-height:1;margin:0;letter-spacing:-.03em}h2{font-size:68px;margin:0 0 36px;letter-spacing:-.02em}h3{font-size:36px;margin:0 0 20px;color:#ffb020}
.eyebrow{font-size:28px;letter-spacing:.2em;text-transform:uppercase;color:#ffb020;margin:0 0 40px}.lead{font-size:56px;margin:48px 0 0;color:#c9d2e6}
.title{display:flex;flex-direction:column;justify-content:center}
.bar{display:flex;gap:12px;margin:0 0 56px}.bar i{font-style:normal;font-size:44px;padding:36px;border-radius:24px;background:#16213f}.bar i:first-child{background:#ffb020;color:#0b1328;font-weight:700}
ul.big,ol.big{font-size:46px;line-height:1.3;padding-left:1.1em;margin:0}ul.big li,ol.big li{margin:0 0 28px}
table{width:100%;border-collapse:collapse;font-size:42px}td{padding:12px 0;border-bottom:1px solid #26335a}td.t{width:200px;color:#ffb020;font-variant-numeric:tabular-nums}td.m{text-align:right;color:#8e9bbd}.sum td{font-weight:700;border:0}
.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:32px}.card{background:#121c38;border-radius:28px;padding:44px;display:flex;flex-direction:column;gap:28px;min-height:620px}.clock{font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:#ffb020;margin:0}.say{font-size:42px;line-height:1.28;margin:0;flex:1}.do{font-size:30px;line-height:1.3;color:#aab6d3;margin:0}.do b{color:#ffb020;margin-right:12px}
.qa{display:grid;gap:22px}.qa div{background:#121c38;border-radius:22px;padding:26px 36px}.q{font-size:38px;font-weight:700;margin:0 0 8px}.a{font-size:30px;line-height:1.3;margin:0;color:#c9d2e6}
.listen{font-size:36px;color:#aab6d3;margin-top:40px}.listen b{color:#ffb020}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}.three ul{font-size:34px;line-height:1.3;padding-left:1em;margin:0}.three li{margin-bottom:16px}`;
writeFileSync(join(out, "cue-card.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Cue card (private)</title><style>${css}</style></head><body>${S.join("\n")}<script>function fit(){document.querySelectorAll(".s").forEach(function(s){var n=s.querySelector(".in");n.style.zoom=1;var k=1;while(s.scrollHeight>s.clientHeight+2&&k>0.5){k-=0.04;n.style.zoom=k.toFixed(2)}})}window.addEventListener("load",fit);window.addEventListener("beforeprint",fit)</script></body></html>`);
console.log(`wrote ${join(out, "cue-card.md")}\nwrote ${join(out, "cue-card.html")}  (${S.length} slides; open it in a browser and print to PDF with background graphics on)\nplanned run of show: ${mm(totalSecs)}${totalSecs > 900 ? "  <-- over 15:00, cut a beat" : ""}\nlines marked FILL IN need your own answer. The output is private: do not push or screen-share it.`);
