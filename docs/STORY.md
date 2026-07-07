# Galactic Reaver — Story Bible (draft v1)

The narrative spine for the campaign. Tone: **pulpy space opera** — larger-than-life
villains, daring raids, momentum and swagger, but with real cost underneath
(permadeath, "the Verge keeps what it takes"). This doc is the source of truth for
plot; the `DATA.STORY` beats and authored missions are built from it.

> Canon names below are **fixed enough to build on** but still editable — flag any you
> want changed. Where a name already exists in `js/data.js` (commanders, ship pools),
> we reuse it.

---

## Logline

**Captain Cael Riven** — the only officer to break out of the Meridian massacre — is
exiled to the dying frontier of the **Verge** and handed a shoestring fleet. To hold
the **Kessel Drift**, they must fight a four-way war for a chokepoint that hides an
ancient relic — the **Throne Gate** — while a bio-swarm the Gate is waking threatens
to devour the whole sector. Revenge, redemption, and one impossible choice about the
Gate.

## The setting

- **The Verge** — the ragged frontier where Terran Alliance space frays into the dark.
  The Alliance is *losing the war*; the line broke at **Meridian**, and the survivors
  were pushed back here.
- **The Kessel Drift** — the choke point of the whole Verge: a slow river of derelicts,
  ice and ore that every convoy must thread. Hold it and the Verge breathes. Lose it
  and a dozen worlds behind it go dark.
- **The Throne Gate** — buried in the Drift: an ancient **Za'Argon** jump-gate, the
  fabled seat of the First Emperor, dormant for millennia. It bleeds a strange energy.
  - The **Za'Argon** revere it — their birthright, proof of their destiny.
  - The **Hive** is *drawn to it and feeds on it* — the Gate's waking is what stirs the
    swarm. (This is why the Hive escalates through the campaign.)
  - The **Alliance** wants it as a strategic asset: a stable long-range gate could
    reconnect the shattered Verge — or be the weapon that wins the war.
  - The **Crimson Reach** just want to sell it to the highest bidder, or deny it to
    everyone for leverage.

## The player — Captain Cael Riven, "the Ghost of Meridian"

A **defined character** (body/gender left open for the player — Voss and the crew only
ever address you as "Captain"; history and reputation fixed):

- At **Meridian**, when the DREADMAW shattered the Alliance line, you disobeyed the
  order to hold and cut *through* the enemy escorts to cover the civilian evacuation.
  Thousands lived. The fleet — and Admiral Voss's command — died anyway. You brought a
  single ship out of the fire: the corvette **TAS REAVER**, now your flagship. The war
  remembers her name, and so the game is titled for her.
- The Alliance couldn't decide if you were a hero or the coward who ran while the fleet
  burned. They split the difference and **exiled you to the Verge** with the ragtag
  **7th Expeditionary Fleet** — the man they call **the Ghost of Meridian**, the officer
  who shouldn't have lived.
- Your arc: from disgraced exile to the Verge's last hope — and a reckoning with the
  DREADMAW that broke Meridian. (Name is canon but easy to change; no in-game rename UI
  for now.)

## Admiral Kade Voss

Your CO, and the voice in every briefing — a worn, blade-dry pragmatist. He commanded
the fleet that died at Meridian; **you were his captain**. He blames himself, not you.
The Drift is his second chance and yours. His arc: as the Throne Gate surfaces, Voss is
caught between his orders (the Alliance wants the Gate as a weapon) and his conscience —
and he leans on you to make the call he can't. Sample voice:

> "No clever speech, Captain. That ship out there is every good crew we buried at
> Meridian. Take its spine off and we can all start breathing again."

## The four powers & their faces

