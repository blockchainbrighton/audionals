# Audional Sequencer X — **Agent Reference**

This document explains **how to produce serialised song data** that the Audional Sequencer X (ASX) can load directly.
It is intended for:

* **AI generation agents** (LLM prompts, scripts, etc.)
* **MCP (human) agents** who curate or post‑process AI output.

---

## 1. What you are creating

* A **project file** is JSON (not binary).
* Two flavours are supported:

| Flavour           | Top‑level `type` field | Purpose                            |
| ----------------- | ---------------------- | ---------------------------------- |
| *Single‑sequence* | *(omit)*               | One pattern (64 steps) — simplest. |
| *Multi‑sequence*  | `"multi-sequence"`     | A song made of several patterns.   |

All files include the mandatory `meta` object:

```jsonc
"meta": {
  "appName": "AudionalSequencer",
  "version": "2.0",
  "createdAt": "2025-06-20T12:34:56.789Z"
}
```

*Always keep `version` in sync with the codebase — currently **2.0***.

---

## 2. Project‑level fields

| Field         | Type           | Default                        | Notes                                                              |
| ------------- | -------------- | ------------------------------ | ------------------------------------------------------------------ |
| `projectName` | string         | `"Audional Sequencer Project"` | Omit when equal to default.                                        |
| `bpm`         | number ‑ float | `120`                          | Whole project tempo. Match loop BPMs or use built‑in time‑stretch. |
| `channels`    | array          | *none*                         | Up to **16** channel objects (see below).                          |

For **multi‑sequence** files add:

```jsonc
"type": "multi-sequence",
"sequences": [
  {
    "name": "Intro",
    "data": { /* single‑sequence object exactly as above */ }
  },
  {
    "name": "Drop",
    "data": { ... }
  }
]
```

---

## 3. Channel object

Each channel is *delta‑encoded*: only values that differ from the internal defaults are written.
Long property names are shortened to conserve space during serialisation:

| Long name             | Short key         | Default       | Comment                                |
| --------------------- | ----------------- | ------------- | -------------------------------------- |
| `i`                   | *(already short)* | index 0‑15    | **Always present** — channel position. |
| `name`                | `n`               | `"Channel X"` | Optional friendly label.               |
| `src`                 | `src`             | `null`        | Sample **ID** from the table in §5.    |
| `steps` (64‑bool)     | `s`               | all `false`   | Base‑64 string, see §4.                |
| `volume`              | `v`               | `0.8`         | 0‑1 linear.                            |
| `pitch` *(semitones)* | `p`               | `0`           | ± for coarse tune.                     |
| `reverse`             | `r`               | `false`       | Play buffer backwards.                 |
| `mute`                | `m`               | `false`       |                                        |
| `solo`                | `o`               | `false`       |                                        |
| `trimStart`           | `ts`              | `0`           | 0‑1 buffer fraction.                   |
| `trimEnd`             | `te`              | `1`           | 0‑1 buffer fraction.                   |
| `fadeInTime`          | `fi`              | `0`           | Seconds.                               |
| `fadeOutTime`         | `fo`              | `0`           | Seconds.                               |
| `hpfCutoff`           | `hpf`             | `20`          | Hz.                                    |
| `lpfCutoff`           | `lpf`             | `20000`       | Hz.                                    |
| `eqLowGain`           | `eql`             | `0`           | dB.                                    |
| `eqMidGain`           | `eqm`             | `0`           | dB.                                    |
| `eqHighGain`          | `eqh`             | `0`           | dB.                                    |

> **Channel pruning rule**
> During serialisation any channel with **no `src` and no active steps** is **omitted** entirely.

---

## 4. Step‑grid encoding (`s`)

The step grid is always **64 steps** long.

1. Divide the boolean array into **8 bytes** (LSB = first step).
2. Encode those 8 bytes using **Base‑64** → **12‑character** string.
3. Assign the string to `s`.

> Example (`true` on steps 0 & 4):
>
> ```js
> const steps = Array(64).fill(false);
> steps[0] = steps[4] = true;
> const s = "AQEA////////"; // result of the helper `stepsToB64`
> ```
>
> You do **not** need to include `s` if the channel has no active steps (e.g. pure one‑shot).

---

## 5. Built‑in sample catalogue (`src` values)

Use these **content‑addressed IDs** exactly as shown.
*Loops* explicitly include their native BPM in the label; *one‑shots* do not.

