# content.json schema

All text fields accept a tiny markup: `**bold**`, `*italic*`, and `[text](https://link)`. Everything else is escaped. Images must be `https`.

```jsonc
{
  "meta": {
    "slug": "acme",                 // folder prefix; the build adds a random suffix
    "title": "Alex × Acme Studio",  // browser title after unlock
    "for": "Sam",                   // shown as "For Sam" in the hero
    "expires": "2026-12-31",        // page refuses to open after this date
    "gate": { "title": "For Sam", "line": "A private page prepared before our call." },  // visible BEFORE unlock: keep it harmless
    "allowNumbers": ["90", "100"],  // numbers the checker may accept without a profile claim (job-description figures, standards)
    "allowHosts": []                // extra image hosts
  },
  "theme": { "paper": "#fbf6ef", "surface": "#f3ebe0", "ink": "#2b2030", "accent": "#c2492f", "dark": "#1f1724",
             "fontsHref": "https://fonts.googleapis.com/css2?family=…", "display": "\"Fraunces\",serif", "body": "\"DM Sans\",sans-serif" },

  "hero":    { "eyebrow": "Role · Product", "headline": "One sentence that names the product and the promise.", "sub": "Two sentences.", "cta": { "label": "See how I would start", "to": "heard" } },
  "marquee": ["Short", "keywords", "from the role"],

  "heard":   { "label": "01 · What I heard", "nav": "What I heard", "title": "…", "intro": "…",
               "items": [ { "quote": "Their exact public words", "theme": "The product", "note": "What it tells me." } ], "foot": "…" },

  "story":   { "label": "02 · The proof", "nav": "The proof", "title": "…", "intro": "…", "big": "Project", "project": "My role", "meta": "dates and scope",
               "chapters": [ { "label": "The problem", "nav": "The problem", "title": "…", "body": ["paragraph", "paragraph"],
                               "image": { "src": "https://…", "alt": "…", "caption": "…" },
                               "stat": { "value": "214", "label": "what it counts, with source and date" },
                               "tags": ["public", "measured", "design", "judgement"] } ] },

  "ledger":  { "label": "03 · Your list, answered", "nav": "Your list", "title": "…", "intro": "…",
               "rows": [ { "theme": "Product", "ask": "Their requirement, verbatim", "project": "Project names",
                           "label": "public | measured | design | judgement",   // omit when gap is true
                           "gap": false,                                       // true = honest gap row
                           "did": "Concrete evidence.", "will": "Concrete deliverable and timing." } ] },

  "plan":    { "label": "04 · Your first 90 days", "nav": "90 days", "title": "…", "intro": "…",
               "phases": [ { "label": "Month 1 · Foundation", "title": "…", "items": ["…"], "deliver": "What they would have." } ],
               "rhythm": [ { "title": "Overlap", "text": "…" } ], "foot": "This is my approach, to test with you." },

  "creative": { "label": "05 · Marketing and launch creative", "nav": "Marketing work", "title": "…", "intro": "…", "items": [ { "src": "https://…", "alt": "…", "caption": "…" } ] },
  "ask":      { "label": "06 · What I would like to learn from you", "title": "…", "intro": "…", "items": [ { "q": "Question", "why": "Why the answer changes the design." } ] },
  "close":    { "label": "07 · The short version", "nav": "Why me", "headline": "…", "reasons": [ { "title": "…", "text": "…" } ],
                "ctas": [ { "label": "Reply", "href": "mailto:…" }, { "label": "Book a call", "href": "https://…" } ], "signoff": "…" },
  "sources":  [ { "label": "site.com", "url": "https://…", "note": "what I used it for" } ],
  "fine":     "What is public, what is proposal, and that no outcome figures are claimed."
}
```

Required: `meta`, `hero`, `close`. Every other section is optional and is skipped when absent.

Evidence labels: **public** (anyone can check it), **measured** (a dated number from a real dashboard or report), **design** (a design-level fact about what was made), **judgement** (the candidate's opinion).
