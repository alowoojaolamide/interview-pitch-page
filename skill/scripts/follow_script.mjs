#!/usr/bin/env node
// Word-for-word PRIVATE follow script that goes screen by screen with the pitch page. Zero dependencies.
//
//   1. node follow_script.mjs --init  --content pages/acme/content.json [--profile profile.json] --out ~/pitch/cue-cards/acme
//        writes follow-script.json: one section per page screen, in page order, plus a "How I use AI" section and AI Q&A.
//        Lines marked TODO or FILL IN are not finished.
//   2. The agent rewrites every TODO in the candidate's own voice (short sentences, one idea per line); the user answers FILL INs.
//   3. node follow_script.mjs --render --script ~/pitch/cue-cards/acme/follow-script.json [--pdf]
//        writes follow-script.md and follow-script.html (and .pdf with --pdf when python3 + playwright exist; else print the html).
//
// Private: it refuses to write inside the public skill repo, and refuses to render while any TODO remains.

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
function realish(p) {
  let cur = resolve(p), rest = [];
  while (!existsSync(cur)) { rest.unshift(cur.slice(cur.lastIndexOf(sep) + 1)); const up = dirname(cur); if (up === cur) break; cur = up; }
  return join(realpathSync(cur), ...rest);
}
const isInside = (c, p) => c === p || c.startsWith(p + sep);
const repo = realpathSync(resolve(here, "..", ".."));
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf(`--${k}`); return i === -1 ? undefined : a[i + 1]; }, has = (k) => a.includes(`--${k}`);
const die = (m) => { console.error("error: " + m); process.exit(1); };
const strip = (t) => String(t || "").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

if (has("init")) {
  if (!get("content") || !get("out")) die("usage: follow_script.mjs --init --content content.json [--profile profile.json] --out <dir>");
  const out = realish(get("out")); if (isInside(out, repo)) die("write the follow script outside the public skill repo");
  const c = JSON.parse(readFileSync(resolve(get("content")), "utf8"));
  const prof = get("profile") ? JSON.parse(readFileSync(resolve(get("profile")), "utf8")) : { claims: [] };
  const aiClaims = (prof.claims || []).filter((x) => /\bAI\b|assistant|machine|model|automat/i.test(x.text || "")).map((x) => `${x.project}: ${x.text}`);
  const S = []; const sec = (name, doIt, say, cue) => S.push({ time: "", name, do: doIt, say, cue: cue || "Pause. Let them look." });
  const T = (hint) => `TODO (your voice): ${hint}`;
  sec("Opening", "Unlock the page. Let the first screen sit for a breath.", [T("thank them, say it is about fifteen minutes then their questions, invite them to stop you anywhere")]);
  if (c.heard) sec(c.heard.nav || "My read", "Do not read the cards. Pick the one they react to.", [...(c.heard.items || []).map((i) => T(strip(i.headline) + " -> " + strip(i.note))), "Which of those sounds most like your week right now?"], "Stop and let them answer. Follow them.");
  if (c.story) {
    sec(`${c.story.nav || "The proof"}: ${strip(c.story.big || "")}`.trim(), "Scroll the chapters with the side list.", [T(strip(c.story.intro)), ...(c.story.chapters || []).filter((ch) => (ch.body || []).length).map((ch) => T(`${strip(ch.title)} ${strip((ch.body || [])[0])}`.slice(0, 220))), ...(c.story.chapters || []).filter((ch) => ch.stat).map((ch) => T(`state the number exactly as sourced: ${ch.stat.value} ${strip(ch.stat.label)}`))], "Spend longest on the chapters closest to the role.");
  }
  S.push({ time: "", name: "How I use AI", do: "Stay on the proof screen. Look at them, not the screen.", cue: "30-second version if short on time: Side one, Side two, and the last paragraph.", say: [
    "Before I show you the plan, I want to say how I use AI, because it is part of how I would work with you.",
    "There are two sides to it.",
    T("Side one: AI inside products you designed. Use only these evidenced items: " + (aiClaims.join(" | ") || "none found in profile.json; add real ones or cut this side") + ". State the design rule it follows (show its work, ask before helping, undoable)."),
    T("Side two: AI inside your own work. Say it is a fast collaborator for drafting, prototyping and checking. Say this page was built with an AI coding assistant under a rule that every claim comes from your evidence file and an unsourced number stops the build (true of this skill). Add one tool you really use: FILL IN"),
    "My rules are simple. I own every word and every decision. I check what it gives me. FILL IN: confirm you keep client work under NDA and sensitive data out of general tools; delete this sentence if it is not true.",
    T("tie to the company's own promise and any sensitive subject in their product; propose rules to agree with them, do not claim rules they have not set"),
    "So: AI for speed behind the scenes, never as the voice they hear. Does that match how you think about it?" ] });
  if (c.ledger) sec(c.ledger.nav || "How I'd work", "Click the honest gap first, then one partly tile.", [T("count done / partly / gap from the map; name the gap and the first step; one partly and why"), "I would rather tell you that now than have you find it later."], "Pause after the gap. Let them react.");
  if (c.creative) sec(c.creative.nav || "Brand work", "Open one piece in the lightbox, close it.", [T("one or two sentences on the brand and launch work and why the role needs it")], "Thirty seconds. Keep moving.");
  const segs = (c.plan && c.plan.timeline && c.plan.timeline.segments) || [];
  if (segs.length) sec(c.plan.nav || "The plan", "Click the first, middle and last stops. Name one decision you need from them at each.", [T("one line on the shape of the plan and total hours, then per stop: " + segs.map((s) => `${s.weeks}: ${strip(s.title)} (decision: ${strip(s.decision || "")})`).join(" / ")), T("rhythm: updates, demo, blockers; say you would tune it in week one")], "One decision per stop. Do not read the bullets.");
  if (c.ask) sec("Questions I'd ask", "Skip unless time allows.", [T("pick two of: " + (c.ask.items || []).map((i) => strip(i.q)).join(" | "))], "Optional.");
  if (c.close) sec(c.close.nav || "Why me", "Scroll to the end. Stop.", [T((c.close.reasons || []).map((r) => strip(r.title)).join(" / ")), "That is my fifteen. What would you like to dig into?"], "STOP TALKING. Let them speak first.");
  const qa = [
    { q: "Will you use AI on our work?", a: T("behind the scenes for speed; never the voice a member or customer hears; agree rules with them first; extra care for sensitive subjects") },
    { q: "Do you trust AI output?", a: T("no, you check it; give the unsourced-number-stops-the-build example from this page") },
    { q: "What AI tools do you use?", a: "FILL IN: your real list in one sentence. Name only tools you actually use." },
    { q: "Isn't AI personalisation risky for our users?", a: T("design the 'why am I seeing this' and 'show me less' controls first; personalisation earns trust when it can be seen and steered") } ];
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "follow-script.json"), JSON.stringify({ title: `Follow script: ${(c.meta && c.meta.title) || ""}`, note: "PRIVATE. Read in your own voice. Times are a guide.", sections: S, qa }, null, 2));
  console.log(`wrote ${join(out, "follow-script.json")} (${S.length} sections). Rewrite every TODO, answer every FILL IN, add time marks, then --render.`);
  process.exit(0);
}

