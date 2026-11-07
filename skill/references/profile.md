# The private profile (evidence bank)

`profile.json` lives in the candidate's private workspace and is never committed. It is the single source of truth the checker uses.

- `person`: name, role, email, site, booking link, time zone. Used for the close section and for working-hours maths.
- `assets_base`: the origin images may come from (the candidate's own public site).
- `claims[]`: one fact each. `id`, `project`, `text`, `label` (`public`, `measured`, `design`, `judgement`). Write the text exactly as it may be repeated on a page, with the dates and the source for any number. If a figure has no source, it does not go in.
- `gaps[]`: honest limits, such as "No shipped health-data product". The page must not contradict these.
- `never_say[]`: reminders for the writer (confidential business data, NDA'd clients, unconfirmed titles).
- `forbid_terms[]`: words the checker rejects anywhere on a page.

Rules for adding a claim:
1. The candidate confirmed it, or it is on a public page you can cite.
2. Titles and dates match the résumé and any contract.
3. No outcome number without a dashboard, report or email behind it.
4. Work under NDA is listed only as far as the NDA allows.
