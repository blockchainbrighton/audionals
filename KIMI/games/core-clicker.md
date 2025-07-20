# 🎮 CoreClicker – Player Guide

> A minimalist, prestige-based idle / clicker game built with nothing but HTML, CSS and vanilla JS.  
> **Goal:** Generate **Energy** → buy upgrades → **Prestige** → repeat faster.

---

## 🧭 Quick Start (30 s)

1. **Click the glowing atom** to earn **Energy**.
2. Spend Energy on **×2 Multiplier** or **Auto Clicker**.
3. When progress slows, **Prestige** to gain **Quarks** (permanent × to *everything*).
4. Repeat faster each run.

---

## 📊 Stat Panel Explained

| Stat | What it does |
|------|--------------|
| **Energy** | Currency for upgrades. |
| **Multiplier** | Click value = `Multiplier × Quark`. |
| **Auto / s** | Passive Energy per second = `Auto × Quark`. |
| **Quark×** | Global multiplier applied to *every* source of Energy. Starts at 1. |

---

## 🔧 Upgrades

### ×2 Multiplier
- **Effect:** Doubles your click value permanently (this run only).  
- **Cost curve:** Starts at **20 Energy**; every purchase multiplies the **next** cost by roughly `2 + 0.05 × current multiplier` (capped at 50×).  
- **Tip:** Early on you’ll need ~20 clicks per doubling; later runs feel more incremental.

### Auto Clicker
- **Effect:** Adds **+1 Energy / s** passive income.  
- **Cost curve:** Starts at **50 Energy**, increases by 1.5× each purchase.  
- **Tip:** Grab 2–3 early to let the game idle while you read this guide.

### Prestige
- **When to press:** Energy income is crawling.  
- **Effect:** Resets *all* run-specific progress (Energy, Multiplier, Auto) but gives  
  `Quarks = floor(√(Energy / 1000))`  
  These Quarks multiply **everything** forever.  
- **Tip:** Your first prestige at ~1 000 Energy gives 1 Quark; 100 000 Energy gives 10 Quarks, etc.

---

## 🔄 Game Loop Cheat-Sheet

1. **Click & save** 20 Energy → buy first ×2.  
2. **Repeat** until ×8-×16 Multiplier.  
3. **Buy 3–5 Auto Clickers** so the game plays itself.  
4. **Keep doubling** until a single upgrade costs more than 30 s of idling.  
5. **Prestige** → start over with higher Quark×.  
6. **Each prestige run is ~2-5× faster** than the last.

---

## ⚠️ Reset All Progress
- **Red button** at the bottom.  
- **Wipes *everything***: Energy, Quarks, local save.  
- Use only if you want a completely fresh start.

---

## 🎯 Advanced Tips

| Tip | Reason |
|-----|--------|
| **Balance Multiplier and Auto** | Too much Multiplier without Auto forces endless clicking; too much Auto without Multiplier slows prestige gain. |
| **Prestige often** | Quark income is square-root, so doubling Energy quadruples Quarks. |
| **Leave it overnight with Auto** | Even 20 Auto Clickers × 10 Quarks = 200 Energy / s → 720 k in an hour. |
| **Watch the cost multiplier** | After ×256 Multiplier the ×2 upgrade cost multiplier hits ~14×, so plan longer grinds or prestige sooner. |

---

## 🎨 Easter Eggs

- Every day the atom hue-shifts based on the date.  
- Electrons orbit at different speeds—purely cosmetic, but hypnotic.

---

Enjoy the grind, and may your Quarks multiply!