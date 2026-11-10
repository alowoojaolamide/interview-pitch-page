# interview-pitch-page

A skill for Claude Code (or any agent that reads `SKILL.md`) that builds a **private, password-protected, scroll-story pitch page** for one job interview.

Give it a job description and the company's public footprint. It researches the company, matches every requirement to *your own* evidence, picks the case study that fits the role, and produces a page that shows:

1. **What I heard**, in the company's own public words
2. **The proof**, one past project told as a scroll story
3. **Your list, answered**: what you asked / what I did / what I would do for you, with honest-gap rows
4. **Your first 90 days**, mapped to the company's own frame
5. **Marketing creative**, **questions I would ask**, and **a closing pitch**

## Why it is safe to reuse

- **No fabricated results.** A claims checker (`verify_claims.mjs`) fails the build when a number, percentage or result is not backed by your private evidence bank or the research notes.
- **Honest gaps.** If a requirement has no evidence, the page says so.
- **No personal data in this repo.** Your profile lives in a private folder. Passwords go through an environment variable. `scripts/privacy_scan.py` blocks a push that contains names, emails, phone numbers, tokens or home paths.

## Cost

Zero. The build is a dependency-free Node script. Hosting is any static host's free tier. Research and writing happen in your agent session.

## Security model

The page text is encrypted in the build (AES-256-GCM, PBKDF2-SHA256 with 600,000 rounds) and decrypted in the browser. Only ciphertext is deployed. Pages are `noindex`, have a random URL suffix, an expiry date and no-referrer headers. A short or guessable password can be brute-forced offline if someone finds the URL, so **choose a decent password and never put secrets on a page**.

## Install

```bash
git clone <this repo> interview-pitch-skill
mkdir -p ~/.claude/skills
cp -R interview-pitch-skill/skill ~/.claude/skills/interview-pitch-page
```

Then ask your agent: *"I have an interview with Acme on Tuesday, here is the job description…"* The skill walks through intake, research, evidence matching, QA, build and deploy.

## Quick start

```bash
node skill/scripts/init_workspace.mjs ~/pitch                       # once: private workspace
node skill/scripts/new_page.mjs --workspace ~/pitch --slug acme     # per interview: starts from a full example
node skill/scripts/verify_claims.mjs --content ~/pitch/pages/acme/content.json --profile ~/pitch/profile.json --research ~/pitch/research/acme.json
PITCH_PASSWORD='example-pass' node skill/scripts/build.mjs --content ~/pitch/pages/acme/content.json --out ~/pitch/pitch-pages --exact-slug
python3 -m http.server 8000 --directory ~/pitch/pitch-pages &
python3 skill/scripts/smoke_test.py http://localhost:8000/acme/ --password 'example-pass'   # pip install playwright first
```
Generate your private cue card with `node skill/scripts/cue_card.mjs --content ... --profile ... --out ~/pitch/cue-cards/acme` (see `skill/references/cue-card.md`). Deploy, hand-over and revocation are in `skill/references/deploy.md`.

## Layout

```
skill/SKILL.md            the workflow the agent follows
skill/scripts/init_workspace.mjs, new_page.mjs   scaffold the private workspace and a new page
skill/scripts/build.mjs   encrypt and assemble a page; revoke; clean expired
skill/scripts/follow_script.mjs   word-for-word script that follows the page, with an AI section (md, html, pdf)
skill/scripts/cue_card.mjs   generate the private interview cue card (markdown and 16:9 slides) from a page
skill/scripts/smoke_test.py   end-to-end check of a built page (optional, needs Playwright)
skill/scripts/verify_claims.mjs   the honesty gate
skill/template/           viewer shell, styles and renderer (no framework)
skill/references/         content schema, profile format, research checklist
skill/examples/           fictional profile, research and page
scripts/privacy_scan.py   pre-push scan for personal data
```

## Use it honestly

The tool makes a persuasive page. It is only as truthful as the evidence you give it. Respect each website's terms when researching, use only public and professional information about people, and do not publish work you are not cleared to show.

## License

MIT
