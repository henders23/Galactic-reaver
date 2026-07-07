# Galactic Reaver — Dynamic Campaign Plan

The fixed 6-node campaign is being replaced by a **living galactic war**: a
two-level map (galaxy → system → planet), mostly procedural missions with
authored anchors, and systems that change hands between factions as the war
goes. This doc is the design spec; it tracks what each screen shows (adapted
from the mock-ups) and the phased build.

## Factions

Four powers contest the Verge, each with a full fleet drawn from its own sprite
row (escort → capital) and its own ship-name pool (`DATA.NAME_POOLS`):

| Faction | Colour | Ships | Character |
| --- | --- | --- | --- |
| **Terran Alliance** (you) | blue `#4cd7ea` | TAS pennant, `corvette…argus` | disciplined line ships |
| **Crimson Reach** | red `#ff6159` | unprefixed pirate names, `jackal…dreadmaw` | fast, vicious raiders |
| **Za'Argon Dynasty** | green `#6fe0a8` | imperial relic names, `zsentinel…zthrone` | slow, sacred battleline |
| **The Hive** | purple `#b57ff0` | intel codenames + translated designation, `hdrone…hleviathan` | bio-swarm + carriers |
| *Neutral* | amber `#ffd465` | independent haulers | non-territorial; fly for whoever holds the lane |

> The **Za'Argon Dynasty holds the central systems** (they replaced the mock-up's
> "Neutral" owner on the galaxy). Neutral survives only as the allied-hauler
> faction used by escort/defense missions, not as a system owner.

## Sector map (galaxy) — Phase 1

Adapted from `system map 1` mock-up. Systems are nodes on the galaxy, tinted by
their **owning faction**, connected by lanes.

- **Keep:** owner colours + Neutral; system types (Capital / Major Hub / Minor
  Hub / Outpost / Resource / Shipyard); **Faction Influence** bars (the war
  tracker); System Information panel (name, owner, type, available missions,
  threat level); View Intel.
- **Drop:** Diplomacy and Fleet Readiness (not wanted).
- **New rule:** the player may only engage a system that **borders Terran-held
  space** (adjacency-gated). Winning a system's missions shifts its influence
  toward Terran until it flips owner.

## System / planet map — Phase 1

Adapted from `planets map` mock-up. A system opens to **4 planets**.

- **One mission per planet** (not the mock-up's 3–5), offered at **4 difficulty
  tiers**: EASY / MEDIUM / HARD / VERY HARD (`DATA.MISSION_TIERS`). Tier scales
  the enemy fleet's points budget, requisition paid, and enemy gunnery.
- Planet type (Rocky / Desert / Ice / Ocean / …) → battle terrain density
  (`DATA.PLANET_TYPES`).
- **System Progression** track (Intel → Foothold → Eliminate → Secure →
  Control) fills as planets are cleared; completing it takes the system.
- Keep: System Information, Resources, System Alerts, Mission Details + the
  difficulty guide. Fleet Status / station services are optional later polish.

## Mission generation

`Game.generateMission({ factionId, archetypeId, tierId, planet, system, seed,
playerFleetPts })` returns a mission object identical in shape to the authored
`DATA.MISSION_DEFS`, so it drops straight into `beginBattle`. Deterministic per
seed. Archetypes (`DATA.MISSION_ARCHETYPES`): **patrol, assault, convoy escort,
orbital defense, decapitation, interdiction** — each reuses existing win/lose
mechanics (destroy-all, convoy-exit, ally-survives, kill-VIP, VIP-escapes).

Authored missions (the current 6) become **set-piece anchors** slotted onto
specific planets, plus a **boss finale** per system (DREADMAW is the template;
each faction's `flagship` is its capital).

## Roadmap

- **P0 — Factions & generator** ✅ *(done)*
  Faction registry, four full fleets from existing sprites, per-mission
  difficulty tiers, the procedural mission generator + launcher, and a
  faction-aware Skirmish (pick Crimson Reach / Za'Argon / Hive) as the live
  proving ground.
- **P1 — Galaxy/System shell** ✅ *(done)*
  Two-level map: `UI.showGalaxy()` (21 systems across four factions, faction
  colours, front-line lanes, faction-influence bars, hover intel,
  **border-adjacency** gating) → `UI.showSystem()` (4 planets, one mission each ×
  4 difficulty tiers). Planets launch generated missions or authored anchors.
  Full war state is persisted (`save.galaxy = {owner, cleared, siege, turn}`):
  clearing all 4 planets **takes** a system, and a first-pass **enemy-pressure**
  model can besiege and **flip a frontier Terran system back** (the front can be
  lost; the Terran capital is protected). The six authored missions are slotted
  as set-piece anchors (FIRST BLOOD, THE CONVOY, AMBUSH AT THE ANVIL, THE HUNT on
  Crimson systems; THE DREADMAW finale on Dreadfall; THE HIVE on Ul'Vor
  Broodworld). Global campaign difficulty now scales how hard the front pushes
  back.
- **P2 — Story anchors & boss finales** ✅ *(done)*
  Every system now ends in a gated **boss finale** — an authored boss anchor
  (DREADMAW on Dreadfall, THE HIVE on Ul'Vor) or a generated **decapitation** vs
  the owning faction's flagship, led by a **named commander** (`DATA.COMMANDERS`;
  the Hive's flagship *is* the mind, so it has none). The finale is **locked until
  the system's other three worlds are secured**, so each system reads as a short
  arc. The mock-up's **System Progression** track (Intel → Foothold → Eliminate →
  Secure → Control) is shown on the system screen, planets carry a system-intel
  line, boss ships name their commander in the briefing and inspector, and
  **taking an enemy capital triggers a Voss beat** in the debrief.
- **P3 — Living war**: deepen the influence simulation — faction goals, smarter
  offensives, war-state UI on the galaxy, Voss commentary, defeat/victory arcs.
- **P4 — Narrative polish**: recurring nemeses (the flee-VIP escape hook),
  template briefings, faction voice, intel dossiers.
