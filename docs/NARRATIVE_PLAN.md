# Galactic Reaver — Narrative Delivery Plan

How to make the campaign's story actually *land* in play, built on the code that
already exists. This is the build companion to `docs/STORY.md` (the story bible)
and `docs/CAMPAIGN_PLAN.md` (the campaign systems). STORY.md is the *what* (plot,
characters, acts); this doc is the *how* (where it plugs into the engine and in
what order to build it).

---

## 1. What already exists

The narrative framework is **built and populated** — the gap is delivery, not
content. Inventory of what's already wired:

| Piece | Where | State |
| --- | --- | --- |
| Story beats (10) across 3 acts | `DATA.STORY` (`js/data.js`) | Authored: ops + interstitials, each with `id`, `chapter`, `act`, `type`, `title`, `trigger`, and either `mission` or `body`. |
| Beat discovery | `Game.storyBeatAvailable()` (`js/game.js`) | Returns the first not-done beat whose `trigger(save)` passes. |
| Beat completion / chapter advance | `Game.completeStoryBeat(id)` | Pushes to `save.story.done`, bumps `save.story.chapter`. |
| Interstitial screen | `UI.showStoryBeat(beat)` (`js/ui.js`) | Renders a narrative screen; button advances the chapter. |
| Op launch | `Game.startStoryMission(beat)` → `UI.afterStoryMission()` | Launches an authored anchor or a generated mission, then debriefs. |
| Surfacing | `UI.showGalaxy()` `storychip` | A pulsing "PRIORITY OPERATION / INCOMING DISPATCH" button, shown **only if** a beat is available and **only** on the sector map. |
| Authored set-pieces | `DATA.ANCHORS`, `DATA.BOSS_ANCHORS`, `DATA.MISSION_DEFS` | Anchors pinned to `reavers/bloodmoon/ravagers/dreadfall/ulvor`; `m_dreadmaw` & `m_hive` are boss finales. |
| Named villains | `DATA.COMMANDERS` | Skarr (crimson), Vorun (zaargon); assigned to system finales. |
| Voss commentary | `Game.vossWarLine()` | One state-based line on the sector-map header. |
| Capture flags | `Game.applyWarResult()` | Already sets `save.story.flags['done_'+anchor]` on a win — **read by nothing yet**. |
| Save schema | `save.story = { chapter, done, flags }` | Already exists; covers everything below. No migration needed. |
| Endgame / branching finale | `UI.showEndgame()`, `UI.showCampaignVictory()` | The Throne Gate choice + three endings. |

## 2. Why the story doesn't come through

Five concrete, code-level reasons:

1. **No cold-open or act framing.** A campaign opens on the generic dossier
   (`UI.showContext`). The `act` field on every beat is never rendered. There is
   no `sc_prologue` in `DATA.STORY` (STORY.md lists one that was never added).
2. **Beats are opt-in and easy to miss.** The `storychip` is a small button on a
   busy map, shown only when you happen to be on the sector map. Nothing pushes
   it; `storyBeatAvailable()` is polled, never surfaced proactively.
3. **The opening is storyless.** The first beat (`sc_butcher`) needs
   `terranSystems() > 8`. The whole early game is generic procedural missions
   ("Za'Argon forces contest X") with zero plot.
4. **You can win without the story.** `showEndgame` fires purely on holding all
   enemy capitals. Beats gate nothing, so they read as optional flavour.
5. **Planet captures produce no narrative.** Taking a planet only increments
   `systemProgress`. The `flags['done_'+anchor]` hook that `applyWarResult`
   already writes is never read, so specific captures never *cause* anything.

**Upshot:** ~80% of the work is surfacing and wiring existing functions, plus a
few new beats and two small engine hooks. Not a from-scratch story build.

## 3. The design

### 3.1 Acts (Act I / II / III)
- **Act intro card** — a new beat `type: 'actcard'` reusing `showStoryBeat`'s
  renderer with a bg image and big "ACT I — FIRST BLOOD" treatment. One per act,
  triggered at the chapter boundary before that act's first beat.
- **Persistent act badge** — a line in the `showGalaxy` header driven by
  `save.story.chapter` → "ACT I · FIRST BLOOD". Always visible, so the player
  feels a three-act shape rather than an open sandbox.
- Act metadata lives in a small `DATA.ACTS = [{ chapter, name, tagline, bg }]`.

### 3.2 Admiral's dispatches & news (highest impact)
- **Prologue cold-open** — add `sc_prologue` (the Meridian flashback from
  STORY.md) as the first beat, shown right after the dossier at campaign start.
  Establishes Captain Riven, the DREADMAW, Voss, and the stakes.
- **Auto-push available beats** — after the Refit screen returns to the map (and
  on entering `showGalaxy`), if `storyBeatAvailable()` returns a beat, **present
  it** instead of waiting for a click: interstitials via `showStoryBeat`, ops via
  their briefing screen. Keep the chip as a fallback/re-open. This alone makes the
  admiral feel present every few missions.
- **Dispatch styling** — give interstitials the admiral portrait
  (`assets/portraits/admiral.png`, already used on Mission Complete) plus a short
  "war report" ticker from `save.galaxy.events`, so a dispatch reads as *news +
  orders*, not a bare text box. Extend `showStoryBeat` with an optional
  `speaker`/`portrait` and an events strip.

### 3.3 Story missions that highlight specific systems
- Add an optional `system: '<sysId>'` to op beats. In `showGalaxy`, **ring/pulse
  that system** and label the chip "◆ PRIORITY OP AT DREADFALL", routing the
  player's eye to it.
