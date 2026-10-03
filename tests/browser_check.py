#!/usr/bin/env python3
"""Real-browser check (optional). Needs:  pip install playwright && playwright install chromium
Opens every scenario at phone sizes; fails on any JavaScript error or anything off-screen.
Usage:  python3 tests/browser_check.py"""
import pathlib, sys
from playwright.sync_api import sync_playwright
URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
OVER = "(()=>{let m=0;document.querySelectorAll('body *').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();m=Math.max(m,r.right-window.innerWidth);});return Math.round(m);})()"
SMALL = "(()=>{let n=0;document.querySelectorAll('button').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;if(r.height<44)n++;});return n;})()"
errs, rows = [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (320, 375, 430):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(300)
        if pg.is_visible('#b-start'): pg.click('#b-start')
        pg.click('#h-set'); pg.wait_for_timeout(150); rows.append((w, 'settings', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#set-close')
        pg.click('#b-lesson'); pg.wait_for_timeout(200); rows.append((w, 'lesson', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('[data-l="quit"]'); pg.wait_for_timeout(150)
        pg.click('#b-drills'); pg.wait_for_timeout(200); rows.append((w, 'drills', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('[data-q="go"][data-k="friction"]'); pg.wait_for_timeout(200); rows.append((w, 'drill q', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('[data-q="quit"]'); pg.wait_for_timeout(150)
        n = pg.evaluate("CAMP.length")
        for i in range(n):
            pg.goto(URL); pg.wait_for_timeout(250)
            if pg.is_visible('#b-start'): pg.click('#b-start')
            pg.click(f'.scen[data-i="{i}"]'); pg.wait_for_timeout(150)
            if pg.is_visible('#case-go'): pg.click('#case-go'); pg.wait_for_timeout(150)
            if pg.is_visible('#brief-go'): pg.click('#brief-go')
            pg.wait_for_timeout(700)
            rows.append((w, pg.evaluate("CAMP[S.camp].name").split(' — ')[0][:28], (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
        pg.close()
    b.close()
for r in rows: print(f"{'PASS' if r[2] <= 1 else 'FAIL'}  {r[0]}px  {r[1]:<30} overflow {r[2]%1000}px · buttons under 44px: {r[2]//1000}")
print('JavaScript errors:', errs or 'none')
sys.exit(1 if [r for r in rows if r[2] > 1] or errs else 0)
