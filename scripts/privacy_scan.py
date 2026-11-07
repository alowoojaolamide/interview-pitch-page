#!/usr/bin/env python3
"""Block a public push if the repo contains personal data.

Checks every tracked or untracked text file (except .git) for:
  - terms from your private blocklist (one per line, case-insensitive), read from
    $PITCH_BLOCKLIST or ~/.config/interview-pitch/blocklist.txt. The blocklist is never committed.
  - email addresses other than example.com / example.org / noreply
  - phone-number-like strings
  - API tokens and keys
  - absolute home-directory paths
Exit code 1 on any hit.
"""
import os, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
bl_path = pathlib.Path(os.environ.get("PITCH_BLOCKLIST", pathlib.Path.home() / ".config/interview-pitch/blocklist.txt"))
terms = []
if bl_path.exists():
    terms = [t.strip().lower() for t in bl_path.read_text().splitlines() if t.strip() and not t.startswith("#")]
else:
    print(f"warning: no blocklist at {bl_path}; only generic checks will run")

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<!\d)(\+?\d[\d\s().-]{8,}\d)(?!\d)")
SECRET = re.compile(r"(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)")
HOME = re.compile(r"/(Users|home)/[A-Za-z0-9._-]+/")
OK_EMAIL = re.compile(r"@(example\.(com|org)|users\.noreply\.github\.com)$|^noreply@")

hits = []
for p in sorted(root.rglob("*")):
    if not p.is_file() or ".git" in p.parts or "node_modules" in p.parts:
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    rel = p.relative_to(root)
    low = text.lower()
    for t in terms:
        if t in low:
            hits.append(f"{rel}: blocklisted term '{t}'")
    for m in EMAIL.findall(text):
        if not OK_EMAIL.search(m):
            hits.append(f"{rel}: email address '{m}'")
    for m in PHONE.findall(text):
        digits = re.sub(r"\D", "", m)
        if len(digits) >= 10 and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", m.strip()) and not re.fullmatch(r"[\d.]+", m.strip()):
            hits.append(f"{rel}: phone-like string '{m.strip()}'")
    for m in SECRET.findall(text):
        hits.append(f"{rel}: secret-like token '{m[:12]}…'")
    for m in HOME.findall(text):
        hits.append(f"{rel}: absolute home path")

if hits:
    print("PRIVACY SCAN FAILED")
    for h in sorted(set(hits)):
        print("  -", h)
    sys.exit(1)
print(f"privacy scan passed ({len(terms)} blocklist terms)")
