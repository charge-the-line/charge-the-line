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
def play_real(pg, w, idx, variant, label, need):   # a scenario played to the end with real taps: decisions by visible text, valve, governor, supply and panel buttons, the fast-forward button
    pg.goto(URL); pg.wait_for_timeout(250)
    if pg.is_visible('#b-start'): pg.click('#b-start')
    pg.evaluate("window.FORCE_V={%d:'%s'}" % (idx, variant)); pg.click('.scen[data-i="%d"]' % idx); pg.wait_for_timeout(200); pg.evaluate("window.FORCE_V=undefined")
    panel = None; ff_used = 0
    def valve_to(k, lo, hi, psi):   # gate a valve with Crack + / Gate − until its gauge reads in band at this pump pressure
        o = pg.evaluate("S.valves['%s'].open" % k); lp = psi * (0.45 + 0.55 * o / 100)
        if o == 0 or (lp < lo and o < 100): pg.click('#valve-%s [data-a="crack"]' % k)
        elif lp > hi and o > 25: pg.click('#valve-%s [data-a="gate"]' % k)
    def governor_to(target):
        if pg.evaluate("S.mode") != 'psi': pg.click('#b-psi'); return
        sp = pg.evaluate("S.set")
        if sp < target - 5: pg.click('#b-up')
        elif sp > target + 5: pg.click('#b-dn')
    for _ in range(1100):
        if pg.is_visible('#done'):
            if 'scenario complete' in pg.text_content('#done-title'): break
            pg.click('#b-next'); pg.wait_for_timeout(300); continue
        if pg.is_visible('#case-go'): pg.click('#case-go'); pg.wait_for_timeout(300); continue   # a Real Save opens on its case card
        if pg.is_visible('#briefov'): pg.click('#brief-go'); pg.wait_for_timeout(300); continue
        if pg.is_visible('#decov'):
            if pg.is_visible('#dec-opts'):
                t = pg.evaluate("DEC.s.dec.opts.find(o=>o.r==='good').t"); pg.locator('#dec-opts button', has_text=re.compile('^' + re.escape(t) + '$')).first.click(); pg.wait_for_timeout(200)
            pg.click('#dec-go'); pg.wait_for_timeout(300); continue
        st, two, key, hk = pg.evaluate("(()=>{const c=CAMP[S.camp],m=c.missions[S.mission];const j=stepsDone.findIndex(x=>!x);const s=j<0?null:m.steps[j];return [s?s.t:'',s&&s.two?s.two:null,c.evKey||null,s&&s.k&&s.lo?[s.k,s.lo,s.hi]:null];})()")
        if panel is None and pg.evaluate("S.mission>=1"): panel = pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)
        band = re.search(r'(\d+)–(\d+)', st)
        if hk and not two: band = None
        if pg.evaluate("!!CAMP[S.camp].fillSite&&S.primed&&totalFlow()<20&&!S.fill"): pg.click('#s-fill'); pg.wait_for_timeout(300); continue   # recirculate between tankers, as a pump operator would
        if st == '': pass
        elif st.startswith('RPM mode, 1,000'):
            if pg.evaluate("S.mode") != 'rpm': pg.click('#b-rpm')
            elif pg.evaluate("S.rpm") < 1050: pg.click('#b-up')
            elif pg.evaluate("S.rpm") > 1250: pg.click('#b-dn')
        elif 'Clear the ice' in st: pg.click('#dh-ice'); pg.wait_for_timeout(600)
        elif 'Connect hard suction' in st: pg.click('#s-hard')
        elif 'Connect the hydrant line' in st: pg.click('#s-supply')
        elif 'Open the intake gate' in st: pg.click('#miv-open')
        elif 'to the FDC' in st and st.startswith('Connect'): pg.click('#s-fdc')
        elif 'up the west stair connected' in st: pg.click('#s-relay')
        elif 'Transfer valve set for pressure' in st:
            if pg.evaluate("S.rpm>1100"): pg.click('#b-idle')
            else: pg.click('#x-pres'); pg.wait_for_timeout(150); pg.click('#b-psi')
        elif 'Every discharge closed' in st:
            for k in pg.evaluate("Object.keys(S.valves).filter(k=>S.valves[k].open>0&&document.getElementById('valve-'+k))"): pg.click('#valve-%s [data-a="close"]' % k)
        elif st.startswith('Run the primer'):
            if not pg.evaluate("S.primerOn||S.primed"): pg.click('#s-primer')
        elif st.startswith('Primer off'):
            if pg.evaluate("S.primerOn"): pg.click('#s-primer')
        elif 'Back-flush the dry hydrant' in st:
            if pg.evaluate("S.flushT<=0"): pg.click('#dh-flush')
        elif 'Past 15' in st or st.startswith('Primed'): pass
        elif 'on the pad' in st:
            if pg.is_visible('#b-ff'): pg.click('#b-ff'); ff_used += 1
        elif 'Connect the fill line' in st: pg.click('#s-relay')
        elif 'Tanker nearly full' in st:
            if pg.evaluate("!!S.tk&&(S.tk.near||S.tk.full)"):
                if pg.evaluate("S.valves.rear4.open") > 25: pg.click('#valve-rear4 [data-a="gate"]')
                elif pg.evaluate("S.tk.full"): pg.click('#valve-rear4 [data-a="close"]')
        elif 'crack the tank fill' in st:
            if not pg.evaluate("S.fill"): pg.click('#s-fill')
        elif hk and not two:
            k, lo, hi = hk
            if pg.is_visible('#b-ff') and pg.evaluate("S.valves['%s'].open===100" % k): pg.click('#b-ff'); ff_used += 1
            elif pg.evaluate("S.valves['%s'].open" % k) < 100: pg.click('#valve-%s [data-a="crack"]' % k)
            else: governor_to((lo + hi) / 2)
        elif two:
            top = max(two, key=lambda x: x['lo']); governor_to((top['lo'] + top['hi']) / 2); psi = pg.evaluate("S.set")
            for x in two:
                if x is top:
                    if pg.evaluate("S.valves['%s'].open" % x['k']) < 100: pg.click('#valve-%s [data-a="crack"]' % x['k'])
                else: valve_to(x['k'], x['lo'], x['hi'], psi)
            if pg.is_visible('#b-ff'): pg.click('#b-ff'); ff_used += 1
        elif 'Engage the pump' in st: pg.click('#s-pump')
        elif 'Confirm tank-to-pump open' in st or 'Open tank-to-pump' in st:
            if not pg.evaluate("S.ttp"): pg.click('#s-ttp')
        elif st.startswith('Open #1 front'): pg.click('#valve-front [data-a="crack"]')
        elif st.startswith('Open the deck gun'): pg.click('#valve-deck [data-a="crack"]')
        elif st.startswith('Open #3 rear'): pg.click('#valve-rear3 [data-a="crack"]')
        elif st.startswith('Open #2 rear'): pg.click('#valve-rear2 [data-a="crack"]')
        elif st.startswith('Open #4 rear'): pg.click('#valve-rear4 [data-a="crack"]')
        elif 'Connect the second 5"' in st: pg.click('#s-relay')
        elif 'Connect the supply line' in st or 'Connect the 5" supply' in st: pg.click('#s-supply')
        elif 'Tanker pumping' in st or 'Open the hydrant' in st: pg.click('#s-hyd')
        elif 'Open the MIV' in st: pg.click('#miv-open')
        elif 'Bleed the air' in st: pg.click('#s-bleed')
        elif 'Close tank-to-pump' in st:
            if pg.evaluate("S.ttp"): pg.click('#s-ttp')
        elif 'Thermal camera check' in st: pg.click('#ev-cam'); pg.wait_for_timeout(600)
        elif 'Throttle back until the intake' in st:
            if pg.evaluate("S.cavOn||resDemand()<10"): pg.click('#b-dn')
        elif st.startswith('Shut down #1 front'): pg.click('#valve-front [data-a="close"]')
        elif st.startswith('Shut down #3 rear'): pg.click('#valve-rear3 [data-a="close"]')
        elif 'Throttle to idle' in st: pg.click('#b-idle')
        elif 'Close all discharges' in st:
            for k in pg.evaluate("Object.keys(S.valves).filter(k=>S.valves[k].open>0&&document.getElementById('valve-'+k))"): pg.click('#valve-%s [data-a="close"]' % k)
        elif 'Disengage the pump' in st:
            if pg.evaluate("S.rpm<=950"): pg.click('#s-pump')
        elif band:
            k = key or ('rear3' if st.startswith('FDC line') else 'deck' if 'deck gun' in st.lower() else 'rear3' if '#3 rear' in st else 'rear4' if '#4 rear' in st else 'rear2' if '#2 rear' in st else 'front')
            lo, hi = int(band.group(1)), int(band.group(2))
            if pg.is_visible('#b-ff') and pg.evaluate("S.valves['%s'].open===100" % k): pg.click('#b-ff'); ff_used += 1
            elif pg.evaluate("S.valves['%s'].open" % k) < 100: pg.click('#valve-%s [data-a="crack"]' % k)
            else: governor_to((lo + hi) / 2)
        pg.wait_for_timeout(400)
    ok = pg.is_visible('#done') and 'scenario complete' in pg.text_content('#done-title') and pg.evaluate('S.score') == 100 and need(pg)
    if not ok: print(label + ' run detail:', pg.evaluate("JSON.stringify({score:S.score,mission:S.mission,inc:S.incidents,step:(()=>{const m=CAMP[S.camp].missions[S.mission];const j=stepsDone.findIndex(x=>!x);return j<0?'':m.steps[j].t;})()})"))
    rows.append((w, label + ' panel', panel if panel is not None else 99)); rows.append((w, label + ' (full, fast-forward x%d)' % ff_used, (pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)) + (0 if ok else 99)))
def ev_play(pg, w): play_real(pg, w, 10, 'A', 'EV fire', lambda pg: 'upwind/?scn=liion' in pg.inner_html('#done-body'))
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
        if w == 320: play_real(pg, w, 11, 'B', 'Defensive fire B', lambda pg: True)
        if w == 320: play_real(pg, w, 12, 'B', 'Fill site B', lambda pg: 'Turn times' in pg.inner_html('#done-body'))
        if w == 430: play_real(pg, w, 13, 'A', 'One Meridian Plaza', lambda pg: 'In memory of Captain David P. Holcombe' in pg.inner_html('#done-body'))
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