| Faction | Wants | Named antagonist | Flavor |
| --- | --- | --- | --- |
| **Terran Alliance** (you) | Survive; hold the Drift; secure/deny the Gate | — | The thin blue line, green and outgunned. TAS pennant. |
| **Crimson Reach** | Plunder & chaos; the Verge lawless | **Warlord Skarr**, the *Butcher of Meridian*, master of the **DREADMAW** | Pirate confederation united by one warlord's flagship — the ship that broke the line. Your nemesis. |
| **Za'Argon Dynasty** | Reclaim the Verge & the Throne Gate | **Exarch Vorun** | Ancient empire returned for its birthright. Sacred, ponderous battleships; tragic zealotry. |
| **The Hive** | Consume | **The Hive Heart — *Xorrath*** (at Ul'Vor) | A bio-swarm the Gate is waking. Doesn't negotiate. The escalating existential climax. |

## Three acts

**ACT I — FIRST BLOOD (the pirates).** You arrive; the Crimson Reach is savaging convoys.
Establish the Reaver, Voss, and the ghost of the DREADMAW. Intel places **Skarr** in the
Verge. He slips away in *The Hunt* — the nemesis hook. Delivered through the authored
anchors **FIRST BLOOD → THE CONVOY → AMBUSH AT THE ANVIL → THE HUNT** plus story beats.

**ACT II — THE DYNASTY (the ancient empire).** Pushing into the center, you hit the
Za'Argon and learn the real stakes: the **Throne Gate**. **Exarch Vorun** warns you off
sacred ground. Voss starts hedging. Meanwhile the war map shows the **Hive surging in the
south** — the Gate is waking it. Climaxes at the Za'Argon capital **Centauri Gate**.

**ACT III — THE HIVE (the reckoning).** The swarm breaks out, drawn by the Gate. Race the
three capitals: kill **Skarr** at **Dreadfall** (Meridian avenged — Voss's redemption),
break **Vorun** at **Centauri Gate**, and face the **Hive Heart** at **Ul'Vor Broodworld**.
Then the last question: the **Throne Gate** itself.

## Beat outline

Delivery types: **anchor** (existing authored set-piece already on the map), **op** (a
`DATA.STORY` priority-operation battle), **interstitial** (a narrative screen — Voss / a
villain — no battle; needs a small framework add), **choice** (branching climax).

| id | Act | Trigger | Type | Beat |
| --- | --- | --- | --- | --- |
| `sc_prologue` | I | campaign start | interstitial | The dossier + a Meridian cold-open: who you are, what you did, where they sent you. |
| `m_first` (FIRST BLOOD) | I | Reaver's Landing planet 1 | anchor | First clash with the Reach. |
| `sc_butcher` | I | first enemy system taken | op | Intel: Skarr and the DREADMAW are in the Verge. A raid to confirm it. |
| `m_convoy` / `m_anvil` | I | on the map | anchor | Escort / ambush set-pieces. |
| `m_hunt` (THE HUNT) | I | Dreadfall planet 2 | anchor | Chase Skarr's courier for the fleet codes — **Skarr escapes** (nemesis hook). |
| `sc_meridian` | I→II | after the escape | interstitial | Voss opens up about Meridian; the bond. |
| `sc_dynasty` | II | first Za'Argon engagement | op | First contact with the Za'Argon; **Vorun's** warning. |
| `sc_gate` | II | a Za'Argon system taken | interstitial | The **Throne Gate** revealed; Voss goes cagey (weaponize it?). |
| `sc_swarm_stirs` | II | Hive `factionStrength` ≥ threshold | interstitial | The Hive is growing — the Gate is feeding it. |
| Centauri finale | II | capital finale | anchor/boss | **Exarch Vorun** at the Za'Argon capital. |
| `sc_breakout` | III | Hive at peak / 2 capitals held | op | The swarm breaks out — a desperate holding action. |
| THE DREADMAW | III | Dreadfall finale | anchor/boss | **Skarr** dies; Meridian avenged; Voss's redemption. |
| THE HIVE | III | Ul'Vor finale | anchor/boss | The **Hive Heart / Xorrath**. |
| `sc_endgame` | III | final capital / war won | choice | The **Throne Gate** decision (below). |

## Endings

- **Victory** (hold all three enemy capitals) → the Verge holds. Resolve per the Gate
  choice.
- **Defeat** (ground down to Aegis Prime alone) → the Verge falls. "The Verge keeps what
  it takes."
- **The Gate choice** (`sc_endgame`, optional richer ending):
  - **Destroy it** — deny everyone; starve the Hive of what wakes it. The Verge is safe
    but stays cut off and poor. Voss approves.
  - **Hold it** — the Alliance gets its weapon and reconnects the Verge, but the Gate
    keeps bleeding energy — the Hive will always be drawn back. A costly, uneasy triumph.
  - **Overload it into the Hive** — turn the Gate on Ul'Vor; a pyrrhic, spectacular
    end to the swarm that also destroys the relic. The most "pulpy" option.

## Implementation notes (for the build phase)

- **Story delivery** rides three rails: authored anchors (already on the map), `DATA.STORY`
  priority-op battles (already wired: trigger → chip → launch → advance chapter), and a new
  lightweight **interstitial** beat type (a narrative screen that advances the chapter with
  no battle) — a small addition to the story framework.
- **Triggers** all map to existing helpers: `Game.terranSystems()`, `systemOwner()`,
  `factionStrength('hive')`, capital ownership, and a "nemesis escaped" flag we set when a
  flee-VIP exits (the `sc_meridian` hook).
- **Nemesis (Skarr)**: reuse the flee-VIP escape hook — Skarr's courier/ship escapes in
  early ops; killing the DREADMAW at Dreadfall closes it.
- **Voss commentary** already reacts to war state (`vossWarLine`); the acts layer scripted
  lines on top at the beat triggers.
- Names to reuse from `data.js`: `WARLORD SKARR` (crimson commanders), `EXARCH VORUN`
  (za'argon commanders), `HIVE HEART 'Xorrath'` (hive pool), the DREADMAW hull.
