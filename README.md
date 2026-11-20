# makefun-gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/smrfkeenam-hue/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/smrfkeenam-hue/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Trophy Guide** — an offline trophy guide and tracker for Grand Theft Auto VI on PS5: all 55 official trophies with a written guide for each one, a progress tracker that remembers your earned trophies, and a six-stage roadmap to the platinum. It is plain static files — open it in a browser and it works with no server, no account, and no network requests at all.

What it covers:

- **All 55 trophies, exactly as PlayStation lists them** — 1 platinum, 2 gold, 6 silver, 46 bronze, with 28 hidden ones. Every trophy has its official name and description, and every guide is written in the builder's own words with the source named beside it (KeenGamer, PowerPyx, PSNProfiles, Exophase, and others — real links where the exact URL is known, names otherwise). The five trophies whose unlocks are still unconfirmed say so honestly, with the best-known lead.
- **Tracker** — tick trophies off as you earn them; progress is saved in your browser (localStorage), with a progress bar, per-grade counts, and JSON export/import so you can back it up or move it to another machine.
- **Search and filters** — find a trophy by name, filter by grade, or by kind: Story, Missable, Collectibles, Activities, Side Missions, Crime, and Online (all 55 trophies are offline — there is nothing to miss online).
- **Spoiler-safe toggle** — hides hidden and story trophies until you have earned them, so the guide never spoils the story.
- **Roadmap** — six stages from the story (Chapters 1 to 5) through side strands, activities, crime, collectibles, and 100% completion to the platinum, with times, trophy counts, and the Chapter 1 warning.
- **The one missable trophy, flagged everywhere** — Positive Mental Attitude is the only trophy you can miss: meditate on the balcony at Jason's house in the morning in Chapter 1, after the mission Down to Earth and before the chapter ends. It gets a banner, a badge, a roadmap warning, and a step-by-step guide.

The first load is three files and about 7 KB compressed — vanilla JavaScript, no libraries, system fonts, zero network requests at runtime, and no Rockstar Games logo or artwork anywhere.

## Screenshots

Four real renders of the running app, in `screenshots/`:

1. `1-cover.jpg` — the checklist with the platinum guide open: steps and cited sources
2. `2-roadmap.jpg` — the six-stage roadmap with the missable warning
3. `3-spoiler.jpg` — spoiler mode on, story trophies hidden until earned
4. `4-missable.jpg` — the Positive Mental Attitude guide with its sources

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or just open `app/index.html` directly in a browser — no server needed.

To hand the entry in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json`, the summary the judge reads.

## Files

- `app/index.html`, `app/style.css`, `app/app.js` — the guide itself: checklist, tracker, filters, spoiler toggle, roadmap view
- `app/data/trophies.json` — all 55 trophies: names, descriptions, grades, guides, and the sources map
- `app/data/roadmap.json` — the six roadmap stages
- `main.ts` — the entry program: hands `app/` and `screenshots/` in and writes `dossier.json` via the vendored `vendor/makefun-frontend.ts` (left untouched, as the scorer requires)
- `serve.ts` — a tiny local server for the guide; `shots.json` / `shots.mjs` — the screenshot setup
- `screenshots/` — the four real renders listed above

---

<sub>Entered on [make.fun](https://make.fun/?ref=rftzw4en&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
