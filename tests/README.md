# tests/

Headless test suite for Charge the Line. Start with `../TESTING.md`.

- `run_all.js` — run everything: `node tests/run_all.js`
- `browser_check.py` — optional real-browser check (needs Playwright)
- `qa_mock.js` — fake browser that loads `../index.html`
- `qa.js` — the bot that plays every scenario (`play(scenario, tier, choice, {human:true})`)
- `qa2.js`, `qa_guide.js`, `stress.js` — detailed reports
