---
name: interview-pitch-page
description: Build a private, password-protected, immersive pitch page for one job interview. Takes a job description and the company's public footprint, researches the company, matches each requirement to the candidate's own evidence, picks the case study that fits, and outputs a scroll-story page that maps "what you asked / what I did / what I would do for you" plus a 90-day plan and a closing pitch. Use whenever the user has a new interview or application and wants a tailored page, microsite, pitch page, interview leave-behind or "page for the founder", even if they do not name the skill. Do not use for a general portfolio, a CV, or a cover letter.
---

# Interview pitch page

One command turns a job description plus public research into a private page for one person at one company. The page text is **encrypted** at build time. Only ciphertext is deployed, and the viewer decrypts it in the browser after the visitor enters the password.

`SKILL_DIR` = the directory containing this file. Scripts need Node 18+ and nothing else. Hosting is any static host; the free tier of Vercel or Netlify is enough. **Nothing in this skill costs money.**

## Ground rules (read first)

1. **Honest evidence only.** Every claim about the candidate must trace to an entry in the candidate's private `profile.json`. No metric, uplift, revenue or ROI figure unless it is listed there with a source. If a requirement has no evidence, write an **honest gap** row. Gaps build more trust than stretching.
2. **Proposals are proposals.** Everything under "what I would do" is labelled as an approach to test with the company, never as a statement about their internals.
3. **Public, professional sources only.** Use the company's own pages, press, and the interviewer's professional headline. Never use personal-life details, family, location of home, photos of people, or anything behind a login. If a page blocks fetching, ask the user to paste the text. Respect each site's terms.
4. **Never imitate.** Take cues from the company's tone, but do not copy their logo, layout or brand assets.
5. **No personal data in this repo.** Candidate data lives in a private folder outside the repo. Passwords go through the `PITCH_PASSWORD` environment variable and are never written to a file.
6. **Never publish or send** the page without the user's go-ahead. Deploying is outward-facing: confirm first unless the user already said to go live.

## One-time setup

1. Create a private workspace folder, for example `~/pitch/`, with `profile.json`, `pages/`, `research/` and `site/`. It must **not** be inside the public skill repo.
2. Copy `${SKILL_DIR}/examples/profile.example.json` to `profile.json` and fill it in with the candidate's real, confirmed facts (see `references/profile.md`). Add `forbid_terms` for anything that must never appear (NDA'd clients, unconfirmed claims).
3. Create a separate static project for hosting (name it something neutral such as `pitch-pages`). **Never deploy into the candidate's main site project.** Check the project name does not match an existing project before linking.
4. Optional free subdomain: add `for.<their-domain>` to that project.

## Workflow for each interview

1. **Intake.** Ask for: the job description (pasted), the company URLs, the interviewer's name and role (only the people who will be there), the interview date and time zone, and any must-avoid topics. Ask which password the user wants; warn once if it is short or guessable and let them decide. **Ask when the page will be shared: before the interview, live during it, or after.** That decides the password-screen wording and any date-specific lines (see Writing rules).
2. **Research.** Fetch the company's site, about, product and process pages, the product the role would own, and the interviewer's public professional headline. Save facts with their source and date in `research/<slug>.json` (see `references/research.md`). Note the company's tone of voice and stage. Look for what the role's product promises publicly.
3. **Break down the job description.** One row per requirement, tagged by theme (Product, Research, Systems, Handoff, Marketing, Trust, Working style). Include nice-to-haves.
4. **Match evidence.** For each row, pick the best evidence ids from `profile.json`. Score the candidate's case studies against the role and show the user the ranking and the reasoning. **Get approval of the lead case study before writing.**
5. **Write `pages/<slug>/content.json`.** Follow `references/content-schema.md`. Use the company's own words in the "What I heard" section. Map the company's own 90-day or process frame if they published one.
6. **Check the claims.**
   `node ${SKILL_DIR}/scripts/verify_claims.mjs --content pages/<slug>/content.json --profile profile.json --research research/<slug>.json`
   Fix every FAIL. Read every warning. A page that fails must not be built.
7. **Build.**
   `PITCH_PASSWORD='…' node ${SKILL_DIR}/scripts/build.mjs --content pages/<slug>/content.json --out site --favicon brand/favicon.png`
   Pass the candidate's own favicon (a 64 to 128 px PNG made from their site's icon) so the tab matches their portfolio even on the password screen.
   The folder gets an unguessable suffix (`/<slug>-k7q2a`). Run it again to rebuild; delete the old folder or use `--revoke`.
