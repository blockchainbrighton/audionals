# Character Expressions v2 – Master Reference Document

This document is the **authoritative reference** for all character expressions, their metadata, and the full explanation of every configurable field in the v2 CSV schema. It is intended for designers, developers, and procedural systems.

---

## 1. Expression Index & Metadata

| ExpressionSymbol | GangName          | Description                                           | Archetype   | AggressionBias | SynergyTags               | OnKillEffect        | SoundProfile   |
| ---------------- | ----------------- | ----------------------------------------------------- | ----------- | -------------- | ------------------------- | ------------------- | -------------- |
| X(               | The Empaths       | Keepers of the old emotional web. They feel too much. | Support     | 0.35           | Emotion | Bio             | HealSmall           | WarmAnalog     |
| X)               | The Ravers        | Hedonistic speed-freaks chasing the eternal high.     | Skirmisher  | 0.75           | Chaos | Speed             | GainSpeed           | AcidBass       |
| X]               | The Glitchers     | Those who embrace the system errors.                  | Trickster   | 0.65           | Glitch | Chaos            | RandomTeleportBurst | GlitchBurst    |
| X{}              | The Shifters      | Fluid identities constantly rewriting their own code. | Controller  | 0.55           | Identity | Control        | ReduceCooldown      | PhaseShift     |
| XO               | The Hazed         | Perpetually confused but blissfully numb.             | Bruiser     | 0.40           | Status | Chaos            | ConfusePulse        | TapeWow        |
| XI               | The Stoics        | Emotionless logic cores. Unshakable.                  | Tank        | 0.30           | Logic | Defense           | GainShield          | ColdDrone      |
| X\               | The Iron Minds    | Sheer willpower manifesting as reality.               | Duelist     | 0.60           | Will | Force              | AdrenalSurge        | MetalPulse     |
| X{.              | The Vanguards     | Frontline disruptors with a hero complex.             | Tank        | 0.85           | Frontline | Aggro         | TauntRoar           | WarDrums       |
| X*               | The Archivists    | Hoarders of forbidden data.                           | Controller  | 0.25           | Data | Tech               | DropData            | BitcrushChimes |
| XV               | The Networkers    | Social engineers who own the nodes.                   | Support     | 0.45           | Network | Social          | CharmMark           | VocoderPop     |
| XQ               | The Observers     | They exist in superposition.                          | Trickster   | 0.50           | Quantum | Evasion         | DodgeRefresh        | ShimmerPad     |
| XD               | The Jesters       | To them existence is a punchline.                     | GlassCannon | 0.80           | Chaos | Crit              | CritBoost           | LaughGlitch    |
| XU               | The Naturals      | Rejecting the digital for the simulated organic.      | Support     | 0.40           | Bio | Nature              | HealOverTime        | OrganicPlucks  |
| XP               | The Punks         | Burn fast burn bright.                                | GlassCannon | 0.95           | Rage | Speed              | IgniteTrail         | DistortedLead  |
| XB               | The Decentralized | Autonomous agents of chaos.                           | Skirmisher  | 0.70           | Chaos | Economy           | DropCurrency        | ModemNoise     |
| XJ               | The Schemers      | Calculated cruelty.                                   | Assassin    | 0.85           | Crit | Control            | CritCashout         | SharpClicks    |
| XStacks          | The Whales        | Holders of the keys.                                  | Boss        | 0.65           | Wealth | Power            | DropBigCurrency     | SubDrone       |
| XBitcoin         | The OG            | The Genesis Block.                                    | Boss        | 1.00           | Genesis | Wealth | Mythic | AscendOnKill        | CathedralSynth |

---

## 2. Core Stat Modifiers

| Field      | Type  | Description                                             |
| ---------- | ----- | ------------------------------------------------------- |
| HpMod      | Float | Multiplier applied to base health pool                  |
| SpeedMod   | Float | Multiplier applied to movement and action speed         |
| DamageMod  | Float | Multiplier applied to outgoing damage                   |
| DefenseMod | Float | Multiplier applied to damage mitigation                 |
| PriceMod   | Float | Modifier affecting cost, value, or bounty               |
| LuckMod    | Float | Influences probabilistic systems (drops, crits, dodges) |

**Rules:**

* `1.0` = baseline
* `<1.0` = reduction
* `>1.0` = amplification

---

## 3. SpecialEffect Definitions

| SpecialEffect     | Explanation                               |
| ----------------- | ----------------------------------------- |
| None              | No rule-breaking effect                   |
| Regeneration      | Gradual HP restoration over time          |
| RandomTeleport    | Unpredictable short-range reposition      |
| CooldownReduction | Abilities recover faster                  |
| StatusResist      | Reduced duration/intensity of debuffs     |
| Aggro             | Forces enemy targeting                    |
| TechWiz           | Enhanced interaction with tech systems    |
| Charisma          | Improves social/economic outcomes         |
| DodgeChance       | Adds probabilistic evasion                |
| BioRegen          | Regeneration scaling with organic tags    |
| MoneyDrop         | Spawns extra currency                     |
| CritDmg           | Increases critical damage                 |
| GodMode           | Bypasses normal constraints (mythic only) |

---

## 4. Archetype Definitions

| Archetype   | Function                             |
| ----------- | ------------------------------------ |
| Tank        | Absorbs damage, controls enemy focus |
| Support     | Buffs, heals, or manipulates systems |
| Skirmisher  | Mobile hit-and-run combatant         |
| Controller  | Battlefield and rule manipulation    |
| Trickster   | Evasion, randomness, misdirection    |
| GlassCannon | High output, low survivability       |
| Assassin    | Burst damage and priority targeting  |
| Duelist     | Excels in single-target engagements  |
| Bruiser     | Durable close-range pressure         |
| Boss        | Encounter-defining entity            |

---

## 5. AggressionBias

**Range:** `0.0 – 1.0`

| Value Range | Behavior               |
| ----------- | ---------------------- |
| 0.0–0.3     | Passive / defensive    |
| 0.4–0.6     | Situational / reactive |
| 0.7–0.9     | Highly aggressive      |
| 1.0         | Relentless, no retreat |

Used by AI for engagement initiation, chase logic, and risk-taking.

---

## 6. SynergyTags

Soft, non-exclusive classification tags. Multiple tags are allowed and separated by `|`.

### Common Tag Groups

* **Chaos** – randomness, volatility
* **Bio** – organic, regenerative systems
* **Tech / Data / Network** – digital and informational systems
* **Wealth / Economy** – currency, value manipulation
* **Control / Defense / Speed / Crit** – mechanical focus
* **Mythic / Genesis** – singular or lore-critical entities

SynergyTags are used for:

* Procedural bonuses
* Mutation logic
* Factional reactions
* Seed bias

---

## 7. OnKillEffect Definitions

| OnKillEffect        | Effect                             |
| ------------------- | ---------------------------------- |
| HealSmall           | Restore a small amount of HP       |
| GainSpeed           | Temporary speed increase           |
| RandomTeleportBurst | Teleport with area disruption      |
| ReduceCooldown      | Shorten ability cooldowns          |
| ConfusePulse        | Apply confusion to nearby entities |
| GainShield          | Grant temporary shielding          |
| AdrenalSurge        | Short burst of combat stats        |
| TauntRoar           | Force enemy attention              |
| DropData            | Spawn data resource                |
| CharmMark           | Apply social debuff/buff           |
| DodgeRefresh        | Reset dodge chance                 |
| CritBoost           | Temporary crit chance increase     |
| HealOverTime        | Regenerative buff                  |
| IgniteTrail         | Damage-over-time area              |
| DropCurrency        | Spawn currency                     |
| CritCashout         | Convert crit chains into burst     |
| DropBigCurrency     | Large wealth payout                |
| AscendOnKill        | Permanent stat growth              |

---

## 8. SoundProfile Reference

Symbolic identifiers driving audio synthesis, FX routing, and UI feedback.

| SoundProfile   | Sonic Character                |
| -------------- | ------------------------------ |
| WarmAnalog     | Soft, harmonic, emotional      |
| AcidBass       | Aggressive, resonant, driving  |
| GlitchBurst    | Bitcrushed, erratic transients |
| PhaseShift     | Sweeping, unstable modulation  |
| TapeWow        | Warped, intoxicated texture    |
| ColdDrone      | Minimal, mechanical ambience   |
| MetalPulse     | Industrial, percussive         |
| WarDrums       | Martial, dominant rhythms      |
| BitcrushChimes | Digital, fragile, sharp        |
| VocoderPop     | Synthetic vocal artifacts      |
| ShimmerPad     | Ethereal, high-frequency glow  |
| LaughGlitch    | Chaotic, comedic distortion    |
| OrganicPlucks  | Acoustic-inspired synthesis    |
| DistortedLead  | Saturated, aggressive melody   |
| ModemNoise     | Data-era artifacts             |
| SharpClicks    | Precision, surgical attacks    |
| SubDrone       | Low-frequency oppressive mass  |
| CathedralSynth | Monumental, sacred, mythic     |

---

## 9. Design Principles

* Every field is **orthogonal** and optional.
* Emergence is driven by **SynergyTags + OnKillEffect**.
* Feel differentiation is primarily achieved via **AggressionBias + SoundProfile**.
* Mythic entities intentionally violate balance norms.

---

**End of Master Reference**
