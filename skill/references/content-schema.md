# content.json schema

All text fields accept a tiny markup: `**bold**`, `*italic*`, and `[text](https://link)`. Everything else is escaped. Images must be `https`.

```jsonc
{
  "meta": {
    "avatar": "https://…/avatar.webp",   // optional: round avatar in the nav pill
    "portrait": "https://…/portrait.webp", // optional: portrait in the hero
    "home": "https://…", "homeLabel": "Portfolio", // optional: nav pill linking to the candidate's site
    "slug": "acme",                 // folder prefix; the build adds a random suffix
    "title": "Alex × Acme Studio",  // browser title after unlock
    "for": "Sam",                   // shown as "For Sam" in the hero
    "expires": "2026-12-31",        // page refuses to open after this date
    "gate": { "eyebrow": "Walkthrough", "title": "For Sam", "line": "A short walkthrough of how I would approach this. I will share the password on our call.", "tabTitle": "Alex Example",
              "fontsHref": "https://fonts.googleapis.com/css2?family=…", "display": "\"Brand Display\",sans-serif", "body": "\"Brand Sans\",sans-serif", "mono": "\"Brand Mono\",monospace" },   // everything in gate is visible before unlock: keep it harmless and on-brand  // visible BEFORE unlock: keep it harmless
    "allowNumbers": ["90", "100"],  // numbers the checker may accept without a profile claim (job-description figures, standards)
    "allowHosts": []                // extra image hosts
  },
  "theme": { "display": "\"Brand Display\",sans-serif", "body": "\"Brand Sans\",sans-serif", "mono": "\"Brand Mono\",monospace", "serif": "\"Brand Serif\",serif",
             "displayWeight": 800, "displayTracking": "-0.04em", "radius": "24px", "mode": "auto",
             "fontsHref": "https://fonts.googleapis.com/css2?family=…",
             "light": { "paper": "#f6f5f1", "surface": "#ffffff", "ink": "#0b0b0c", "muted": "#55554f", "accent": "#ff4a1c", "dark": "#0b0b0c" },
             "dark":  { "paper": "#0b0b0c", "surface": "#151517", "ink": "#f6f5f1", "muted": "#a9a9a2", "accent": "#ff4a1c", "dark": "#151517" } },

  "hero":    { "eyebrow": "Role · Product", "headline": "One sentence that names the product and the promise.", "sub": "Two sentences.", "cta": { "label": "See how I would start", "to": "heard" } },
  "marquee": ["Short", "keywords", "from the role"],

  "heard":   { "label": "01 — My read", "nav": "My read", "title": "Three things I would *protect.*",   // the candidate's point of view, not a summary of the brief
               "items": [ { "headline": "The candidate's opinion, as a sentence.", "theme": "The product",
                            "quote": "Short exact public phrase, shown small as an epigraph",   // optional
                            "note": "Why the candidate holds that opinion and what they would do about it." } ] },

  "story":   { "label": "02 · The proof", "nav": "The proof", "title": "…", "intro": "…", "big": "Project", "project": "My role", "meta": "dates and scope",
               "chapters": [ { "label": "The problem", "nav": "The problem", "title": "…", "body": ["paragraph", "paragraph"],
                               "bullets": ["Optional list shown under the body, e.g. closing habits"],
                               "image": { "src": "https://…", "alt": "…", "caption": "…" },   // one wide screenshot
                               "images": [ { "src": "https://…", "alt": "…", "caption": "short" } ],   // OR two to three phone screens side by side (scroll-snaps on small screens)
                               "stat": { "value": "214", "label": "what it counts, with source and date" },
                               "tags": ["public", "measured", "design", "judgement"] } ] },

  "ledger":  { "label": "03 — How I would work", "nav": "How I'd work", "title": "The work, *role by role.*", "intro": "…",
               "cols": ["The need", "What I have done", "What I would do"],
               "rows": [ { "theme": "Product", "ask": "Short topic title in the candidate's words", "project": "Project names",
                           "label": "public | measured | design | judgement",   // omit when gap is true
                           "gap": false,                                       // true = honest gap row
                           "did": "Concrete evidence.", "will": "Concrete deliverable and timing.",   // long text, shown under "Full detail"
                           "strength": "done | partial | gap",                // adds the row to the interactive needs map
                           "didShort": "About 15 words.", "willShort": "About 15 words.",   // what the map panel shows
                           "statusNote": "Partly: why. / Gap: what." } ] },   // required for partial and gap; no per-row disclaimers

  "plan":    { "label": "04 · Your first 90 days", "nav": "90 days", "title": "…", "intro": "…",
               "phases": [ { "label": "Month 1 · Foundation", "title": "…", "items": ["…"], "deliver": "What they would have." } ],
               "rhythm": [ { "title": "Overlap", "text": "…" } ], "foot": "I would tune all of this with you in week one." },

  // plan can use "timeline" instead of "phases": an interactive, scrubbable plan with an optional next-phase toggle.
  // "plan": { ..., "timeline": {
  //     "rhythm": "one line on the pacing", "phases": [ { "label": "Diagnose", "from": 1, "to": 2 } ], "months": [ { "label": "Month 1 — Foundation", "short": "Month 1", "from": 1, "to": 4 } ],
  //     "segments": [ { "weeks": "Weeks 1 to 2", "from": 1, "to": 2, "phase": "Diagnose", "short": "Listen, then map", "title": "…", "items": ["…"],
  //                     "with": "who it is with", "deliver": "what they would have", "decision": "a call from them",
  //                     "hours": { "listen": 20, "design": 25, "eng": 3, "mkt": 2 } } ],     // hours per segment; the page totals them
  //     "next": { "label": "Days 91 to 270", "intro": "…", "horizons": [ { "days": "Days 91 to 150", "short": "…", "title": "…", "items": ["…"], "decision": "…" } ] } } }
  "creative": { "label": "05 · Marketing and launch creative", "nav": "Marketing work", "title": "…", "intro": "…", "items": [ { "src": "https://…", "alt": "…", "caption": "…" } ] },
  "ask":      { "label": "06 · What I would like to learn from you", "title": "…", "intro": "…", "items": [ { "q": "Question", "why": "Why the answer changes the design." } ] },
  "close":    { "label": "07 · The short version", "nav": "Why me", "headline": "…", "reasons": [ { "title": "…", "text": "…" } ],
                "ctas": [ { "label": "Reply", "href": "mailto:…" }, { "label": "Book a call", "href": "https://…" } ], "signoff": "…" },
  "sourcesLabel": "Sources",
  "sources":  [ { "label": "site.com", "url": "https://…", "note": "what I used it for" } ],
  "fine":     "One short footer note: built from public information only, plans are opinions to test, figures about the candidate's work are dated and from their portfolio."
}
```

