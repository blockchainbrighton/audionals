# Audionauts Ordinals – Collection Rarity & Trait Distribution Plan

> **Purpose**
> Provide a clear, test‑driven blueprint for generating **888** unique, provably‑ranked *Audionaut* inscriptions on Bitcoin using the Ordinals protocol.
> This document formalises trait definitions, rarity weighting, metadata schema, and a reproducible allocation algorithm so that the final collection is transparent, verifiable, and optimised for long‑term collector value.

---

## 1 Collection at‑a‑glance

| Dimension                 | Variants                                                                                                  | Notes                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Image‑Reveal Timeline** | 21 (timeline‑1 … timeline‑21)                                                                             | Lower index ⇒ *rarer / higher visual quality*. Ranked with a ★‑system (Section 3). |
| **Helmet Finish**         | 3 (Gold, Silver, Bronze)                                                                                  | Gold most sought‑after; Bronze baseline.                                           |
| **Badge**                 | 45 total                                                                                                  |                                                                                    |
|   • 2 × *Common*          |                                                                                                           |                                                                                    |
|   • 43 × *Limited*        | Badges act as provenance stamps. Common badges recur broadly; Limited badges are constrained (Section 4). |                                                                                    |
| **Supply**                | **888** inscriptions                                                                                      | No duplicates across the entire trait matrix.                                      |

---

## 2 Trait hierarchy & on‑chain ordering

1. **Timeline** (macro‑rarity & visual fidelity)
2. **Helmet Finish** (material prestige)
3. **Badge(s)** (provenance & sub‑collection narrative)

The rendering pipeline first selects a timeline slot, then applies the helmet finish overlay, and finally stamps the designated badge(s). This order is crucial for deterministic rendering hashes.

---

## 3 Timeline rarity tiers

To keep the reveal cadence intuitive we map the 21 timelines into a 5‑star scale:

| ★ Tier    | Timelines | % of Total Supply | Planned Supply\* |
| --------- | --------- | ----------------- | ---------------- |
| ★★★★★     | 1 – 3     |  ≈ 4 %            |  36              |
| ★★★★☆     | 4 – 6     |  ≈ 10 %           |  90              |
| ★★★☆☆     | 7 – 12    |  ≈ 32 %           |  288             |
| ★★☆☆☆     | 13 – 18   |  ≈ 36 %           |  324             |
| ★☆☆☆☆     | 19 – 21   |  ≈ 18 %           |  150             |
| **Total** | **21**    | **100 %**         | **888**          |

\*Rounded to preserve whole inscriptions while respecting the star‑tier percentages. The generator script (Section 7) enforces these maxima and can be tuned if marketing or community feedback dictates slight shifts.

---

## 4 Badge taxonomy & usage rules

### 4·1 Common Badges (appearing in *every* timeline × helmet combo)

| Name                           | Rationale                                     |
| ------------------------------ | --------------------------------------------- |
| Original Audionals Inscription | A unifying provenance stamp.                  |
| BAM LOGO                       | Brand anchor recognised across the ecosystem. |

> **Frequency**: 21 timelines × 3 helmets = **63** occurrences each → 126 total common‑badge impressions.

### 4·2 Limited Badges (max 1 per helmet across the entire collection)

The remaining **43** badges are grouped by narrative sub‑collection (as provided) and obey the rule:

> **At most one Gold, one Silver, and one Bronze copy of the badge in the entire 888‑piece collection.**

This gives a hard upper bound of 43 × 3 = 129 Limited‑badge impressions.

### 4·3 Supply mismatch & resolution

Common + Limited supply so far: 126 + 129 = 255 < 888.
We must therefore *layer* badges.

Proposed resolution:

1. **Dual‑Badge Composition** – Each Audionaut always carries **one Common + one Limited** badge.
2. **Selective Re‑use of Limited Badges** – Allow a Limited badge to repeat across *timelines* while still honouring the “≤1 per helmet” rule. Example: Nat Atlas/Gold could live on timeline‑1 **and** timeline‑15 simultaneously, but there will never be another Nat Atlas/Gold thereafter.

With dual‑badging the theoretical upper‑bound inscriptions become:

