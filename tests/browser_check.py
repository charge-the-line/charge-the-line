#!/usr/bin/env python3
"""Real-browser check (optional). Needs:  pip install playwright && playwright install chromium
Opens every scenario at phone sizes; fails on any JavaScript error or anything off-screen.
Usage:  python3 tests/browser_check.py"""
import re, pathlib, sys
from playwright.sync_api import sync_playwright
URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
OVER = "(()=>{let m=0;document.querySelectorAll('body *').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();m=Math.max(m,r.right-window.innerWidth);});return Math.round(m);})()"
SMALL = "(()=>{let n=0;document.querySelectorAll('button').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;if(r.height<44)n++;});return n;})()"
errs, rows = [], []
def ev_play(pg, w):   # the EV fire played to the end with real taps: decisions by their visible text, the valve and governor buttons, the tanker hookup, the fast-forward button and the thermal camera
    pg.goto(URL); pg.wait_for_timeout(250)
    if pg.is_visible('#b-start'): pg.click('#b-start')
    pg.evaluate("window.FORCE_V={10:'A'}"); pg.click('.scen[data-i="10"]'); pg.wait_for_timeout(200); pg.evaluate("window.FORCE_V=undefined")
    panel = None; ff_used = 0
    for _ in range(900):
        if pg.is_visible('#done'):
            if 'scenario complete' in pg.text_content('#done-title'): break
            pg.click('#b-next'); pg.wait_for_timeout(300); continue
        if pg.is_visible('#briefov'): pg.click('#brief-go'); pg.wait_for_timeout(300); continue
        if pg.is_visible('#decov'):
            if pg.is_visible('#dec-opts'):
                t = pg.evaluate("DEC.s.dec.opts.find(o=>o.r==='good').t"); pg.locator('#dec-opts button', has_text=re.compile('^' + re.escape(t) + '$')).first.click(); pg.wait_for_timeout(200)
            pg.click('#dec-go'); pg.wait_for_timeout(300); continue
        st = pg.evaluate("(()=>{const m=CAMP[S.camp].missions[S.mission];const j=stepsDone.findIndex(x=>!x);return j<0?'':m.steps[j].t;})()")
        if panel is None and S_tank_shown(pg): panel = pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)
        band = re.search(r'(\d+)–(\d+)', st)
        def keep_band():
            if pg.evaluate("S.valves.front.open") < 100: pg.click('#valve-front [data-a="crack"]'); return
            if pg.evaluate("S.mode") != 'psi': pg.click('#b-psi'); return
            lo, hi = int(band.group(1)), int(band.group(2)); sp = pg.evaluate("S.set")
            if sp < lo + 3: pg.click('#b-up')
            elif sp > hi - 3: pg.click('#b-dn')
        if st == '': pass
        elif 'Engage the pump' in st: pg.click('#s-pump')
        elif 'Confirm tank-to-pump open' in st or 'Open tank-to-pump' in st:
            if not pg.evaluate("S.ttp"): pg.click('#s-ttp')
        elif st.startswith('Open #1 front'): pg.click('#valve-front [data-a="crack"]')
        elif 'Connect the supply line' in st: pg.click('#s-supply')
        elif 'Tanker pumping' in st: pg.click('#s-hyd')
        elif 'Open the MIV' in st: pg.click('#miv-open')
        elif 'Bleed the air' in st: pg.click('#s-bleed')
        elif 'Close tank-to-pump' in st:
            if pg.evaluate("S.ttp"): pg.click('#s-ttp')
        elif 'Thermal camera check' in st: pg.click('#ev-cam'); pg.wait_for_timeout(600)
        elif st.startswith('Shut down #1 front'): pg.click('#valve-front [data-a="close"]')
        elif 'Throttle to idle' in st: pg.click('#b-idle')
        elif 'Close all discharges' in st: pg.click('#valve-front [data-a="close"]')
        elif 'Disengage the pump' in st:
            if pg.evaluate("S.rpm<=950"): pg.click('#s-pump')
        elif band:
            if pg.is_visible('#b-ff') and pg.evaluate("S.valves.front.open===100&&S.psi>150"): pg.click('#b-ff'); ff_used += 1
            else: keep_band()
        pg.wait_for_timeout(400)
    ok = pg.is_visible('#done') and 'scenario complete' in pg.text_content('#done-title') and pg.evaluate('S.score') == 100 and 'upwind/?scn=liion' in pg.inner_html('#done-body')
    if not ok: print('EV run detail:', pg.evaluate("JSON.stringify({score:S.score,mission:S.mission,camp:S.camp,inc:S.incidents,title:document.getElementById('done-title').textContent,step:(()=>{const m=CAMP[S.camp].missions[S.mission];const j=stepsDone.findIndex(x=>!x);return j<0?'':m.steps[j].t;})(),dec:S.decisions})"))
    rows.append((w, 'EV fire panel', panel if panel is not None else 99)); rows.append((w, 'EV fire (full, fast-forward x%d)' % ff_used, (pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)) + (0 if ok and ff_used > 0 else 99)))
