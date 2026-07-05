# GALACTIC REAVER — Battle for the Kessel Drift

A Battlefleet Gothic–inspired tactical space combat game, developed from the original
combat prototype (`Combat Prototype (standalone).html`, kept unchanged in this repo).

Capital ships turn slowly. Facing is everything.

## Play it

Open **`index.html`** in any modern browser — no build step, no server, no dependencies.
Everything is plain HTML/CSS/JS; it works from a `file://` double-click.
(Google Fonts are loaded when online; offline it falls back to system fonts.)

## What's in the game

- **5-mission campaign** in the Kessel Drift: a gunnery duel, a convoy escort, an
  asteroid ambush, a hunt against a fleeing courier, and a final battle against the
  Dominion flagship DREADMAW. Progress and requisition are saved in `localStorage`.
- **Fleet management** between missions — spend requisition on new hulls (frigate,
  light cruiser, max fleet of 3) and fleet-wide upgrades (targeting, shields, crews).
- **Skirmish mode** — build a fleet, fight a points-matched Dominion force on a
  random map.
- **The prototype's core rules, expanded:**
  - Three-phase turns: plot helm orders and movement for every ship, all ships
    maneuver simultaneously, then exchange fire, then resolve.
  - **Dice-pool gunnery** — every gun throws a pool of D6: a light escort flicks
    2 dice, a capital broadside hurls 10. Each die hits on the weapon's to-hit
    number (lances 3+ at any range; batteries 4+, worse at long range, better
    point-blank), shifted by orders, criticals, evasion and nebulae. Each hit
    deals its damage; the engagement log shows every die rolled.
  - Six helm orders: New Heading, All Ahead Full, Come About, Evasive Pattern,
    Hold & Lock, Brace for Impact — expressed as ±1/±2 shifts to the dice.
  - **Inertial movement** — ships fly smooth arcs (cubic curves whose tangents
    match the start heading and final facing), and the dashed plot preview shows
    the exact curve the ship will swing through. Asteroid collisions are checked
    against the real flight arc.
  - Facing shields (fore/side/aft) that soak hits from a volley one-for-one.
    The stern is unshielded and crits on 5+. Shields recharge only on turns a
    ship isn't under fire.
  - Critical hits (one roll per damaging volley; massed volleys of 4+ hits crit
    one easier): weapons, engines, shield emitter, bridge, **fires** (burn every
    turn until contained) and **hull breaches**. Damage-control repair rolls each turn.
- **Torpedoes as real ordnance** — salvos travel the map each movement phase and hit
  *whatever* crosses their path, friend or foe. Each fish deals a D6 of hull,
  bypasses shields and crits hard. Point-defense turrets and evasive
  maneuvers thin incoming salvos.
- **Terrain** — asteroid shoals block line of fire and grind hulls that transit them;
  nebulae hide ships (−15% to be hit).
- **Role-based enemy AI** — raiders hunt your stern, brawlers close head-on, snipers
  hold broadside range, convoy hunters go for the freighter, couriers run for the
  jump point. Enemies use the same movement rules, orders, arcs and weapons you do.
- **Presentation** — canvas renderer with starfield, engine flares, lance beams,
  tracer volleys, shield ripples, explosions, screen shake, floating damage numbers,
  and fully procedural WebAudio sound (no audio assets).

## Controls

| Input | Action |
| --- | --- |
| Click ship / `1`–`3` | Select a ship |
| Click order card → click destination → click facing | Plot a move |
| `SPACE` | Engage / Open fire / End turn |
| Right-click or `ESC` | Cancel current step |
| Click any ship | Inspect it (hull, systems, weapon arcs) |
| `M` / `H` | Mute / Help |

## Code layout

```
index.html        page shell
css/style.css     UI stylesheet
js/util.js        math helpers (bearings, arcs, facing clamps, LOS)
js/data.js        ship classes, weapons, helm orders, crit table, missions, store
js/sound.js       procedural WebAudio synth
js/game.js        state machine, combat resolution, torpedoes, terrain, AI, campaign
js/render.js      canvas renderer + particle/beam effects
js/ui.js          DOM panels, tooltips, screens, campaign flow
js/main.js        boot
```

The rules engine (`game.js`) is deliberately DOM-free: `Rend` reads state every frame
and `UI.refresh()` re-renders panels after state changes, which is what makes the
whole game drivable headlessly for testing.

## Suggested improvements (roadmap)

Ideas that would take the game further, roughly ordered by payoff:

1. **Squadrons & ordnance waves** — BFG's attack craft: carriers launching fighter
   screens and bomber waves as map objects, giving point defense a second job.
2. **Boarding actions & hulks** — close-range boarding, crippled ships drifting as
   capturable hulks; salvage as a requisition source.
3. **Ship veterancy & permadeath** — named ships gain skills across the campaign
   (faster reloads, better repairs); losing one costs more than requisition.
   An "Ironman" toggle for permadeath campaigns.
4. **Campaign map** — replace the linear mission list with a sector map where the
   player chooses routes, with dynamic patrol/ambush encounters between story beats.
5. **Bigger battles, camera controls** — zoom/pan and a minimap would unlock larger
   maps and 5+ ship fleets; the world-coordinate renderer already supports it.
6. **Smarter fleet AI** — coordinated focus fire, screen formations for the flagship,
   morale/disengage rules so beaten enemies rout rather than fight to the last hull.
7. **More terrain & hazards** — gravity wells that bend torpedo runs, solar flares
   that drop shields fleet-wide on a countdown, minefields.
8. **Multiplayer** — the plotted-orders structure is a natural fit for hotseat first
   (plot secretly, resolve together), then async play-by-link.
9. **Replays & seeds** — a seedable RNG plus an action log would enable battle
   replays, sharable "daily drift" challenges, and deterministic tests.
10. **Tech hardening** — TypeScript + a bundler, unit tests for the combat math,
    inlined fonts for a fully-offline PWA build, touch controls for tablets,
    colorblind-safe palette and reduced-motion mode.

## Development notes

The original prototype's combat math (bearing/arc geometry, facing clamps, hit
resolution, crit escalation) was preserved and generalized so that every hull —
player, ally, and enemy — runs on the same rules. Balance levers live in
`js/data.js` (hull stats, weapon accuracy/damage, order modifiers) and are easy
to tune.