* **Common slots**: 888 (each inscription gets exactly 1 Common badge; they cycle evenly between the two commons → 444 & 444)
* **Limited slots**: 888 (each inscription also gets exactly 1 Limited badge)

Because we only have 129 distinct Limited slots under the old constraint, **we relax the rule**:

> A Limited badge may repeat *up to **7 × per helmet*** (3 helmets × 7 = **21** impressions per badge) before the generator seeks another badge.
> 43 badges × 21 = 903 impressions → gives a 1‑of‑n buffer for burn/mint errors.

The exact repetition cap is configurable in `config/badges.yaml`.

---

## 5 Helmet finish weighting

| Finish     | Visual Treatment          | Planned Supply |
| ---------- | ------------------------- | -------------- |
| **Gold**   | Metallic + animated glint | 20 % (≈ 178)   |
| **Silver** | Brushed steel             | 35 % (≈ 311)   |
| **Bronze** | Matte patina              | 45 % (≈ 399)   |

Percentages apply **within each timeline tier** to avoid front‑loading rare timelines with rare helmets.

---

## 6 Rarity score & leaderboard

We adopt the *Trait Rarity Score* popularised by OpenSea but computed off‑chain before inscription:

```text
rarityScore(token) = Σ (1 / occurrenceRate(traitVariant))
```

Key outputs:

* JSON & CSV leaderboards committed to `/data/rarity‑v1/`.
* Top‑888 ranking stored as an inscription itself for full on‑chain auditability.

---

## 7 Generation pipeline (TDD‑friendly)

<details>
<summary>Setup summary</summary>

```bash
git clone audionauts‑ordinals.git && cd audionauts‑ordinals
pnpm install  # Node 18 LTS
```

| Directory              | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `/layers/helmets/`     | 3 PNG stacks per finish.                   |
| `/layers/timelines/`   | 21 MP4 > GIF sequences.                    |
| `/layers/badges/`      | 45 SVG badges.                             |
| `/scripts/generate.ts` | Deterministic builder (uses seedable RNG). |
| `/tests/`              | Jest suites (coverage ≥ 95 %).             |

````