- Re-anchor the currently-abstract ops (`sc_butcher`, `sc_herald`, `sc_dynasty`,
  …) onto real systems so the plot physically **moves across the Drift** instead
  of happening in a placeholder "THE KESSEL DRIFT". The anchor set-pieces
  (`DATA.ANCHORS`) already pin to real systems — surface those as marked "story
  systems" on the map (a ◆ glyph on the node).

### 3.4 Take-a-planet → release-an-event
- **Capture-event table** — `DATA.CAPTURE_EVENTS = { 'dreadfall:0': 'sc_skarr_dead',
  'centauri:3': 'ev_gate_found', … }` keyed by `sysId:planetIdx`.
- **Engine hook** — in `Game.applyWarResult`, when a planet is cleared, also set
  `flags['captured_'+sysId+':'+planetIdx] = true` (mirrors the existing
  `done_<anchor>` write; ~2 lines).
- **New trigger form** — beats can now fire off a capture:
  `trigger: () => Game.save.story.flags['captured_dreadfall:0']`. Taking a
  specific world now *causes* a specific dispatch / unlocks an op / makes a
  villain react / surges the Hive. This is the cause-and-effect loop.
- **Faction reactions** — wire a few high-value captures: a Za'Argon shrine world
  → Vorun's warning; the last Crimson non-capital → Skarr pulls the DREADMAW back
  to Dreadfall for his stand; a southern system → the Hive surges
  (`factionStrength('hive')`).

### 3.5 Make the story load-bearing (gating)
- Gate each **act's capital finale behind that act's key beat**: e.g. you can't
  assault Dreadfall's boss finale until `sc_skarr` is done. A small predicate in
  the finale's `isPlanetLocked` path (or in `showEndgame`) checked against
  `save.story.done`. Preserves sandbox freedom *between* beats while making the
  spine mandatory at the act climaxes.

## 4. Rollout order

| Phase | Work | Payoff | Touchpoints |
| --- | --- | --- | --- |
| **A ✅** | `sc_prologue` beat · `DATA.ACTS` + act cards (`actcard` type) · act badge in header · **auto-surface available beats** | Story visible from minute one; three-act shape felt | `data.js` (ACTS, prologue), `ui.js` (`showStoryBeat`, `showGalaxy`, auto-push after `showRefit`/on map entry), `game.js` (none / trivial) |
| **B ✅** | Dispatch styling (portrait + events ticker) · re-anchor ops to real systems (`system` id) · map highlight for the active op's target + ◆ set-piece anchor badges · story target clickable to launch | Admiral reads as a character giving news + orders; plot moves across the map | `ui.js` (`showStoryBeat`, `showGalaxy`), `data.js` (`system` field on the 5 op beats) |
| **C ✅** | `captured_<sys>:<planet>` + `systaken_<sys>` flag write · capture-triggered beats (THE REACH BLEEDS, MERIDIAN AVENGED, THE MIND GOES DARK) · `DATA.CAPTURE_REACTIONS` Hive-surge villain reaction surfaced in the debrief | "Take this planet → this happens" cause-and-effect | `game.js` (`applyWarResult`, `hiveSurge`), `data.js` (beats + `CAPTURE_REACTIONS`), `ui.js` (`showMissionComplete` surge line) |
| **D ✅** | Story-gate the three enemy-capital finales (`DATA.FINALE_GATES`): a capital's boss finale stays locked until its act beat resolves (Centauri→sc_reliquary, Ul'Vor→sc_swarm_stirs, Dreadfall→sc_skarr). Reachability-checked: no softlock, endgame attainable. | Story becomes the spine, not a side quest | `game.js` (`planetLockReason`/`isPlanetLocked`), `data.js` (`FINALE_GATES`), `ui.js` (`showSystem` lock message) |

Phase A is the biggest win for the least code — almost entirely wiring existing
functions plus one beat and one title-card variant. No save-schema change:
`save.story = { chapter, done, flags }` already carries acts, completion, and
capture flags.

## 5. Content checklist (from STORY.md, mapped to delivery)

- [ ] `sc_prologue` — Meridian cold-open (interstitial, campaign start)
- [ ] Act I/II/III cards + taglines (`DATA.ACTS`)
- [ ] Re-anchor `sc_butcher` / `sc_herald` to Crimson border systems
- [ ] `sc_dynasty` / `sc_reliquary` anchored to Za'Argon systems
- [ ] Capture events: Dreadfall (Skarr), Centauri (Gate reveal), a southern
      system (Hive surge)
- [ ] Skarr nemesis close-out on `m_dreadmaw` (reuse flee-VIP escape hook)
- [ ] Gate act-capital finales behind `sc_skarr` / act beats
- [ ] Verify the three Gate endings still read after the new pacing

## 6. Guardrails

- **One beat at a time.** `storyBeatAvailable()` returns a single beat; keep
  auto-push idempotent (don't re-show a done beat) and never block the player from
  the map if they dismiss a dispatch.
- **Triggers stay cheap.** They run on every `showGalaxy`; keep them to array
  membership + counts + flag reads (as the current ones are).
- **Permadeath tone holds.** Dispatches acknowledge losses ("the Verge keeps what
  it takes"); don't let scripted beats resurrect a dead fleet's narrative.
- **Everything is data.** New plot = new entries in `DATA.STORY` / `DATA.ACTS` /
  `DATA.CAPTURE_EVENTS`. The engine hooks (Phases A–D) should be authored once so
  writers never touch `game.js` again.
