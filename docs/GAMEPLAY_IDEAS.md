# Gameplay ideas — ships, upgrades, variety & the convoy fix

Notes and proposals for VANGUARD. The first two sections are **shipped in this
change**; the rest are **suggestions**, ordered roughly by bang-for-buck, each
with the file it would touch so they're easy to pick up.

---

## 1. Shipped: a bigger range of ships at the starbase

The tender (`UI.showRefit`) previously offered three hulls (frigate, light
cruiser, escort carrier). It now offers a full escort→capital ladder, gated by
your fleet cap (command rank), cheapest first:

| Hull | Role | Pts | Req |
| --- | --- | --- | --- |
| KESTREL corvette | cheap picket / stern-guard | 160 | 150 |
| TEMPEST frigate | gun platform | 220 | 220 |
| **VIGILANT destroyer** *(new)* | torpedo boat — 4-fish salvo, fast | 280 | 320 |
| RESOLUTE light cruiser | ship of the line | 340 | 380 |
| ARGUS escort carrier | bomber/fighter decks | 380 | 420 |
| **AEGIS heavy cruiser** *(new)* | the Alliance answer to the DREADMAW | 500 | 620 |
| **SOVEREIGN battleship** *(new)* | capital broadside | 640 | 820 |

Defined in `js/data.js` (`DATA.CLASSES`, `DATA.STORE_SHIPS`) and added to the
skirmish builder (`js/ui.js` `HULLS`). Heavy hulls only become fieldable once
promotions raise the fleet cap, so they read as genuine milestones.

## 2. Shipped: more ways to upgrade

**Per-ship refits** were a single on/off "gunnery refit". They're now a menu of
independent refits per named ship (`DATA.REFITS`, applied in `Game.mkShip`, UI in
`UI.showRefit`), each priced off the hull's point value:

- **Gunnery** — +1 die on every lance & battery
- **Armor** — +20% hull
- **Engine overhaul** — +15% speed, sharper turns
- **Point-defense** — +1 flak turret (vs torpedoes & bombers)
- **Torpedo** — +1 fish per salvo *(tube ships only)*
- **Shield** — +1 shield on all facings

**Fleet-wide upgrades** grew from three to six (`DATA.UPGRADES`): the existing
targeting uplink / reinforced emitters / veteran crews, plus **point-defense
net** (+1 turret everywhere), **ablative plating** (+15% hull everywhere) and
**high-yield warheads** (+1 fish per salvo everywhere).

Old saves are migrated automatically (the legacy `refit: true` flag folds into
the gunnery refit).

## 3. Shipped: convoy movement bug

**Symptom:** in some convoy missions the freighter never moved.

**Cause:** the convoy AI (`AI.desired`/`AI.plot` in `js/game.js`) always steered
straight for the far edge with its facing **locked due east** and no lateral
avoidance. When an asteroid sat on that lane, the anti-collision loop collapsed
the freighter's move distance to 0 — and because its facing never changed, it
stayed boxed against the rock **forever**.

**Fix:** the convoy now (a) detects a rock on the lane ahead and aims for a
waypoint *beside* it, turning its facing toward the detour so it actually rounds
the obstacle, and (b) routes to the last point clear of every rock rather than
grinding through (which costs hull the convoy can't spare). Combat hulls keep the
old "you may plow through a shoal for 1–3 hull" behaviour. Regression-tested in
`tests/rules.test.js` ("convoy pathing"): the freighter now clears every rock
layout with zero grinds.

---

## 4. Suggestions — quick wins for variety (small, self-contained)

- **Weapon variety beyond lance/battery/torp/bay.** Add one or two new weapon
  *types* in `Game.solution`/`Game.resolveVolley` and hang them on hulls:
  - **Railgun / macro-cannon** — few dice, high `dmgPer`, punches shields; great
    on a new destroyer/battleship and makes gunnery feel different from batteries.
  - **Nova cannon / plasma lance** — long-range single big hit with a reload,
    ignores a shield pip. A signature capital weapon.
  - **Mines / droppable ordnance** — a bay variant that seeds the map.
- **A refit that changes a hull's *role*, not just its numbers** — e.g. a
  "strike refit" that swaps a battery for a torpedo tube, so the same hull can be
  built two ways. Reuses the `DATA.REFITS.apply(ship)` hook already added.
- **Named commanders / officers for your own ships** (the enemy already has
  `commander`). A one-per-fleet trait pick — "Gunnery Officer: +1 die once per
  battle", "Helmsman: +15° turn" — gives fleet-building personality.
- **Reduced-motion / colorblind palette toggle** (already on the roadmap; cheap
  and widens who can play).

## 5. Suggestions — mission & campaign variety (medium)

The roadmap's "more terrain & hazards" and "campaign events" are the highest-
leverage items for *variety* specifically:

- **New terrain/hazards** (extend `Game.genTerrain` + the transit/LOS checks):
  - **Gravity wells** that bend torpedo runs and drift ships.
  - **Solar flares / ion storms** on a countdown that periodically knock out
    shields or comms fleet-wide — forces tempo changes.
  - **Minefields** and **debris fields** (soft cover that degrades).
  - **Sensor-blind nebulae** that hide contacts from the order-of-battle overlay
    until close (nebulae exist as terrain already — add the fog-of-war rule).
- **New objective templates** beyond destroy/escort/defend/decap/interdict
  (`DATA.MISSION_ARCHS`): *salvage race* (grab drifting cargo hulks before the
  enemy), *reactor breach* (a station will blow in N turns — get clear or die),
  *rolling reinforcements* (waves jump in on a timer), *dual convoy* (two
  freighters, split your escort).
- **Your own convoys as a campaign event** (roadmap item) — supply runs between
  your systems that pay requisition if escorted, hurt you if ambushed. Now that
  the convoy AI actually routes reliably, this is much safer to ship.
- **Between-node random encounters** on the sector map — a distress call, a
  pirate toll, a derelict to board for a prize or a trap.

## 6. Suggestions — depth & replay (larger)

- **Battle replays / shareable seeds.** The RNG is already seedable (`U.setSeed`);
  logging plotted orders on top would give deterministic replays and daily
  challenges (roadmap item 4).
- **Faction-specific player unlocks.** Capturing enough Za'Argon/Hive hulls
  could unlock building a *variant* line — leaning into the prize/boarding system
  that already exists.
- **A light tech tree** instead of flat one-shot upgrades: tier upgrades so
  requisition keeps having a sink late in the campaign (e.g. uplink I/II/III).

---

### Balance watch-outs for the shipped content

- The **SOVEREIGN battleship** (78 hull, 640 pts) is deliberately strong; it's
  fleet-cap- and requisition-gated in the campaign, but in **skirmish** it's
  free-to-pick within the points budget, so keep an eye on stacked-battleship
  builds vs. the procedural matched force.
- Stacking **armor refit (+20%)** and the **ablative plating upgrade (+15%)**
  compounds; a battleship with both tops ~110 hull. Intended as a top-end tank,
  but worth watching against the current enemy damage output.
