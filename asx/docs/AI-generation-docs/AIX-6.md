# Audional Sequencer X – **Comprehensive Agent Guide (v2.0 Compact Format)**

*Last updated: 20 June 2025*

---

## 1  Purpose & Scope

This document merges the detailed musical guidance of **AIX‑1** with the authoritative **v2.0** serialisation spec of **AIX‑3** and the reference implementation contained in `sequenceSerializer.js`. It tells an AI agent **exactly** what JSON it must emit for the Audional Sequencer X (ASX) to import a song, while keeping files **as small as possible** by omitting default data and using short keys.

## 2  Quick‑start: Minimum Valid File

```jsonc
{
  "meta": {
    "appName": "AudionalSequencer",
    "version": "2.0",
    "createdAt": "2025-06-20T12:34:56Z"
  },
  "projectName": "My Beat",      // omit if same as default
  "bpm": 125,                     // omit if =120
  "channels": [
    {
      "i": 0,                     // channel index (always present)
      "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0",
      "s": "AQEA////////"        // kick on steps 0 & 4 (see §6)
    }
  ]
}
```

That 20‑line file is all ASX needs for a playable pattern.

---

## 3  File Flavours

| Flavour             | `type` value       | When to use                                    |
| ------------------- | ------------------ | ---------------------------------------------- |
| **Single‑sequence** | *(omit the field)* | One 64‑step pattern (most LLM demos).          |
| **Multi‑sequence**  | `"multi-sequence"` | Songs with intros, drops, etc. (≤ 8 sequences) |

Both flavours embed a *full* single‑sequence object; multi‑sequence simply wraps several under a `sequences` array.

---

## 4  Mandatory `meta` Object

```jsonc
"meta": {
  "appName": "AudionalSequencer",   // literal string
  "version": "2.0",                // keep in sync with code
  "createdAt": "ISO-8601 timestamp" // any valid date
}
```

No other keys are permitted inside `meta`.

---

## 5  Project‑level Fields (top layer or inside each `data` object)

| Field         | Default                        | Omit rule                    |
| ------------- | ------------------------------ | ---------------------------- |
| `projectName` | `"Audional Sequencer Project"` | Omit when equal to default   |
| `bpm`         | `120`                          | Omit when **exactly** 120    |
| `channels`    | *none*                         | **Always present**           |
| `type`        | *single‑sequence* (omit key)   | Only add when multi‑sequence |
| `sequences`   | *n/a*                          | Required when `type` present |

---

## 6  Channel Object (delta‑encoded)

Only the index `i` is always included. Every other property **may be dropped** when its value matches the defaults in the table below. Long names are replaced with short keys to save bytes.

| Short key | Long name         | Default       | Notes                            |
| --------- | ----------------- | ------------- | -------------------------------- |
| `i`       | *(index)*         | 0‑15          | **Always present**               |
| `n`       | `name`            | `"Channel X"` | Friendly label                   |
| `src`     | `src`             | `null`        | Sample ID (see Annex A)          |
| `s`       | `steps` (Base‑64) | all false     | 12‑char string (see §7)          |
| `v`       | `volume`          | `0.8`         | 0‑1 linear                       |
| `p`       | `pitch`           | `0`           | Semitones                        |
| `r`       | `reverse`         | `false`       | Play buffer backwards            |
| `m`       | `mute`            | `false`       |                                  |
| `o`       | `solo`            | `false`       |                                  |
| `ts`      | `trimStart`       | `0`           | 0‑1 fraction                     |
| `te`      | `trimEnd`         | `1`           | 0‑1 fraction                     |
| `fi`      | `fadeInTime`      | `0`           | Seconds                          |
| `fo`      | `fadeOutTime`     | `0`           | Seconds                          |
| `hpf`     | `hpfCutoff`       | `20`          | Hz                               |
| `lpf`     | `lpfCutoff`       | `20000`       | Hz                               |
| `eql`     | `eqLowGain`       | `0`           | dB                               |
| `eqm`     | `eqMidGain`       | `0`           | dB                               |
| `eqh`     | `eqHighGain`      | `0`           | dB                               |
| *(long)*  | `hpfQ`, `lpfQ`    | `0.707`       | Rarely changed → keep full names |

