# Deploy, test and hand over (repeatable recipe)

Everything here is free-tier. Run from the candidate's private workspace, never from this repo.

## One-time (first interview only)
1. `node ${SKILL_DIR}/scripts/init_workspace.mjs ~/pitch` creates the private workspace.
2. Fill `~/pitch/profile.json` with confirmed facts. Save `~/pitch/brand/favicon.png` (64 to 128 px, under 60 KB, taken from the candidate's own site icon).
3. Create the hosting project, **with a neutral name that matches no existing project** (never the candidate's portfolio project):
   ```
   cd ~/pitch/pitch-pages
   npx vercel link --yes --project pitch-pages
   rm -f .env.local          # the CLI leaves a short-lived token here; do not deploy it
   ```
4. Optional free subdomain (needs the domain on Vercel DNS): `npx vercel domains add for.<their-domain> pitch-pages`.

## Every interview
```
node ${SKILL_DIR}/scripts/new_page.mjs --workspace ~/pitch --slug <company>      # starts from the full example
# research, write pages/<company>/content.json, research/<company>.json
node ${SKILL_DIR}/scripts/verify_claims.mjs --content ~/pitch/pages/<company>/content.json --profile ~/pitch/profile.json --research ~/pitch/research/<company>.json
PITCH_PASSWORD='…' node ${SKILL_DIR}/scripts/build.mjs --content ~/pitch/pages/<company>/content.json --out ~/pitch/pitch-pages --favicon ~/pitch/brand/favicon.png
```
- The folder gets a random suffix. Add `--slug <company>-xxxxx --exact-slug` when you rebuild and must keep the same link.
- Put images you may show in `~/pitch/pitch-pages/assets/` (served from your own host; list that host in `meta.allowHosts`) and give every image `w` and `h`.
- Test locally: serve `pitch-pages` (`python3 -m http.server 8000`) and run
  `python3 ${SKILL_DIR}/scripts/smoke_test.py http://localhost:8000/<folder>/ --password '…'`
  (needs `pip install playwright && playwright install chromium`). Then look at screenshots of each section, light and dark, desktop and phone.
- Deploy (only with the user's go-ahead): `cd ~/pitch/pitch-pages && npx vercel deploy --prod --yes`.
- Test the live URL with the same smoke test. If the page asks for a Vercel login, deployment protection is on: turn "Vercel Authentication" off for this project in the Vercel dashboard (or use a production domain, which is not behind it).

## Hand over
- Generate the cue card (`scripts/cue_card.mjs`, see `references/cue-card.md`) and give the user: the link, expiry date, claims-check result, honest gaps, anything to confirm, and the cue card (md and slides/PDF). Keep the cue card out of the page and out of git.
- The password goes in a separate message from the link, or is said aloud on the call.
- After the call: rebuild with what was said (`--exact-slug`), redeploy, send as a follow-up.
- End of process: `node ${SKILL_DIR}/scripts/build.mjs --out ~/pitch/pitch-pages --revoke <folder>` then redeploy. `--clean-expired` removes pages past their expiry.

## Known gotchas
- Lazy images without `w` and `h` shift the page and make jumps land short. The checker warns.
- Behance and some sites block plain fetches (403); use a real browser session to read them (see research.md).
- A short or guessable password can be brute-forced offline if someone finds the URL; keep secrets off the page.
- Never put a company's private business data (revenue, payouts, user lists) in any screenshot.