Run the generator with a reproducible seed and export metadata:
```bash
pnpm generate --seed 0xAUDIO2025
````

</details>

---

## 8 Token metadata schema (BRC‑721‑compatible†)

```json
{
  "name": "Audionaut #531",
  "description": "An interstellar audio explorer charting the Bitcoin multiverse.",
  "attributes": [
    { "trait_type": "Timeline", "value": "timeline‑4", "rarity_tier": "★★★★☆" },
    { "trait_type": "Helmet", "value": "Silver" },
    { "trait_type": "Badge (Common)", "value": "Original Audionals Inscription" },
    { "trait_type": "Badge (Limited)", "value": "Hash One #101" },
    { "display_type": "number", "trait_type": "Rarity Score", "value": 114.27 }
  ],
  "media": "ipfs://…/timeline‑4/silver/531.gif",
  "compiler": "audionauts‑generator v1.0.0"
}
```

†We store the JSON on IPFS/Filecoin and inscribe the CID as content‑hash data for full decentralisation.

---

## 9 Outstanding decisions & TODOs

1. **Confirm Common Badge Count** – Spec says 2 commons yet lists 4. Decide final set & deprecate extras or recategorise.
2. **Limited Badge Repetition Cap** – Finalise ≤ 7 or alternative multiplier to hit 888 supply cleanly.
3. **Motion vs Static Assets** – Final file sizes must remain ordinal‑friendly (< 350 kB recommended).
4. **Launch Schedule** – Coordinate timeline star tiers with mint phases or Dutch‑auction pricing.
5. **Security Audit** – Run full‑stack review (scripts, metadata, IPFS pinning) before first inscription.

---

## 10 Next steps

1. **Approve or amend this plan.**
2. Freeze trait counts in `config/*.yaml` and tag `v0.9.0`.
3. Begin *red‑team mint simulation* (1 week).
4. Schedule community AMA to walk collectors through rarity maths.
5. Lock seed & inscribe Genesis block of leaderboards.

---


---


---


---





*Document version 1.0 • 3 July 2025 • Maintainer: @OrdDev*



Below is a **single-page “options matrix”** with the hard numbers you asked for.
I kept every assumption explicit so you can sanity-check the arithmetic and the rarity implications before we touch the master plan.

---

## 1 Key variables & formula recap

| Symbol             | Meaning                                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T = 21**         | timelines (fixed)                                                                                                                                                                                     |
| **C**              | common-badge variants (≥ 2)                                                                                                                                                                           |
| **L = 43**         | limited-badge variants (unchanged)                                                                                                                                                                    |
| **H**              | helmet finishes (3 now, up to 6)                                                                                                                                                                      |
| **V**              | visor-HUD variants (1 = *no visor layer*)                                                                                                                                                             |
| **Rule set**       | • Each *common* badge appears **once per (timeline × helmet × visor)**  <br>• Each *limited* badge appears **once per (helmet × visor)**  <br>• Exactly **one badge** per Audionaut (no dual-badging) |
| **Supply formula** | **Supply = (21 × C + L) × H × V**                                                                                                                                                                     |

The 21 × C term reflects the “one-per-timeline” rule that applies only to common badges.

---

## 2 Combinations that land *exactly* on 888

| ID      | Helmets<br>(H)                 | Visor HUDs<br>(V)                | Common badges<br>(C)                                       | Maths                            | Supply  | Workload summary                                                    |
| ------- | ------------------------------ | -------------------------------- | ---------------------------------------------------------- | -------------------------------- | ------- | ------------------------------------------------------------------- |
| **E-1** | **3** (Gold / Silver / Bronze) | **2** (e.g. *No HUD*, **HUD-A**) | **5** (current 2 + **3 new** text badges – *gym.btc* etc.) | (21 × 5 + 43)=148 → 148 × 3 × 2  | **888** | **✓ Minimal art**  <br>• 2 visor assets  <br>• 3 simple text badges |
| **E-2** | **6** (add 3 prestige shells)  | 1 (no visor layer)               | **5**                                                      | same numerator 148 → 148 × 6 × 1 | **888** | • 3 new helmet renders  <br>• 3 new badges  <br>✗ No HUD gimmick    |

Both solutions give identical trait weights:

* per common badge = 21 × 3 × 2 = **126** sightings
* per limited badge = 3 × 2 = **6** sightings
* Supply split 630 common (71 %)  |  258 limited (29 %)

---

## 3 “Close, but not exact” fallback sets

| ID      | H | V     | C | Supply    | Gap vs 888 | Typical fix                                                   |
| ------- | - | ----- | - | --------- | ---------- | ------------------------------------------------------------- |
| **N-1** | 5 | **2** | 2 | **850**   | −38        | Mint 38 extra *limited* copies on premium timelines           |
| **N-2** | 4 | **2** | 3 | **848**   | −40        | Same as above (40 fill-ins)                                   |
| **N-3** | 3 | **4** | 2 | **1 020** | +132       | Pre-assign 132 low-tier combos to “never mint” exclusion list |
| **N-4** | 3 | **3** | 3 | **954**   | +66        | Smaller exclusion list (66)                                   |

All near-miss sets still respect the one-badge rule; they just need either (a) a top-up of special releases or (b) an exclusion file.

---

## 4 Recommendation

| Want                                        | Pick                                   | Rationale                                                                                                                                       |
| ------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smallest new art budget**                 | **E-1** (3 helmets, 2 HUDs, 5 commons) | • Only **five** new PNG/SVG assets in total  <br>• Leverages the visor layer you already started  <br>• Exact 888, no pruning or ad-hoc top-ups |
| Showcase fresh helmet tech                  | E-2                                    | Adds three prestige shells but no visor stretch goal                                                                                            |
| Comfortable with micro-overshoot/under-mint | N-1 or N-2                             | ±40 combos are easy to explain away or fill with “event” mints                                                                                  |

---

## 5 Next steps if you approve **E-1**

1. **Add three text-badge SVGs**
   *gym.btc • your-name • badge-X* (or any two others).

2. **Lock in two visor variants**
   *No HUD* (clear glass) & *Matrix Scroll* (green code).

3. **Update the rarity-plan document**

   * Change C = 5, V = 2, recalc tables.
   * Specify that limited badges are now “once per helmet × visor”.

4. **Adjust generator config** (`config/traits.yaml`) and add Jest tests to assert total = 888.

Just say the word and I’ll patch the document and sample config.