### Channel‑pruning rule

If **both** `src` is `null` **and** all 64 steps are `false`, the channel object is **omitted entirely**.

---

## 7  Step‑grid Encoding (`s`)

1. 64‑element boolean → 8 bytes (LSB = step 0).
2. Base‑64 encode → **12 characters**.

```js
// Example: steps 0 & 4 true
const steps = Array(64).fill(false);
steps[0] = steps[4] = true;
const s = stepsToB64(steps); // "AQEA////////"
```

> **Tip:** Use the helper `stepsToB64` from the serializer, or embed its logic directly.

---

## 8  Multi‑sequence Wrapper

```jsonc
{
  "meta": { ... },
  "type": "multi-sequence",
  "sequences": [
    { "name": "Intro", "data": { /* single‑sequence */ } },
    { "name": "Chorus", "data": { ... } }
  ],
  "currentSequenceIndex": 0,      // optional cursor (defaults to 0)
  "maxSequences": 8               // optional hard‑limit (defaults to 8)
}
```

`data` objects follow **exactly** the same schema as a top‑level single‑sequence file.

---

## 9  Annex A – Built‑in Sample Catalogue (src values)

(Full table merged from AIX‑1, AIX‑3, and samples.js. Use the ID verbatim; labels are for humans.)

| Label                            | BPM  | Sample ID                                                            |
|---------------------------------|------|----------------------------------------------------------------------|
| Hard Kick                       | –    | `437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0` |
| Denim Kick                     | –    | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` |
| Denim Kick Alt                 | –    | `5b2dc7be28ad70c233b06d0ba23888aa38eb8711c24f8462d2774ac5fb7e7212i0` |
| Hard Snare                    | –    | `3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0` |
| 808 Kick                       | –    | `e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0` |
| 808 Snare                     | –    | `ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0` |
| 808 Clap                      | –    | `3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0` |
| Closed Hat                    | –    | `d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0` |
| Crash                        | –    | `5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0` |
| Small Click                  | –    | `1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0` |
| Cowbell                     | –    | `3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0` |
| Melophonic Snare            | –    | `6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0` |
| Synth Bass 1 (Warm)          | –    | `ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0` |
| Synth Bass 3 (Pluck)         | –    | `1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0` |
| Wobble Bass Loop             | 125  | `fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0` |
| Melophonic Bass + Kick Loop  | 125  | `0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0` |
| Glockenspiel                | –    | `578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0` |
| MS-10 Woop FX              | –    | `752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0` |
| DJ Scratch                 | –    | `228947e9fc52e44d3a22e84aed7bbaeff08d60c5f925aa6be7e265d210425c28i0` |
| Bass Drop FX               | –    | `b77fb3b299477ca55ab2626dbbc12c0d5fa9d4cf51ae00850caae6e36baef745i0` |
| Denim "cheese HUUH"        | –    | `fb0e5e0b512ad0caf2b0ebed011d2d29aa670ce48f3c147cfc9e633d963f369bi0` |
| Denim "I Like Cheese"       | –    | `4d73f49620b708e098a59b9c7d5a40bd0c14057d4b803e2f8842d183708ed8a5i0` |
| Audional Jim               | –    | `c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0` |
| Neill Armstrong (voice)     | –    | `6d8be8186e63b4557e51edd66184a567bc6f5f9f5ba4bb34ba8c67e652c1934ei0` |
| 8-Bit Drum Loop            | 105  | `3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0` |
| Bitcoin Drums Loop         | 105  | `ccf99852fb85d63b5f65124fe506b08c11eb400a7b1da75cd3e0c9538fc49977i0` |
| Bitcoin Melody G Loop      | 105  | `c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0` |
| Bitcoin Melody E Loop      | 105  | `435c5c22eaf0c1791e09cb46d56ce942eb312372376abf5b5420200b1424ff7fi0` |
| Pump It                   | 125  | `43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0` |
| Quiet Loop                | –    | `8fa54ad2d9e297c79b225eff67a481ebc8682dacf4fe9dbf5b692a60b237c163i0` |
| Audional Sample #1         | 125  | `6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0` |
| Denim Avengers Kick        | –    | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` |
| Denim Avengers Kick (alt)  | –    | `5b2dc7be28ad70c233b06d0ba23888aa38eb8711c24f8462d2774ac5fb7e7212i0` |
| Denim Avengers Tom         | –    | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` |
| Denim Avengers cheese HUUH | –    | `fb0e5e0b512ad0caf2b0ebed011d2d29aa670ce48f3c147cfc9e633d963f369bi0` |
| Denim Avengers I Like Cheese| –    | `4d73f49620b708e098a59b9c7d5a40bd0c14057d4b803e2f8842d183708ed8a5i0` |
| Denim Avengers MS10 woop   | –    | `752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0` |
| Entertainment - Quiet Loop | –    | `8fa54ad2d9e297c79b225eff67a481ebc8682dacf4fe9dbf5b692a60b237c163i0` |
| Bitcoin Step Melody G      | 105  | `c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0` |
| Bitcoin Step Mel Fill 2    | 105  | `e9885c35376ae95dd291bb02075b0763fb3e655d51dc981984130b8366a6d3c8i0` |
| Bitcoin Step Mel Fill 1    | 105  | `34e73ef718034a3c0fdeba53899a2af8ee7771f252c419ab63cd13b0a39f6b10i0` |
| Bitcoin Step Melody E      | 105  | `435c5c22eaf0c1791e09cb46d56ce942eb312372376abf5b5420200b1424ff7fi0` |
| Bitcoin Step Drums Beat    | 105  | `ccf99852fb85d63b5f65124fe506b08c11eb400a7b1da75cd3e0c9538fc49977i0` |
| Bitcoin Step Melody A      | 105  | `ef8fdd599beee731e06aba4a9ed02d9c7bfe62147b27f6b6deaf22c8c067ab11i0` |
| Bitcoin Step Drums Crash   | 105  | `187a8c18ebfe07c18aea0e86cd99b3100474c1c53f56f02ee096723f1a35ce70i0` |
| Bitcoin Step Melody M      | 105  | `2b6b23199eae0760ee26650a0cc02c49b94fc8fd1f519a95417f0f8478246610i0` |
| Bitcoin Step Outro Fill 1  | 105  | `474f2b0aab9020757826b168ce58725871fd2abb26c6ca805de4b07e314416d1i0` |
| Bitcoin Step Melody L      | 105  | `1aa69c9d3b451ab3b584dba57ba6d6fedc6e9cb3df6830b9da270e84e51ea72di0` |
| Bitcoin Step Melody F      | 105  | `81f9e6afc38b8c647d4ea258c29f13b81f6c1a2d40afd9c0a385d03126b4d11di0` |
| Bitcoin Step Intro Fill 1  | 105  | `4c40da69e783cfa96d2900bd15622c1ea60ad31e8ce9459cec13d155f39c463fi0` |
| Bitcoin Step Melody O      | 105  | `695368ae1092c0633ef959dc795ddb90691648e43f560240d96da0e2753a0a08i0` |
| Bitcoin Step Melody K      | 105  | `d4ce1d1e80e90378d8fc49fd7e0e24e7f2310b2f5eb95d0c2318c47b6c9cd645i0` |
| Bitcoin Step Melody I      | 105  | `e4cb3caff3b4a5192adf0f2ab5cd9da378bacfbafce56c3d4fb678a313607970i0` |
| Bitcoin Step Melody C      | 105  | `898cba6dc32faab5be09f13092b7500b13eb22f1e7b3d604c8e6e47b0becd139i0` |
| Bitcoin Step Mel Fill 3    | 105  | `ed13d5389ae6273839342698b6d5bd3342c51eb472f32b8306e60f8e1e903ce8i0` |
| Bitcoin Step Melody N      | 105  | `b0fb7f9eb0fe6c368a8d140b1117234431da0cd8725e9f78e6573bb7f0f61dadi0` |
| Bitcoin Step Mel Fill 4    | 105  | `0e38f29c76b29e471f5f0022a5e98f9ae64b5b1d8f25673f85e02851daf22526i0` |
| Bitcoin Step Melody D      | 105  | `244c785d6df173f8425d654cfc6d2b006c7bb47a605c7de576ed87022e42c7dfi0` |
| Bitcoin Step Melody B      | 105  | `a72adee5a07200a623c40831ae5979bc7562b542788c3ded35d9e81e39c6014fi0` |
| Bitcoin Step Melody J      | 105  | `6a84401579707b76d9b9a77cc461e767f7ea8f08cc0e46dee0d21e5023cdde33i0` |
| Bitcoin Step Mel Fill 5    | 105  | `83174080310b0ab71c7a725461f3bd9e486bb62727b73134ee2c67f191d9d586i0` |
| Bitcoin Step Melody H      | 105  | `4f9bed6449d99ef3cbb0fabefac6890c20ef17db2bfe7c07f1386cb43277f220i0` |

| *… add future IDs here …*           |     |                                                                      |

---

## 10  Compositional & Generation Guidelines

### 10.1  Genre‑specific rhythms

* **House / Techno (120‑140 BPM)**  – four‑on‑the‑floor kick (`0 4 8 12 …`), back‑beat snare (`4 12 …`), off‑beat hats.
* **Hip‑Hop / Lo‑Fi (80‑100 BPM)** – syncopated kicks, lazy snares on step 5, record‑scratch FX.
* **Trap / Glitch (140‑160 BPM)**   – sparse 808 kicks, hat rolls (`30 31`, `60 61 62 63`), pitch‑down bass drops.
* **Breakbeat (160+ BPM)**          – start with a loop (Pump It) then layer extra one‑shots.

### 10.2  FX & Mixing tricks

| Element | Typical tweak                       |
| ------- | ----------------------------------- |
| Bass    | `lpf` 400‑1200 Hz, `eql` +2 dB      |
| Hats    | `hpf` 600‑1200 Hz, `te` 0.1         |
| Pads    | `r` true, `fi/fo` 0.5 s             |
| Glitch  | `ts/te` 0.01‑0.1, dense step bursts |

### 10.3  Song structure (multi‑sequence)

| Seq | Name      | Main features                        |
| --- | --------- | ------------------------------------ |
| 1   | Intro     | Filtered drums (`lpf` 2500) + pad    |
| 2   | Verse     | Kick+snare, open filter (`lpf` 8000) |
| 3   | Chorus    | Full arrangement, high energy        |
| 4   | Breakdown | Atmospheric FX, long `fo`            |

---

## 11  Complete Multi‑sequence Example (v2.0, short keys)

```jsonc
{
  "meta": { "appName": "AudionalSequencer", "version": "2.0", "createdAt": "2025-06-20T12:34:56Z" },
  "type": "multi-sequence",
  "sequences": [
    {
      "name": "Intro",
      "data": {
        "projectName": "Intro",
        "bpm": 125,
        "channels": [
          { "i": 0, "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0", "s": "/////wAAAAD//w==", "lpf": 2500, "n": "Filtered Kick" },
          { "i": 1, "src": "5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0", "s": "AAAAAAAAAAAA", "r": true, "fi": 0.5, "fo": 0.5, "v": 0.6, "n": "Reversed Crash" }
        ]
      }
    },
    {
      "name": "Main Groove",
      "data": {
        "projectName": "Main Groove",
        "bpm": 125,
        "channels": [
          { "i": 0, "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0", "s": "////////////////", "n": "Kick" },
          { "i": 1, "src": "3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0", "s": "AQAAAAD//////8=", "n": "Snare" },
          { "i": 2, "src": "d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0", "s": "AgICAgICAgICAgI=", "v": 0.6, "te": 0.15, "hpf": 800, "n": "Offbeat Hat" },
          { "i": 3, "src": "1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0", "s": "EAAAABAAAAAAQAA", "p": -12, "te": 0.2, "lpf": 850, "n": "Plucky Bass" }
        ]
      }
    }
  ]
}
```

All omitted fields = default values from the serializer.

---

## 12  Checklist Before Export

* [ ] `meta.version` is **2.0**.
* [ ] `bpm` intentional or matches loops.
* [ ] No empty channels.
* [ ] Every `s` string 12 chars.
* [ ] Valid UTF‑8 JSON.

Happy sequencing! – *Audional Sequencer X team*
