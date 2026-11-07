#!/usr/bin/env python3
"""Generic end-to-end check of a built pitch page. Needs: pip install playwright && playwright install chromium

  python3 smoke_test.py URL --password SECRET

Checks, at desktop and phone width: wrong password rejected, right one unlocks, no console errors, every image loads,
no horizontal scroll, and (when present) the timeline, needs map, brand wall with lightbox, and scope sheet respond.
Exit code 1 on any failure. The password is taken from --password or the PITCH_PASSWORD environment variable.
"""
import argparse, os, sys
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser(); ap.add_argument("url"); ap.add_argument("--password", default=os.environ.get("PITCH_PASSWORD"))
a = ap.parse_args()
if not a.password: sys.exit("give --password or set PITCH_PASSWORD")
fails, notes = [], []
def check(ok, msg): (notes if ok else fails).append(("ok   " if ok else "FAIL ") + msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h) in {"desktop": (1440, 900), "phone": (390, 844)}.items():
        ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(a.url, wait_until="domcontentloaded", timeout=60000); pg.wait_for_timeout(1200)
        check(pg.evaluate("!!document.querySelector('meta[name=robots][content*=noindex]')"), f"{name}: noindex meta present")
        pg.fill("#pw", "definitely-wrong"); pg.click("#gate-form button"); pg.wait_for_timeout(2500)
        check("didn" in pg.inner_text("#gate-msg"), f"{name}: wrong password rejected")
        pg.fill("#pw", a.password); pg.click("#gate-form button"); pg.wait_for_timeout(4500)
        check(pg.is_visible("#app"), f"{name}: unlocks with the right password")
        if not pg.is_visible("#app"): ctx.close(); continue
        H = pg.evaluate("document.documentElement.scrollHeight"); y = 0
        while y < H: pg.mouse.wheel(0, 900); pg.wait_for_timeout(120); y += 900
        bad = []
        for _ in range(24):   # lazy images on a slow connection: give them up to ~12 s, as a real visitor would
            pg.wait_for_timeout(500)
            bad = pg.evaluate("[...document.images].filter(i=>i.getAttribute('src')&&!(i.complete&&i.naturalWidth>0)).map(i=>(i.getAttribute('src')||'').slice(0,60))")
            if not bad: break
        check(not bad, f"{name}: all images load" + (f" (failed: {bad[:3]})" if bad else ""))
        check(not pg.evaluate("document.documentElement.scrollWidth>innerWidth"), f"{name}: no horizontal scroll")
        if pg.query_selector("[data-tl]"):
            n = pg.evaluate("document.querySelectorAll('[data-view=first] .tl-seg').length")
            pg.evaluate("document.querySelector('[data-view=first] .tl-seg:last-child').click()"); pg.wait_for_timeout(300)
            check(pg.evaluate("document.querySelector('.tl-pan:not([hidden]) .tl-panel:not([hidden])')!==null") and n > 0, f"{name}: timeline switches ({n} stretches)")
            if pg.query_selector("[data-tab=next]"):
                pg.evaluate("document.querySelector('[data-tab=next]').click()"); pg.wait_for_timeout(300)
                check(not pg.evaluate("document.getElementById('tl-next').hidden"), f"{name}: next-phase toggle opens")
                pg.evaluate("document.querySelector('[data-tab=first]').click()")
        if pg.query_selector("[data-map]"):
            pg.evaluate("document.querySelectorAll('.tile')[1].click()"); pg.wait_for_timeout(200)
            check(pg.evaluate("[...document.querySelectorAll('.mp')].filter(x=>!x.hidden).length===1"), f"{name}: needs map shows one panel")
        if pg.query_selector("[data-wall]"):
            pg.evaluate("document.querySelector('.wtile').click()"); pg.wait_for_timeout(300)
            ok = pg.evaluate("!document.querySelector('.lb').hidden"); pg.keyboard.press("ArrowRight"); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            check(ok and pg.evaluate("document.querySelector('.lb').hidden"), f"{name}: brand wall lightbox opens and closes")
        if pg.query_selector(".sc"):
            pg.evaluate("document.querySelector('.sc-fab').click()"); pg.wait_for_timeout(400)
            opened = pg.evaluate("!document.querySelector('.sc').hidden")
            before = pg.inner_text(".sc-hrs"); pg.evaluate("document.querySelector('.sc-list[data-side=out] .sc-chip').click()"); pg.wait_for_timeout(300)
            check(opened and pg.inner_text(".sc-hrs") != before, f"{name}: scope sheet opens and the hours move")
            pg.keyboard.press("Escape")
        check(not errs, f"{name}: no console errors" + (f" ({errs[:2]})" if errs else ""))
        ctx.close()
    b.close()
print("\n".join(notes + fails)); print(f"\n{len(fails)} failure(s)"); sys.exit(1 if fails else 0)