8. **Test locally.** Serve `site/` (for example `python3 -m http.server`), open the page, try a wrong password, then the right one. Check desktop and a 390px phone: no horizontal scroll, images load, no console errors. Look at the screenshots.
9. **Deploy** (with the user's go-ahead), then fetch the live URL and unlock it once.
10. **Report.** Give the user: the link, the expiry date, a reminder to send the password in a **separate message**, the claims-check result, the honest gaps on the page, and anything they should confirm.
11. **After the interview**, offer to refresh the page with what was said, then send it as a follow-up. Run `build.mjs --clean-expired` regularly, and `--revoke <folder>` when a process ends.

## Writing rules for the page

**Voice: the page is the candidate's own thinking.** It must never talk about how it was made.

- **No commentary about sources or the job post** in headings, intros or body copy. Avoid "I read your site", "you asked", "from your job description", "your words", "what I heard", "you wrote". Sourcing lives in **one quiet footer note** and the sources list, written in the candidate's voice ("Built from public information only…").
- **Open with a point of view**, not a summary of the brief. The hero should say something the candidate believes about the product or the people it serves.
- **Quote the company's words about five times on the whole page**, each as a small epigraph that backs up the candidate's own opinion. Never use their wording as a heading.
- **Headlines are the candidate's opinions** ("Three things I would protect"), not labels for the job post. Ledger rows get short topic titles in the candidate's words, not the posting's wording. Column heads say **The need / What I have done / What I would do**.
- **Presenting live?** Keep the visible text to a few words per screen. Use the needs map (`strength`, `didShort`, `willShort`) instead of a long table, and keep the detail one click away. Give a CEO one idea per screen.
- **One honest-gap row** when a requirement cannot be evidenced; it says so plainly, then what carries over. No per-row "my approach" disclaimers; the column head already says it is a plan.
- **Match the sharing moment.** The password screen (`meta.gate`: `eyebrow`, `title`, `line`, `tabTitle`) and any sign-off or heading that names a day must fit when the page will be seen. Shared **live in the interview**: frame it as a walkthrough of how the candidate thinks, say the password will be given on the call, and never say "before our call" or "see you Tuesday". Shared **before**: say it was prepared for the conversation. Shared **after**: thank them for their time and refer to what was discussed.
- Plain, specific, warm. Short sentences. No hype words ("passionate", "synergy"), no filler like "I am excited to".
- Each ledger row: **have done** (one or two concrete facts with the project name) and **would do** (one concrete deliverable and when).
- Keep their own frame where it is genuinely theirs, such as the Month 1/2/3 labels, and say so once.
- **The plan must fit the stated hours.** Add up the work. If the posting caps the role at 100 hours a month, the three months total 300 hours at most, and the list of work has to fit inside that. Show the split (listening, design, engineering, marketing), say what is deliberately not in scope, and list the calls the plan needs from the company. Prefer the interactive `timeline` over static cards, and offer a collapsed "next 180 days" view only when the posting mentions an ongoing engagement; keep it tied to the company's own public dates and never mention price.
- The company's published rhythm (for example a sprint) may inspire the pacing, but do not present it as their plan for this role; echo the shape once, in your own words.
- Four questions at most for "what I would like to learn from you", each one a question whose answer changes what is designed first.
- If the role's location, hours or eligibility rules could be a blocker, do not hide it on the page. Tell the user in the report so they can raise it early.
- Do not show screenshots that reveal business data the candidate keeps private (revenue, payouts, user lists). Check every image before it goes on a page.

`verify_claims.mjs` runs a voice lint: it warns when source-talk appears more than about three times or when quotes pile up. Treat that warning as a rewrite request.

## Design rules for the page

- **Match the candidate's own brand, not the company's.** Read the candidate's portfolio CSS or screenshots and carry over its fonts, palette, label style, radius and tone through `theme`, plus its portrait and avatar. A page that looks nothing like the candidate's site feels generic. Keep contrast AA or better in light and dark, and offer the theme toggle.
- Avoid template tells: soft gradient blobs, glassy cards, emoji, stock icons, default serif-plus-sans pairings that are not the candidate's own.
- Motion is an enhancement. The page must be complete with scripts blocked and with reduced motion on.
- Images must be `https` and come from the candidate's own public site. Use only screens the candidate is cleared to show.
- Keep the page under about six minutes of reading.

## Security model, stated honestly

- Page text is encrypted with AES-256-GCM, key derived from the password with PBKDF2-SHA256, 600,000 rounds. The ciphertext is public.
- The password is case-insensitive and trimmed. **A short or guessable password can be brute-forced offline** if someone finds the URL. The URL itself carries a random suffix, and pages are `noindex` with `robots.txt` disallow, `X-Robots-Tag` and no-referrer headers. This protects against casual discovery, not a determined attacker. **Never put secrets on a page.**
- Pages carry an expiry date and show an expired message after it. Deleting the folder and redeploying is what really removes a page.

## Publishing this skill

Before pushing the skill repo anywhere public, run `python3 scripts/privacy_scan.py` from the repo root. It blocks names, emails, phone numbers, tokens and absolute home paths, and reads your own blocklist from `~/.config/interview-pitch/blocklist.txt` (one term per line, never committed).
