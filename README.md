# REAVERBANE — The Meridian War

A Battlefleet Gothic–inspired tactical space combat game, developed from the original
combat prototype (`Combat Prototype (standalone).html`, kept unchanged in this repo).

Capital ships turn slowly. Facing is everything.

## Play it

Open **`index.html`** in any modern browser — no build step, no server, no dependencies.
Everything is plain HTML/CSS/JS; it works from a `file://` double-click.
(Google Fonts are loaded when online; offline it falls back to system fonts.)

## What's in the game

- **Dynamic galactic-war campaign** — a two-level galaxy map: choose any enemy
  system **bordering your space**, drop into its **four planets** (one mission
  each, at Easy/Medium/Hard/Very Hard), and take it planet by planet. Missions are
  procedurally generated per faction, with the hand-built battles slotted in as
  **set-piece anchors** (the DREADMAW finale, THE HIVE, and more). The four powers
  — Terran Alliance, Crimson Reach, Za'Argon Dynasty and the Hive — hold the
  systems, and the **front can be lost**: enemy offensives besiege and flip your
  frontier systems back if you don't hold them. Progress, ownership, requisition
  and crews are saved in `localStorage`. (See `docs/CAMPAIGN_PLAN.md`.)
- **Fleet management between missions** — commission frigates, light cruisers and
  escort carriers (fleet of up to 4), install fleet-wide upgrades, and buy
  per-ship **gunnery refits** (+1 die on every gun).
- **Per-ship veterancy** — named ships earn XP for kills, boarding actions and
  surviving missions: GREEN → SEASONED (+1 turret) → VETERAN (guns hit on −1)
  → ELITE (+1 shields, repairs on 4+). Ships lost in battle are gone for good,
  and their experience with them.
- **Skirmish mode** — build a fleet from all four hulls and fight a points-matched
  force from any enemy faction — **Crimson Reach** pirates, the **Za'Argon
  Dynasty** or **the Hive** — on a random map. (Powered by the same procedural
  faction/mission engine that will drive the dynamic campaign; see
  `docs/CAMPAIGN_PLAN.md`.)
- **Dice-pool gunnery** — every gun throws a pool of D6: a light escort flicks
  3 dice, a capital broadside hurls 12. Lances hit on 3+ at any range; batteries
  hit on 4+, worse at long range, better point-blank. Orders, criticals, evasion
  and nebulae shift the to-hit number; the log shows every die rolled. Shields
  soak hits from a volley one-for-one; the stern is unshielded and crits on 5+.
- **Inertial movement with camera control** — ships fly smooth arcs (the dashed
  preview shows the exact curve), on a large map with **wheel zoom, drag/keyboard
  pan** and one-key re-fit.
- **Torpedoes & attack craft** — torpedo salvos run the map and hit whatever
  crosses their path, friend or foe. **Carriers** launch homing **bomber waves**
  (thinned by flak) and **fighter screens** that escort ships and intercept
  incoming ordnance.
- **Boarding actions & prizes** — ships killed by gunfire may break into
  **drifting hulks**. Close alongside to raid live enemies with hit-and-run
  criticals, or board a hulk to capture it — then salvage the prize for
  requisition or commission it into your own fleet. The enemy boards back:
  their ships raid your decks and send scuttling parties after your prizes.
- **Morale** — kill the flagship and the whole line breaks; batter their fleet
  below strength and ships start disengaging one by one. Routing ships stop
  firing and run for the map edge — the battle ends the moment no willing
  combatant remains, but escapees pay no bounty and leave no salvage.
- **Critical hits & damage control** — weapons, engines, shield emitter, bridge,
  fires that burn every turn (and spread on a botched containment roll), hull
  breaches; repair rolls each turn. Ships killed by gunfire may suffer a
  **magazine detonation** that hammers everything nearby — killing a cruiser at
  point-blank range is a decision.
- **Difficulty & secondary objectives** — PATROL / LINE DUTY / FORLORN HOPE
  shift enemy gunnery, their breaking point and requisition earned; every
  campaign mission carries an optional secondary objective paying bonus
  requisition (shown in the briefing).
- **Role-based enemy AI** — raiders hunt your stern, brawlers close, snipers hold
  broadside range, convoy hunters chase the freighter, couriers run for the jump
  point, carriers stand off behind bomber waves and fighter cover (and turn to
  fight if you corner them). The enemy concentrates fire on your most
  battered ship.
