# GALACTIC REAVER — Battle for the Kessel Drift

A Battlefleet Gothic–inspired tactical space combat game, developed from the original
combat prototype (`Combat Prototype (standalone).html`, kept unchanged in this repo).

Capital ships turn slowly. Facing is everything.

## Play it

Open **`index.html`** in any modern browser — no build step, no server, no dependencies.
Everything is plain HTML/CSS/JS; it works from a `file://` double-click.
(Google Fonts are loaded when online; offline it falls back to system fonts.)

## What's in the game

- **Branching campaign on a sector map** — six engagements in the Kessel Drift, of
  which each campaign fights four: after every victory you choose your route
  (convoy escort or asteroid ambush; hunt a fleeing courier or kill a carrier)
  before the final battle against the flagship DREADMAW. Progress, requisition
  and crews are saved in `localStorage`.
- **Fleet management between missions** — commission frigates, light cruisers and
  escort carriers (fleet of up to 4), install fleet-wide upgrades, and buy
  per-ship **gunnery refits** (+1 die on every gun).
- **Per-ship veterancy** — named ships earn XP for kills, boarding actions and
  surviving missions: GREEN → SEASONED (+1 turret) → VETERAN (guns hit on −1)
  → ELITE (+1 shields, repairs on 4+). Ships lost in battle are gone for good,
  and their experience with them.
- **Skirmish mode** — build a fleet from all four hulls, fight a points-matched
  Dominion force on a random map.
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
  requisition or commission it into your own fleet. The Dominion boards back:
  enemy ships raid your decks and send scuttling parties after your prizes.
- **Morale** — kill the flagship and the whole line breaks; batter their fleet
  below strength and ships start disengaging one by one. Routing ships stop
  firing and run for the map edge — the battle ends the moment no willing
  combatant remains, but escapees pay no bounty and leave no salvage.
- **Critical hits & damage control** — weapons, engines, shield emitter, bridge,
  fires that burn every turn, hull breaches; repair rolls each turn.
- **Role-based enemy AI** — raiders hunt your stern, brawlers close, snipers hold
  broadside range, convoy hunters chase the freighter, couriers run for the jump
  point, carriers stand off behind bomber waves and fighter cover (and turn to
  fight if you corner them). The Dominion concentrates fire on your most
  battered ship.
- **Command comforts** — one-key **BROADSIDES AT WILL** (auto-assign every idle
  gun to its best target, then adjust by hand) and a **1×/2×/3× game-speed
  toggle**, both persisted.
- **Presentation** — canvas renderer with starfield, engine wakes, lance beams,
  per-die tracer volleys, shield ripples, explosions, screen shake; fully
  procedural WebAudio sound (no assets).

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
4. **Replays & seeds** — a seedable RNG plus an action log for battle replays and
   shareable challenges.
5. **Tech hardening** — TypeScript + a bundler, unit tests for the combat math,
   inlined fonts for a fully-offline PWA build, touch controls, colorblind-safe
   palette and reduced-motion mode.

## Development notes

The original prototype's combat math (bearing/arc geometry, facing clamps, crit
escalation) was preserved and generalized so that every hull — player, ally, and
enemy — runs on the same rules. Balance levers live in `js/data.js` (hull stats,
dice pools, order shifts, rank thresholds, store prices) and are easy to tune.
