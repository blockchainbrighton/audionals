# Astronaut Helmet Array Format Specification

This document explains the required file format and conventions for adding new helmet arrays to the pixel art astronaut helmet editor.
Follow this guide exactly to ensure your array files will load and render properly.

---

## 1. File Format: **Rich Text Format (RTF)**

All array files **must be valid RTF files** (not plain text).
This means the file begins with the RTF header and contains the palette and RLE string in a single RTF paragraph.

### Example Structure

```rtf
{\rtf1\ansi\ansicpg1252\cocoartf1671\cocoasubrtf600
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 PALETTE;RLE_STRING;SIZE}
```

* **Everything between `{` and `}` is part of the RTF file.**
* **No line breaks inside the data after `\cf0` (all one line).**
* Save with `.rtf` extension.

---

## 2. Data Block (After `\cf0`)

The **data block** is three semicolon-separated parts:

```
palette;rle_string;size
```

**Example:**

```
000000,ffd700,fffbe7,fff9c4,ffb734,221508,ff4200,ffffff,8a4613,000000,f97400,e15b00,b74a00,00ffff,000000,333333;7:20,6:1,...;64
```

### 2.1 Palette

* **Comma-separated hex color codes.**
* Each entry is a color: `000000` (black), `ffd700` (gold), etc.
* Maximum 16 colors.
* **Order is important:**

  * Palette index `0` = first color
  * Palette index `1` = second color
  * Palette index `2` = third color, etc.
  * Palette index `a` = 11th color (hex), `f` = 16th (hex).
* **Common convention:**

  * Index `0` is usually black/background.
  * Index `7` is usually visor/transparent (white).

### 2.2 RLE String

* **Run-Length Encoded (RLE) pixel data.**

* Format: `[symbol]:[count]` entries, comma-separated.

  * `[symbol]` is a base-16 digit/letter (`0-9`, `a-f`), matching a palette index.
  * `[count]` is the number of times this color repeats.

* Example:

  * `0:5,1:3,a:4` = 5x palette\[0], 3x palette\[1], 4x palette\[10].

* **There must be exactly `size × size` pixels.**

  * For 64×64, total counts must sum to 4096.

### 2.3 Size

* The grid size (typically `64`).

---

## 3. Required Conventions

* **Palette length must match the highest symbol used in RLE.**

  * If RLE contains `f`, palette must have at least 16 entries.
* **Do not use RLE symbols that aren't defined in your palette.**
* **Background color** (usually `0`/black) and **visor color** (usually `7`/white or transparent) should be consistent with your app’s expectations.
* **Visor pixels**: Use the visor index (commonly `7`) for the helmet’s visor/transparent area.

---

## 4. Example Minimal File

```rtf
{\rtf1\ansi\ansicpg1252\cocoartf1671\cocoasubrtf600
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 000000,fffbe7,ffffff,ffd700,221508,00aaff,00ffd0,eeeeee,ffb734,888888,cccccc,888888,ff4200,00ffff,9932cc,aa3366;0:32,7:32,...;64}
```

---

## 5. Common Problems & Solutions

**Problem:** `Cannot read properties of undefined (reading '0')`
**Cause:** RLE uses a palette index that isn’t defined.
**Solution:** Make sure your palette has enough colors for every symbol in the RLE.

**Problem:** Art loads but visor/transparent is wrong.
**Cause:** Wrong index used for visor in RLE, or wrong color in palette slot.
**Solution:** Always use the same palette slot for visor as in the amethyst reference (typically index `7`).

---

## 6. Tips

* **Copy the full RTF structure from a working file when making a new one.**
* Only change the palette and RLE data block (after `\cf0 ...`).
* Validate by counting colors and RLE indices before saving.

---

## 7. Template

```rtf
{\rtf1\ansi\ansicpg1252\cocoartf1671\cocoasubrtf600
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 [palette];[rle];[size]}
```

---

## 8. Advanced: Palette Index Key

| RLE Symbol | Palette Index | Example Usage    |
| :--------: | :-----------: | :--------------- |
|      0     |       0       | Background/Black |
|      1     |       1       | Highlight        |
|      7     |       7       | Visor/White      |
|      a     |       10      | Accent Color     |
|      f     |       15      | Shadow           |

---

## 9. Example (Solar Flare Theme)

```rtf
{\rtf1\ansi\ansicpg1252\cocoartf1671\cocoasubrtf600
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 000000,ffd700,fffbe7,fff9c4,ffb734,221508,ff4200,ffffff,8a4613,000000,f97400,e15b00,b74a00,00ffff,000000,333333;[RLE STRING];64}
```

*Replace `[RLE STRING]` with your helmet data.*

---

## 10. Quick Checklist

* [ ] **File is valid RTF**
* [ ] **Palette and RLE in single paragraph after `\cf0`**
* [ ] **Palette has enough colors for all RLE indices**
* [ ] **Background, visor, and feature colors match intended indices**
* [ ] **No extra whitespace or line breaks in data block**
* [ ] **Total RLE pixel count = size × size**

---

**Format correctly and your helmet will always load!**