| Label                                       | BPM | Sample ID                                                                   |
| ------------------------------------------- | --- | --------------------------------------------------------------------------- |
| Audional Sample #1, 125BPM                  | 125 | `6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0`        |
| Melophonic Bass + Kick, 125BPM              | 125 | `0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0`        |
| Melophonic Snare                            | -   | `6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0`        |
| Neill Armstrong "One small step for man..." | -   | `6d8be8186e63b4557e51edd66184a567bc6f5f9f5ba4bb34ba8c67e652c1934ei0`        |
| 8 Bit Drum Loop, 105BPM                     | 105 | `3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0`        |
| Pump It                                     | -   | `43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0`        |
| Wobble Bass, 125BPM                         | 125 | `fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0`        |
| Audional Jim                                | -   | `c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0`        |
| Denim Avengers Kick                         | -   | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0`        |
| Denim Avengers Kick                         | -   | `5b2dc7be28ad70c233b06d0ba23888aa38eb8711c24f8462d2774ac5fb7e7212i0`        |
| Denim Avengers Snare                        | -   | `3d58cb1cd08c2b675777e79ea77ff1b946a77bd1e3c505291d97b310c5375fc8i0`        |
| Denim Avengers Snare                        | -   | `9e8fbb14e11fb6f3d5e6bff7f5cda12009fd12c4c6dfedd750d6e2b1d4f3fe4fi0`        |
| Denim Avengers Shake                        | -   | `f6f0cda18a72451121c1078e419459ba97c0fb4e2dd4d8a851cf6375a7d1051ai0`        |
| Denim Avengers Shake                        | -   | `f4827571dfcb1c16d173c4d34e9b13181d9c195db0d3e2ab49f0d5f7ee80435bi0`        |
| Denim Avengers Shake                        | -   | `ffd5134025991319fdf4d65e8e6fd585f528a3aaf55e0128b2d37af5c313b2d8i0`        |
| OB1 #1 - Bendy Bass                         | -   | `a89cb4f8301b91cb89cdb27468a4e3f17c65417f266c9de9ba2431367b17429ai0`        |
| OB1 #2 - Punchy Kick                        | -   | `cee891630be8cf309ddcab1727f3e7008877d6f9f4f65cbc7e13e6e366059042i0`        |
| OB1 #3 - Clap                               | -   | `a36237350a73fc99f61cdec28a62af8bb5209606db831f25beeffde69ccffc7fi0`        |
| OB1 #4 - Rim Shot                           | -   | `b8e5610e6069a3d01ab9fe6c42a4f274b04e69b559c8613f6d742e813fdc4ae7i0`        |
| OB1 #5 - Perc Hit                           | -   | `596a1a01e18636648b33c886c2e5876f40eee3aa151ebca95cad25b8963c311di0`        |
| OB1 #6 - Synth Bass 1                       | -   | `880e59ede0131215db759d85a0ce9fcebf273e511e5eab3b922ca3fb5bb0f984i0`        |
| OB1 #7 - Synth Bass 2                       | -   | `de18b56a7611efbcd3bb27383ae149f24b605d75ea99df033a6cbb6de2389455233bf51i0` |
| OB1 #8 - Synth Bass 3                       | -   | `1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0`        |
| OB1 #9 - Hard Kick                          | -   | `437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0`        |
| OB1 #10 - Hard Snare                        | -   | `3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0`        |
| OB1 #11 - Small Click                       | -   | `1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0`        |
| OB1 #12 - DJ Scratch                        | -   | `228947e9fc52e44d3a22e84aed7bbaeff08d60c5f925aa6be7e265d210425c28i0`        |
| OB1 #13 - Glockenspiel                      | -   | `578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0`        |
| OB1 #14 - Cowbell                           | -   | `3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0`        |
| OB1 #16 - Bass Drop                         | -   | `b77fb3b299477ca55ab2626dbbc12c0d5fa9d4cf51ae00850caae6e36baef745i0`        |

### Usage guidelines

* **Match tempos**: choose project `bpm` equal to the majority of loop BPMs.
* **Cross‑tempo tricks**: half‑time (divide by 2) or double‑time (×2) are acceptable.
* **One‑shots** (kicks, snares, vox) are agnostic to tempo — place them on precise steps.
* **Stereo image & EQ**: keep bass <100 Hz mono, use `eql`/`eqm`/`eqh` for pocketing.
* **Dynamic range**: leave at least −6 dB headroom (watch total `volume` mix).
* **Channel order convention** (not enforced):

  1. Drums
  2. Percussion
  3. Bass
  4. Harmony / Leads
  5. FX / Vox

---

## 6. Minimal single‑sequence example

```jsonc
{
  "meta": { "appName": "AudionalSequencer", "version": "2.0", "createdAt": "2025-06-20T12:34:56Z" },
  "projectName": "Demo beat",
  "bpm": 125,
  "channels": [
    {
      "i": 0,
      "src": "6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0",
      "s": "////////////////",   // continuous 4‑bar loop
      "v": 0.9,                // louder than default
      "n": "Main drum loop"
    },
    {
      "i": 1,
      "src": "3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0",
      "s": "AQAAAAD//////8=",  // snare on 2 & 4
      "n": "Snare"
    }
  ]
}
```

---

## 7. Checklist before exporting

* [ ] `meta.version` = **2.0**
* [ ] `bpm` matches loop sources or is musically intentional.
* [ ] No empty channels retained.
* [ ] All Base‑64 strings exactly 12 chars.
* [ ] File is valid JSON, UTF‑8 encoded.

Happy sequencing!
*— Audional Sequencer X team*