def S_tank_shown(pg): return pg.is_visible('#evp') and pg.evaluate("S.tankerReq!==null")
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
        pg.click('#b-drills'); pg.wait_for_timeout(200); pg.locator('[data-q="go"]', has_text='Tank time').first.click(); pg.wait_for_timeout(300)   # the tank-time drill played to the end with real taps on the answer text
        for _ in range(8):
            ans = pg.evaluate("QZ.qs[QZ.i].a"); pg.locator('[data-q="ans"]', has_text=re.compile('^' + re.escape(ans) + '$')).first.click(); pg.wait_for_timeout(150); tap_next = pg.locator('[data-q="next"]').first; tap_next.click(); pg.wait_for_timeout(150)
        rows.append((w, 'tank drill (full)', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)) + (0 if pg.evaluate("QZ.score===100") else 99))); pg.goto(URL); pg.wait_for_timeout(300)
        if pg.is_visible('#b-start'): pg.click('#b-start')
        pg.click('#b-progress'); pg.wait_for_timeout(200); rows.append((w, 'progress', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#b-progclose'); pg.wait_for_timeout(150)
        pg.click('#b-inst'); pg.click('.scen[data-i="0"]'); pg.wait_for_timeout(150); pg.click('#brief-go'); pg.wait_for_timeout(400); pg.click('#inst-fab'); pg.wait_for_timeout(200); rows.append((w, 'instructor', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#inst-close'); pg.wait_for_timeout(150)
        pg.goto(URL+'?drill=hydrant'); pg.wait_for_timeout(300); rows.append((w, 'daily link', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)) + (0 if pg.is_visible('#quizov') else 99)))
        pg.goto(URL); pg.evaluate("localStorage.setItem('preconnect-drill',JSON.stringify({on:true,inst:'Max',roster:['Jo','Sam'],who:'',start:new Date().toISOString()}))"); pg.goto(URL); pg.wait_for_timeout(300); rows.append((w, 'drill picker', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('.pc-drill-name'); pg.wait_for_timeout(200); rows.append((w, 'drill bar', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.evaluate("localStorage.removeItem('preconnect-drill')")
        if w == 375: ev_play(pg, w)
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
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    if pg.is_visible('#b-start'): pg.click('#b-start'); pg.wait_for_timeout(200)
    rows.append((844, 'landscape', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.evaluate("localStorage.setItem('preconnect-settings',JSON.stringify({contrast:'day'}))"); pg.goto(URL); pg.wait_for_timeout(300)
    if pg.is_visible('#b-start'): pg.click('#b-start'); pg.wait_for_timeout(200)
    rows.append((844, 'daylight', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.click('#h-set'); pg.wait_for_timeout(200)
    rows.append((844, 'settings land', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.close()
    b.close()
for r in rows: print(f"{'PASS' if r[2] <= 1 else 'FAIL'}  {r[0]}px  {r[1]:<30} overflow {r[2]%1000}px · buttons under 44px: {r[2]//1000}")
print('JavaScript errors:', errs or 'none')
sys.exit(1 if [r for r in rows if r[2] > 1] or errs else 0)
