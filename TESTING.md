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

## Milestone 1 checks (added October 2026)

Foundation fixes: fonts served from this site, screen wake lock, finger-sized buttons. The `syntax` section (the hub: the plain list) now also proves:
- Fonts self-hosted in `fonts/`, no Google reference, every file in the cache list.
- Screen wake lock: requested when a mission starts (`brief-go`), released at the menu.
- Intro and menu version text equal `APP_VERSION`.
- Browser check: any visible button under 44 px tall fails the screen.

## Milestone 3 checks (added October 2026)

- Shared core: `preconnect-core.js` is loaded before the app script, listed in the service worker's cache, and its header hash matches its body (edit it, re-stamp with the hub's `node tests/core_hash.js`, copy to every repo).
- Spacing: 1, 3, 7, 14, 30 days after each clear at 70+; a miss resets; overdue reads as due.
- Debrief body: compare line (best, last time, new best), metrics table, what cost points, lesson chips, steps table.
- The mission debrief uses Debrief 2.0 (steps table, clean-run line, counted-up score).

## Milestone 4 checks (added October 2026)

- First-run card under 120 words, the full guide under How to play (`#howov`), the settings sheet wired, no Barlow left.
- Browser check opens the Settings sheet from the menu.

## Milestone 5 part one checks (added October 2026)

- `learn` section: the 12-slide lesson scores 100 when every check is right first try and 0 when every first answer is wrong; a slide cannot be skipped; the right option is the longest in no more than 45% of slides and the shortest in no more than 45% (ties count both ways).
- 800 generated drill questions have keys that match an independent recalculation (friction loss from the coefficient table, PDP from nozzle + friction + 5 psi per floor, hydrant lines from the percent-drop rule, control names from the guide); each drill scores 100 all right and 0 all wrong and records under `extra`.
- Browser check opens the lesson, the drill menu and a drill question at every width and checks sizes and overflow.

## Milestone 5 part two checks (added October 2026)

- `variants`: all 15 layouts (3 per regular scenario) complete on Guided, Recall and Chaos, perfect on Guided and Recall. The residential Guided step text and the crew's band equal an independent PDP recalculation from the layout's hose and nozzle (nozzle table and coefficients are hard-coded in the test, never read from the app). The relay band and intro follow the lay length. Sixty random loads see all three layouts; Standard layouts always gives A; a Real Save keeps the default hose; a finished run logs its layout. Planting a bug (variant applied without rebuilding the scenario) fails five of these checks.
- `inject`: each inject (burst, governor, hydrant sharing, strainer, tank drop) lands on Guided when its guard allows and the bot still finishes the mission. The panel is hidden until instructor mode is on and a scenario is active, pauses while open, freezes until resumed, disables injects that don't apply right now; an injected run is marked in the record and named in the debrief. The progress tables show lesson and drill bests and layouts seen; the CSV carries lesson and drill rows (`qa2` counts `CAMP.length+7`).
- Harness notes: `play(ci, tier, choice, {variant:'B', inject:{mission, at, f}})` pins a layout and keeps trying an inject from `at` seconds into that mission until it lands. The bot reads both bands on the two-line step and, when they don't overlap, pumps for the higher line and gates the other a quarter turn at a time (layout C). **Boot-based checks run before the play harness is created:** a later `boot()` swaps the harness's document and storage, so `run_all.js` keeps those checks above the `env=` line.
- Browser check opens the progress screen and, with instructor mode on, the Instructor panel inside a scenario.

## Milestone 7 checks (added October 2026)

- `inject` section: with a session on, twelve loads all use layout A, the Instructor button shows without the switch, the bar reads "Up: Jo", a finished scenario and a finished lesson are stamped with who, instructor and night, and a run without a session carries none of it.
- Browser check: with a session in storage the picker opens on load and the bar shows after a pick.

## Milestone 6 checks (added October 2026)

- `inject` section: with sound on, a penalty plays the bad tone and buzzes and finishing chimes; with sound off the buzz still works and nothing plays.