Required: `meta`, `hero`, `close`. Every other section is optional and is skipped when absent.

Evidence labels: **public** (anyone can check it), **measured** (a dated number from a real dashboard or report), **design** (a design-level fact about what was made), **judgement** (the candidate's opinion).

## Matching the candidate's own brand

Pull fonts, colours, radius and tone from the candidate's portfolio or site, and pass them through `theme`. Use their portrait and avatar (from their own public site) so the page reads as part of the same identity. In headings, wrap one to three words in `*asterisks*` to set them in the serif accent. Mirror their label style (for example `01 — My read`) and keep the page flat: hairline borders, no gradients, no stock illustrations. Before building, compare a screenshot of the page with a screenshot of the portfolio.

## Planning numbers

Weeks, days and hours in a forward plan are proposals, not claims about the past. List the ones that appear in text under `meta.allowNumbers` (hours inside `timeline.segments[].hours` are numbers, not text, so the checker does not see them). **The hours must add up to what the role allows**; if the posting says 100 hours a month, the three months must total no more than 300.

## The needs map (use it for live presentations)

When a ledger has more than about eight rows, give every row a `strength`, a `didShort` and a `willShort`. The page then shows an at-a-glance map: a status bar, a grid of tiles, and one panel with the short lines (tap or use arrow keys to move). The full table stays behind a "Full detail" toggle for reading afterwards. Status is shown by shape and text as well as colour (filled, half, dashed). Mark a row `partial` when the evidence covers only part of the need, and `gap` when there is none; always say why in `statusNote`.
