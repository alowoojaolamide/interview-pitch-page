# Research checklist

Save results to `research/<slug>.json`:

```json
{ "company": "Acme Studio", "fetchedAt": "2026-01-15",
  "sources": [ { "url": "https://acme.example/about", "facts": ["Short factual sentences, copied or closely paraphrased."] } ] }
```

Fetch, in this order, and stop when you have enough:

1. Home, about, services, process and pricing pages.
2. The product the role would own: its site, waitlist, stage, promise, tone, features, privacy statements.
3. Any published process (phases, sprints, rituals) so the 90-day plan can speak their language.
4. Case studies and named clients, to learn what they are proud of. Do not repeat their headline results as if they were the candidate's.
5. The interviewer's public professional headline or bio. Nothing personal.
6. Recent press or posts about the product, if any.

Record the stage (idea, pre-launch, beta, live) and the date you read each page; pages change. If something looks broken on their site, do not put it on the page. Tell the user privately instead and let them decide whether to raise it.

If a fetch is blocked or empty, say so and ask the user to paste the text rather than guessing.

## Pulling the candidate's own visual work

- Portfolio sites: read local image files for exact pixel sizes (`w` and `h`).
- Behance: plain fetches and `curl` get a 403 on project pages. The profile page lists project covers (`.../projects/404/...`, which are cropped covers; swap `404` for `808` for a bigger version). To get the full-size project images, open the project page in a real browser session (for example Playwright with a normal user agent), scroll, and read the `project_modules/max_1200` image URLs. Prefer full modules over covers, because covers are cropped and often cut text off.
- A company's published brand guidelines page (logo, colour, type, voice) is strong evidence of a brand system: screenshot the sections.
- Copy chosen images into the deploy project and reference them by `https` URL on your own host, so a third party cannot change or block them. List that host in `meta.allowHosts`.
