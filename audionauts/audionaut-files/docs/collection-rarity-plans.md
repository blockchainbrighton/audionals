# Audionauts Ordinals – Collection Rarity & Trait Distribution Plan (v1.1‑draft)

> **Purpose**
> Provide a clear, test‑driven blueprint for generating **888** unique, provably‑ranked *Audionaut* inscriptions on Bitcoin (BRC‑721 style).
> **v1.1** introduces a dual‑style helmet layer (pixel & high‑fidelity) and expands the common‑badge set so the supply maths closes *exactly* at 888 without exclusions.

---

## 1 Collection at‑a‑glance

| Dimension                 | Variants                                                                            | Notes                                                   |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Image‑Reveal Timeline** | 21 (timeline‑1 … timeline‑21)                                                       | 5‑star rarity tiers (Section 3).                        |
| **Helmet Finish**         | **6** – Gold‑Pixel, Silver‑Pixel, Bronze‑Pixel, Gold‑Real, Silver‑Real, Bronze‑Real | Pixel ≈ 40 kB PNGs; Real ≈ 200 kB PNG/GIF.              |
| **Visor HUD**             | 1 (No‑HUD) – *reserved for v2*                                                      | Placeholder layer left at 1 so supply maths works.      |
| **Badge**                 | **48** total                                                                        |                                                         |
| • 5 × *Common*            |                                                                                     |                                                         |
| • 43 × *Limited*          | Common badges repeat per timeline×helmet; Limited rule in §4.                       |                                                         |
| **Supply**                | **888** inscriptions                                                                | Deterministically generated, no excluded combos needed. |

---

## 2 Trait hierarchy & on‑chain ordering

1. **Timeline**
2. **Helmet Finish** (pixel/real)
3. **Visor HUD** (future‑proof)
4. **Badge**

---

## 3 Timeline rarity tiers

| ★ Tier    | Timelines | % of Supply | Planned Supply |
| --------- | --------- | ----------- | -------------- |
| ★★★★★     | 1‑3       | 4 %         | 36             |
| ★★★★☆     | 4‑6       | 10 %        | 90             |
| ★★★☆☆     | 7‑12      | 32 %        | 288            |
| ★★☆☆☆     | 13‑18     | 36 %        | 324            |
| ★☆☆☆☆     | 19‑21     | 18 %        | 150            |
| **Total** | 21        | 100 %       | **888**        |

---

## 4 Badge taxonomy & usage rules

### 4·1 Common badges (now **5**)

| Name                           | Pixel‑friendly? | Rationale                                          |
| ------------------------------ | --------------- | -------------------------------------------------- |
| Original Audionals Inscription | ✓               | Project provenance.                                |
| BAM LOGO                       | ✓               | Brand anchor.                                      |
| gym.btc                        | ✓               | Community shout‑out.                               |
| proto.audinal                  | ✓               | References the *Bitcoin Audinal Matrix* prototype. |
| 1UP                            | ✓               | Gaming nod & rarity meme.                          |

> **Frequency**: 21 timelines × 6 helmets = **126** sightings per common badge → 630 total.

### 4·2 Limited badges (unchanged, 43)

*Rule:* max **one** copy per `(helmet)` (visor is fixed at 1 for now) → 43 × 6 = **258** limited slots.

Common 630 + Limited 258 = **888**.

---

## 5 Helmet finish weighting

To align with the new goal that **only about 10 % of all helmets are high‑fidelity real renders**, the split is now:

| Rarity Rank | Finish       | % of Supply | Approx. Count | Notes                   |
| ----------- | ------------ | ----------- | ------------- | ----------------------- |
| **#1**      | Gold‑Real    | 2.3 %       | 20            | Ultra‑rare real render. |
| **#2**      | Bronze‑Real  | 3.2 %       | 28            | Baseline real.          |
| **#3**      | Silver‑Real  | 4.5 %       | 40            | Most common real.       |
| **#4**      | Gold‑Pixel   | 25.9 %      | 230           | Premium pixel.          |
| **#5**      | Bronze‑Pixel | 29.3 %      | 260           | Common pixel baseline.  |
| **#6**      | Silver‑Pixel | 34.9 %      | 310           | Main pixel tier.        |
| **Total**   | —            | **100 %**   | **888**       |                         |

Distribution is enforced *within each timeline tier* so star‑tier rarity and helmet rarity remain orthogonal.

## 6 Pixel‑helmet design guidelines (new) Pixel‑helmet design guidelines (new) Pixel‑helmet design guidelines (new) Pixel‑helmet design guidelines (new) Pixel‑helmet design guidelines (new) Pixel‑helmet design guidelines (new)

* **Base inscription slot (chin‑strap)** – Fits up to 4 px‑wide glyphs: e.g. `BAM`, `₿`, `A`, `1UP`.
* **Crown emboss** – 5×5 px area on top ridge; recommended icons: `₿`, stylised `A`, hash‐symbol `#`.
* **Palette** – 4‑shade ramp per metal (inspired by NES sprite limits) for authenticity & lightweight files.
* **Easter‑egg mapping** – Rare drop (<1 %) that swaps the centre ear‑cup pixel to *rainbow* (ties to Rainbow badge).

Real helmets retain engraved text in vector, matching the imagery you supplied.

---

## 7 Supply maths proof (T=21, C=5, L=43, H=6, V=1)

```text
Supply  = (21·C + L) × H × V
        = (21·5  + 43) × 6 × 1
        = (105 + 43) × 6
        = 148 × 6
        = 888  ✅
```

---

## 8 Rarity score & metadata → unchanged from v1.0

---

## 9 Roadmap delta

1. **Art:**   pixel helmet sheet (3 colours, 6–8 frames if animated).  <br>High‑res real helmet sheet already WIP; add Rainbow if stretch goal.
2. **Generator:**   update `/layers/helmets/` naming convention `gold_pixel.png`, etc.; extend weighting YAML.
3. **Badges:**   deliver 3 new SVG commons.
4. **Tests:**   add `test/supply.e2e.ts` – asserts total combinations exact 888.

---

## 10 Seven‑helmet contingency (Rainbow‑Real)

*Add a seventh helmet (Rainbow‑Real) but keep C = 4 commons to avoid supply drift.*

```text
Supplyʹ = (21·4 + 43) × 7 = 127 × 7 = 889
```

Mint plan: generate **889** but **burn #000 (Rainbow‑Real ★☆☆☆☆)** to land back on 888.  Simple, on‑chain verifiable.

---

*Document v1.1‑draft • 3 Jul 2025 • Maintainer: @OrdDev*
