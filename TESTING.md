# Charge the Line — testing guide

Read this before changing the app. It records how the app is tested **and the lessons behind each test**. Every rule here exists because a real bug got through without it.

## Run the tests

You need [Node.js](https://nodejs.org) 18 or newer. No install step: the harness loads `index.html` directly.

```
node tests/run_all.js          # everything — about 20 seconds
node tests/run_all.js quick    # syntax, answer balance, guide, short fuzz
node tests/run_all.js play human    # pick sections
```

Exit code 0 means every check passed. Before a release, run it several times (`for i in 1 2 3 4 5; do node tests/run_all.js | tail -1; done`), because chaos faults fire at random times and an intermittent failure usually means a real bug.

**Optional real-browser check** (layout and JavaScript errors at 320, 375, and 430 px):

```
pip install playwright && playwright install chromium
python3 tests/browser_check.py
```

## What the suite checks

| Section | What it proves |
|---|---|
| `syntax` | The script compiles; the service-worker cache name matches `APP_VERSION`; the service worker ignores `/patient-contact/` |
| `balance` | The right answer is neither usually the longest nor usually the shortest (limit 45% each), and answers are shuffled on screen |
| `play` | All 10 scenarios complete on Guided, Recall, and Chaos with a competent bot |
| `paths` | Every Real Save is still completable after partial and wrong decisions |
| `human` | Every scenario completes on every tier at human speed (an action about every 1.25 s, 2–3 s reactions) |
| `checks` | `qa2.js`: chaos faults, wrong-answer paths, pacing, duplicate IDs, and simulation cost per tick |
| `guide` | `qa_guide.js`: every guide card complete, links valid, every penalty and decision mapped to a lesson |
| `stress` | 600 randomized playthroughs with no failures |
| `fuzz` | Random tapping on every button never crashes or produces NaN pressures |

The suite has been verified to **catch planted bugs**: removing the answer shuffle, bumping the version without the cache, and breaking the hydrant control all fail. The broken hydrant fails exactly the seven scenarios that use a hydrant.

## Rules learned the hard way

1. **Bots must use the controls a player uses.** Setting state directly (`S.valves.rear2.open = 25`) hides missing controls. *Bug:* gating a discharge back down had no button at all (only Crack and Close), so players got stuck on the Queens call while every test passed. That's why the **Gate −** button exists. Prefer `$('id').onclick()` and `setValve()` over editing `S`.
2. **Test at human speed.** The `human` section plays with realistic delays. Charge the Line runs on real time throughout, which is why it never had Patient Contact's timing bug. Keep it that way: anything that measures the player must use real seconds.
3. **Don't let answer length or position give the answer away.** *History:* the right answer was the longest in 16 of 18 decisions **and listed first in 17 of 18**. Picking the first option nearly always scored perfectly. Answers are now rebalanced (`CTL_OPT`) and shuffled on screen; `data-i` keeps the original index, so scoring is unchanged.
4. **Version and cache move together.** *Bug:* `sw.js` was updated alone (cache 2.1.2) while the app still said 2.1.1. Bump `APP_VERSION`, the intro version, and `CACHE` in `sw.js` together; `syntax` enforces it.
5. **Two apps share one domain.** Patient Contact lives at `/patient-contact/`. Charge the Line's service worker must leave those requests alone, or it caches the wrong app's page. `syntax` checks this.
6. **Learn mode must never fire a control.** Tapping a control in Panel guide mode opens its card and does nothing else; `qa_guide.js` checks it in a real browser.
7. **Keep the simulation cheap.** `qa2.js` measures cost per tick against the 250 ms budget, so older phones don't lag.
8. **Every penalty teaches.** Each penalty type maps to a guide card (`incidentKey`), and `qa_guide.js` fails if one doesn't.

## How the app is organized (one file: `index.html`)

- `CAMP` holds the scenarios: rig, valves, missions, steps, decisions, and Real Save story, source, and outcome.
- The physics tick (every 250 ms) covers the pressure governor, friction loss, hydrant residual, drafting, check valves, heat, freezing, and faults.
- `GUIDE`, `DECG`, and `incidentKey` handle the Panel guide, linking decisions and penalties to lessons.
- Real Saves follow published accounts. Rig specifications that aren't published are modeled and say so.

## Adding a scenario — checklist

1. Add it to `CAMP` with missions, steps, and (for Real Saves) story, source, and outcome.
2. Teach `tests/qa.js` (`stepAct`) any new step wording, using real controls.
3. Map new decisions and penalties to guide cards.
4. Run `balance` and rewrite answers until it passes.
5. Run the full suite several times plus the browser check; bump all three version numbers.