- **Command comforts** — one-key **BROADSIDES AT WILL** (auto-assign every idle
  gun to its best target, then adjust by hand) and a **1×/2×/3× game-speed
  toggle**, both persisted.
- **Order-of-battle overlay** — a filterable roster of every hull on the field on
  the right of the command deck: toggle **ALLIES / HOSTILES**, see each ship drawn
  as its sprite outline, and click any contact to inspect its weapons, systems and
  battle damage.
- **A campaign with a story** — you play **Captain Cael Riven, "the Ghost of
  Meridian"**, flying the corvette the game is named for: the **TAS REAVER**. The
  plot unfolds as **PRIORITY OPERATIONS** on the galaxy map — a mix of narrative
  interstitials and story battles across three acts (the pirates, the Za'Argon
  Dynasty, and the Hive that the Throne Gate is waking), ending in a three-way
  choice over the relic with branching epilogues. See `docs/STORY.md`.
- **Onboarding & briefing room** — a new campaign opens on **SELECT DIFFICULTY**
  and then a **commander's dossier** that introduces the Terran Alliance, its
  enemies and Admiral Kade Voss before you take command.
- **Presentation** — canvas renderer with starfield, engine wakes, lance beams,
  per-die tracer volleys, shield ripples, explosions, screen shake; fully
  procedural WebAudio combat sound, plus **two streamed music tracks**
  (`assets/music/`) — a title theme across the menus and a combat theme in battle,
  which crossfade as you enter and leave combat.

## Controls

| Input | Action |
| --- | --- |
| Click ship / `1`–`4` | Select a ship |
| Click order card → click destination → click facing | Plot a move |
| `SPACE` | Engage / Open fire / End turn |
| `B` | Broadsides at will (auto-assign all idle guns) |
| `F` | Game speed 1× / 2× / 3× |
| Mouse wheel | Zoom to cursor |
| Shift-drag / middle-drag / `WASD` / arrows | Pan the camera |
| `C` | Fit the whole battle on screen |
| Right-click or `ESC` | Cancel current step |
| Click any ship or hulk | Inspect it |
| `M` / `H` | Mute / Help |

## Tests

`node tests/rules.test.js` runs a 50-assert suite over the rules engine —
firing-solution modifiers, dice-volley resolution, shields, brace, morale,
boarding, magazine blasts and the movement curves — using the seedable RNG
(`U.setSeed`) for deterministic dice.

## Code layout

```
index.html        page shell
css/style.css     UI stylesheet
js/util.js        math helpers (bearings, arcs, facing clamps, movement curves, LOS)
js/data.js        ship classes, weapons, orders, crit table, sector map, store
js/sound.js       procedural WebAudio synth
js/game.js        state machine, combat resolution, ordnance, boarding, AI, campaign
js/render.js      camera, canvas renderer, particle/beam effects
js/ui.js          DOM panels, tooltips, screens, sector map, campaign flow
js/main.js        boot
```

The rules engine (`game.js`) is deliberately DOM-free: `Rend` reads state every frame
and `UI.refresh()` re-renders panels after state changes, which is what makes the
whole game drivable headlessly for testing.

## Suggested improvements (roadmap)

1. **More terrain & hazards** — gravity wells that bend torpedo runs, solar
   flares on a countdown, minefields.
2. **Campaign events** — random encounters between nodes on the sector map,
   supply convoys of your own, emergency refits at a price.
3. **Multiplayer** — the plotted-orders structure fits hotseat play first
   (plot secretly, resolve together), then async play-by-link.
4. **Replays & daily challenges** — the RNG is now seedable; an action log on
   top of it would enable battle replays and shareable seeded skirmishes.
5. **Tech hardening** — TypeScript + a bundler, inlined fonts for a
   fully-offline PWA build, touch controls, colorblind-safe palette and
   reduced-motion mode.

## Development notes

The original prototype's combat math (bearing/arc geometry, facing clamps, crit
escalation) was preserved and generalized so that every hull — player, ally, and
enemy — runs on the same rules. Balance levers live in `js/data.js` (hull stats,
dice pools, order shifts, rank thresholds, store prices) and are easy to tune.