if (has("render")) {
  if (!get("script")) die("usage: follow_script.mjs --render --script follow-script.json [--pdf]");
  const sp = realish(get("script")); if (isInside(sp, repo)) die("keep the follow script outside the public skill repo");
  const d = JSON.parse(readFileSync(sp, "utf8"));
  const todo = [...d.sections.flatMap((s) => s.say), ...(d.qa || []).map((x) => x.a)].filter((x) => /^TODO/.test(x)).length;
  if (todo) die(`${todo} TODO line(s) left. Rewrite them in the candidate's voice first.`);
  const fill = [...d.sections.flatMap((s) => s.say), ...(d.qa || []).map((x) => x.a)].filter((x) => /FILL IN/.test(x)).length;
  const md = [`# ${d.title}\n${d.note}\n`];
  d.sections.forEach((s) => { md.push(`\n## ${s.time ? s.time + "  " : ""}${s.name}\n*Do:* ${s.do}\n`); s.say.forEach((x) => md.push(`> ${x}\n`)); md.push(`*Cue:* ${s.cue}\n`); });
  md.push("\n## If they ask about AI\n"); (d.qa || []).forEach((x) => md.push(`**${x.q}** ${x.a}\n`));
  const mk = (t) => esc(t).replace(/FILL IN/g, "<mark>FILL IN</mark>");
  const body = d.sections.map((s) => `<section class="s${s.name === "How I use AI" ? " ai" : ""}"><div class="top"><span class="t">${esc(s.time)}</span><span class="n">${esc(s.name)}</span></div><p class="do">Do: ${esc(s.do)}</p>${s.say.map((x) => `<p class="say">${mk(x)}</p>`).join("")}<p class="cue">${esc(s.cue)}</p></section>`).join("") + `<section class="s ai"><div class="top"><span class="n">If they ask about AI</span></div>${(d.qa || []).map((x) => `<p class="q">${esc(x.q)}</p><p class="say">${mk(x.a)}</p>`).join("")}</section>`;
  const css = `body{margin:0;background:#faf7f2;color:#1b1b1b;font:22px/1.5 system-ui,sans-serif}.s{max-width:900px;margin:0 auto;padding:40px 32px;border-bottom:1px solid #ddd;break-after:page}.top{display:flex;gap:16px;align-items:baseline}.t{font:600 18px ui-monospace,monospace;color:#c4501a}.n{font:800 34px system-ui,sans-serif}.do{font-size:17px;color:#666}.say{font-size:26px;margin:.7em 0}.cue{font-size:17px;color:#c4501a;font-weight:600}.q{font-weight:700;margin-top:1.2em}.ai{background:#fff3e8}mark{background:#ffd9a8}@media print{@page{size:A4;margin:14mm}body{font-size:15px}.say{font-size:19px}.s{padding:0;border:0}}`;
  const base = sp.replace(/\.json$/, "");
  writeFileSync(base + ".md", md.join("\n"));
  writeFileSync(base + ".html", `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(d.title)}</title><style>${css}</style>${body}`);
  console.log(`wrote ${base}.md and ${base}.html${fill ? ` (${fill} FILL IN line(s) still need the user)` : ""}`);
  if (has("pdf")) {
    const py = `import sys\nfrom playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n b=p.chromium.launch();pg=b.new_page();pg.goto('file://'+sys.argv[1]);pg.pdf(path=sys.argv[2],format='A4',print_background=True);b.close()`;
    const r = spawnSync("python3", ["-c", py, base + ".html", base + ".pdf"], { encoding: "utf8", cwd: dirname(base) });
    console.log(r.status === 0 ? `wrote ${base}.pdf` : "pdf skipped (python3 + playwright not available): open the html and print to PDF");
  }
  process.exit(0);
}
die("use --init or --render");
