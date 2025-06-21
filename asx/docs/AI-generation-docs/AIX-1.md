
# Audional Sequencer X: AI Agent Song Generation Guide

## 1. Introduction

This document provides a comprehensive technical reference for generating multi-sequence project files for the **Audional Sequencer X**. It is intended for use by AI agents and developers to programmatically create complex musical compositions that are loadable by the application. This guide details the required JSON schema, the available sample library, and provides compositional guidelines based on the platform's capabilities.

## 2. Core Concepts

*   **Multi-Sequence Project**: The top-level object is a "project" which contains one or more "sequences". This is the final JSON file.
*   **Sequence**: A self-contained musical pattern or song section. Each sequence has its own `bpm` and an array of `channels`. A project can contain up to 8 sequences.
*   **Channel**: An individual instrument track within a sequence. It holds a reference to an audio sample (`src`), a step pattern (`steps`), and a full suite of FX and playback parameters.
*   **Serialization Format**: The goal is to generate a single, valid JSON file. The format is designed to be efficient. **Crucially, any parameter that matches its default value should be omitted from the final JSON to minimize file size.** Runtime-only parameters (e.g., `activePlayback...`, `buffer`) must always be excluded.

## 3. Top-Level Multi-Sequence JSON Schema

A valid project file must adhere to this top-level structure.

```json
{
  "version": "1.0",
  "type": "multi-sequence",
  "sequences": [
    {
      "id": "seq_unique_id_1",
      "name": "Intro",
      "data": {
        "projectName": "Intro",
        "bpm": 120,
        "channels": [
          // ... channel objects for the first sequence
        ]
      }
    },
    {
      "id": "seq_unique_id_2",
      "name": "Main Groove",
      "data": {
        "projectName": "Main Groove",
        "bpm": 120,
        "channels": [
          // ... channel objects for the second sequence
        ]
      }
    }
  ],
  "currentSequenceIndex": 0,
  "maxSequences": 8
}
```

### Top-Level Field Descriptions

| Field                  | Type   | Description                                                                                                        | Required? | Notes                                                                                    |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------- |
| `version`              | String | The version of the multi-sequence format. **Must be `"1.0"`**.                                                     | Yes       |                                                                                          |
| `type`                 | String | The type identifier. **Must be `"multi-sequence"`**.                                                               | Yes       |                                                                                          |
| `sequences`            | Array  | An array of Sequence Objects. Each object represents a pattern or section of the song.                             | Yes       | Can contain 1 to 8 sequence objects.                                                     |
| `currentSequenceIndex` | Number | The 0-indexed integer indicating which sequence is active when the project loads.                                  | Yes       | Should be between `0` and `sequences.length - 1`.                                        |
| `maxSequences`         | Number | The maximum number of sequences allowed. **Should be `8`**.                                                        | Yes       |                                                                                          |

### Sequence Object Schema (within `sequences` array)

| Field  | Type   | Description                                                                                                   | Required? | Notes                                                                                                             |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`   | String | A unique identifier for the sequence. A simple and effective format is `seq_` followed by a timestamp and random characters. | Yes       | Example: `seq_1672531200000_a1b2c3d4`                                                              |
| `name` | String | The user-visible name of the sequence, e.g., "Intro", "Verse 1", "Chorus", "Breakdown".                       | Yes       |                                                                                                                   |
| `data` | Object | The core sequence data, which follows the **single-sequence project format**. See Section 4 for details.      | Yes       |                                                                                                                   |

---

## 4. Sequence `data` and Channel Schema

The `data` object within each sequence contains the `projectName`, `bpm`, and an array of `channels`.

### 4.1. Sequence `data` Object

| Field         | Type   | Description                                                                        | Default | Omit? | Notes                                              |
| ------------- | ------ | ---------------------------------------------------------------------------------- | ------- | ----- | -------------------------------------------------- |
| `projectName` | String | The name of the sequence. Should typically match the sequence's `name` field.      | `""`    | No    |                                                    |
| `bpm`         | Number | Beats Per Minute for this sequence. Can vary between sequences.                    | `120`   | Yes   | Valid range: 1-420.                                |
| `channels`    | Array  | An array of 16 Channel Objects. See Section 4.2. **Must always contain 16 objects.** | `[]`    | No    | Empty channels should be included as default objects. |

### 4.2. Channel Object Schema

Each channel object contains all parameters for a single instrument track. **Omit any field that is set to its default value.**

| Field         | Type    | Description                                            | Range / Values           | Default Value |
| ------------- | ------- | ------------------------------------------------------ | ------------------------ | ------------- |
| **`name`**        | String  | User-defined name for the channel (e.g., "Kick", "Bassline"). | -                        | `"Channel X"` |
| **`src`**         | String  | The Ordinal ID of the sample. See Section 5.        | -                        | `null`        |
| **`steps`**       | Array   | **Array of 0-indexed numbers** where a note is active. | `0` to `63`              | `[]` (empty)  |
| `volume`      | Number  | Channel volume.                                        | `0.0` to `1.0`           | `0.8`         |
| `pitch`       | Number  | Pitch shift in semitones.                              | `-24` to `24`            | `0`           |
| `reverse`     | Boolean | If `true`, plays the sample reversed.                  | `true` / `false`         | `false`       |
| `trimStart`   | Number  | Normalized sample start time.                          | `0.0` to `1.0`           | `0`           |
| `trimEnd`     | Number  | Normalized sample end time.                            | `0.0` to `1.0`           | `1.0`         |
| `fadeInTime`  | Number  | Fade-in duration in seconds.                           | `0` to `0.5`             | `0`           |
| `fadeOutTime` | Number  | Fade-out duration in seconds.                          | `0` to `0.5`             | `0`           |
| `hpfCutoff`   | Number  | High-Pass Filter cutoff frequency in Hz.               | `20` to `20000`          | `20`          |
| `lpfCutoff`   | Number  | Low-Pass Filter cutoff frequency in Hz.                | `20` to `20000`          | `20000`       |
| `eqLowGain`   | Number  | Low-shelf EQ gain in dB.                               | `-18` to `18`            | `0`           |
| `eqMidGain`   | Number  | Peaking-bell (mid) EQ gain in dB.                      | `-18` to `18`            | `0`           |
| `eqHighGain`  | Number  | High-shelf EQ gain in dB.                              | `-18` to `18`            | `0`           |
| `mute`        | Boolean | Mutes the channel.                                     | `true` / `false`         | `false`       |
| `solo`        | Boolean | Solos the channel.                                     | `true` / `false`         | `false`       |

**IMPORTANT:** The `steps` array is **NOT** a boolean array. It is an array of numbers representing the indices of active steps. For example, a four-on-the-floor kick pattern is `[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]`. An empty `steps` array can be omitted.

---

## 5. Sample Library (Instrument Catalog)

Use the `OrdID (src)` from this table for the `src` property in a channel.

| Sample Name                 | OrdID (src)                                                                | Category      | Suggested BPM | Notes / Timbre                                 |
| --------------------------- | -------------------------------------------------------------------------- | ------------- | ------------- | ---------------------------------------------- |
| **Drums & Percussion**      |                                                                            |               |               |                                                |
| Hard Kick                   | `437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0`        | Kick          | 120-140       | Punchy, standard electronic kick.              |
| 808 Kick                    | `e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0`        | Kick          | 80-160        | Classic 808 kick with a long tail. Good for sub-bass. |
| Denim Kick                  | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0`        | Kick          | 90-125        | Softer, vintage drum machine sound.            |
| Denim Kick Alt              | `5b2dc7be28ad70c233b06d0ba23888aa38eb8711c24f8462d2774ac5fb7e7212i0`        | Kick          | 90-125        | Alternative version of the Denim Kick.         |
| Hard Snare                  | `3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0`        | Snare         | 100-160       | Sharp, electronic snare.                       |
| 808 Snare                   | `ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0`        | Snare         | 80-160        | Classic 808 snare sound.                       |
| Melophonic Snare            | `6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0`        | Snare         | 100-140       | A snare with a slight melodic/tonal quality.   |
| 808 Clap                    | `3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0`        | Clap          | 80-150        | Classic 808 clap sound.                        |
| Closed Hat                  | `d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0`        | Hat           | 80-170        | Tight, closed hi-hat. Good for fast patterns.  |
| Crash                       | `5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0`        | Cymbal        | Any           | Standard electronic crash cymbal.              |
| Small Click                 | `1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0`        | Percussion    | Any           | A very short, high-pitched click. Good for texture. |
| Cowbell                     | `3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0`        | Percussion    | 100-130       | Classic cowbell sound.                         |
| Denim Tom                   | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0`        | Percussion    | 90-130        | A single tom hit. Can be pitched to create melodies. |
| **Bass**                    |                                                                            |               |               |                                                |
| Synth Bass 1 (Warm)         | `ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0`        | Bass          | 90-130        | A round, warm synth bass note.                 |
| Synth Bass 3 (Pluck)        | `1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0`        | Bass          | 100-140       | A short, plucky synth bass note.               |
| Wobble Bass Loop            | `fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0`        | Bass Loop     | 125           | A modulated, wobbly bassline loop.             |
| Melophonic Bass + Kick Loop | `0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0`        | Bass Loop     | 125           | A loop containing a bassline and a kick drum.  |
| **Melodic & FX**            |                                                                            |               |               |                                                |
| Glockenspiel                | `578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0`        | Melodic       | Any           | A single, clean glockenspiel note.             |
| MS10 Woop FX                | `752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0`        | FX            | Any           | A "woop" sound effect from a Korg MS-10.       |
| DJ Scratch                  | `228947e9fc52e44d3a22e84aed7bbaeff08d60c5f925aa6be7e265d210425c28i0`        | FX            | Any           | A short record scratch sound.                  |
| Bass Drop FX                | `b77fb3b299477ca55ab2626dbbc12c0d5fa9d4cf51ae00850caae6e36baef745i0`        | FX            | Any           | A long, descending bass drop effect.           |
| **Vocal**                   |                                                                            |               |               |                                                |
| Denim "cheese HUUH"         | `fb0e5e0b512ad0caf2b0ebed011d2d29aa670ce48f3c147cfc9e633d963f369bi0`        | Vocal         | Any           | A short, quirky vocal chop.                    |
| Denim "I Like Cheese"       | `4d73f49620b708e098a59b9c7d5a40bd0c14057d4b803e2f8842d183708ed8a5i0`        | Vocal         | Any           | A longer vocal phrase.                         |
| Audional Jim                | `c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0`        | Vocal         | Any           | Vocal sample.                                  |
| Neill Armstrong             | `6d8be8186e63b4557e51edd66184a567bc6f5f9f5ba4bb34ba8c67e652c1934ei0`        | Vocal         | Any           | "One small step..." speech.                    |
| **Loops**                   |                                                                            |               |               |                                                |
| Bitcoin Drums Beat Loop     | `ccf99852fb85d63b5f65124fe506b08c11eb400a7b1da75cd3e0c9538fc49977i0`        | Drum Loop     | 105           | A full drum loop with a distinct character.    |
| 8-Bit Drum Loop             | `3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0`        | Drum Loop     | 105           | Chiptune/8-bit style drum loop.                |
| Bitcoin Melody G Loop       | `c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0`        | Melodic Loop  | 105           | A melodic loop in the key of G.                |
| Bitcoin Melody E Loop       | `435c5c22eaf0c1791e09cb46d56ce942eb312372376abf5b5420200b1424ff7fi0`        | Melodic Loop  | 105           | A melodic loop in the key of E.                |
| Pump It                     | `43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0`        | Drum Loop     | 125           | An energetic, pumpy drum loop.                 |
| Audional Sample #1          | `6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0`        | Drum Loop     | 125           | A foundational drum loop.                      |
| Quiet Loop                  | `8fa54ad2d9e297c79b225eff67a481ebc8682dacf4fe9dbf5b692a60b237c163i0`        | Pad Loop      | Any           | A quiet, ambient loop suitable for pads.       |

---

## 6. Compositional & Generation Guidelines

To create musically coherent projects, adhere to these guidelines.

### Genre-Specific Rhythms
*   **House/Techno (120-140 BPM):**
    *   **Kick:** Use a "four-on-the-floor" pattern: `[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]`. Use `Hard Kick` or `Denim Kick`.
    *   **Snare/Clap:** Place on the backbeats: `[4, 12, 20, 28, 36, 44, 52, 60]`.
    *   **Hats:** Use off-beats `[2, 6, 10, 14, ...]` or constant 16th notes `[0, 1, 2, 3, ...]`.
*   **Hip Hop/Lo-Fi (80-100 BPM):**
    *   **Kick:** Syncopated and sparse patterns. Avoid four-on-the-floor. Example: `[0, 7, 16, 22, 32, 39, 48, 54]`.
    *   **Snare:** Lazy backbeats, sometimes slightly off-grid (emulate by placing on step 5 instead of 4). `[4, 12, 20, 28, ...]`.
*   **Trap/Glitch (140-160 BPM):**
    *   **Kick:** Sparse, syncopated 808 patterns.
    *   **Snare/Clap:** Solid backbeats on step 4 of every 8 (i.e., `[4, 12, 20, ...]` ).
    *   **Hats:** Use very fast rolls. Example: `[2, 3, 6, 7, 10, 11, 14, 15, 15.5]` (Note: 15.5 is not possible, but you can achieve this effect with very dense step placement like `[14, 15]`). Create rolls with dense step sequences like `[30, 31]` or `[60, 61, 62, 63]`.
*   **Breakbeats (160+ BPM):**
    *   Use the full drum loops (`Bitcoin Drums Beat Loop`, `Pump It`) as a base and layer one-shots on top.

### FX and Sound Design
*   **Bass:** Apply a `lpfCutoff` between `400` and `1200` to make it deep and remove high frequencies. A slight `eqLowGain` of `1` or `2` can add weight.
*   **Hats:** Apply a `hpfCutoff` between `600` and `1200` to remove low-end rumble and make them sit cleanly in the mix. Use a short `trimEnd` like `0.1` for tight, snappy hats.
*   **Pads/Atmosphere:** Use `reverse: true` and long `fadeInTime` / `fadeOutTime` (e.g., `0.5` seconds or more) on samples like `Quiet Loop` or `Crash` to create swelling textures.
*   **Melody:** Use the `Glockenspiel` or `Denim Tom` and vary the `pitch` parameter to create melodies. A major scale can be approximated with pitches `[0, 2, 4, 5, 7, 9, 11, 12]`.
*   **Glitch Effects:** Use very short `trimStart` and `trimEnd` values (e.g., `0.01` to `0.1`) on any sample. Use rapid, stuttering `steps` like `[14, 15, 16]` to create glitchy fills.

### Structuring a Multi-Sequence Song

A common song structure can be achieved using multiple sequences:
1.  **Sequence 1: "Intro"**
    *   `bpm`: Same as main groove.
    *   Use fewer channels. Start with a filtered drum loop (`lpfCutoff: 1000`) and a simple atmospheric pad.
2.  **Sequence 2: "Verse"**
    *   Introduce the main kick and snare pattern.
    *   Bring in the main bassline. Open up the filter on the drum loop (`lpfCutoff: 8000`).
3.  **Sequence 3: "Chorus"**
    *   Introduce all elements: main melody, all percussion layers.
    *   Make this the most energetic part of the track.
4.  **Sequence 4: "Breakdown / Outro"**
    *   Remove the drums and bass.
    *   Let a melodic element play with a long `fadeOutTime` or reverb-like effect (use a reversed crash with a long fade in).

---

## 7. Complete Generation Example

This is a complete, valid 2-sequence project file for a minimal house track. It demonstrates the schema, omits default values for efficiency, and applies compositional guidelines.

```json
{
  "version": "1.0",
  "type": "multi-sequence",
  "sequences": [
    {
      "id": "seq_1672531200000_intro",
      "name": "Intro",
      "data": {
        "projectName": "Intro",
        "bpm": 125,
        "channels": [
          {
            "name": "Filtered Kick",
            "steps": [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60],
            "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0",
            "lpfCutoff": 2500
          },
          {
            "name": "Reversed Crash",
            "steps": [0, 32],
            "src": "5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0",
            "volume": 0.6,
            "reverse": true,
            "fadeInTime": 0.5,
            "fadeOutTime": 0.5
          },
          {"name": "Channel 3"},
          {"name": "Channel 4"},
          {"name": "Channel 5"},
          {"name": "Channel 6"},
          {"name": "Channel 7"},
          {"name": "Channel 8"},
          {"name": "Channel 9"},
          {"name": "Channel 10"},
          {"name": "Channel 11"},
          {"name": "Channel 12"},
          {"name": "Channel 13"},
          {"name": "Channel 14"},
          {"name": "Channel 15"},
          {"name": "Channel 16"}
        ]
      }
    },
    {
      "id": "seq_1672531200000_groove",
      "name": "Main Groove",
      "data": {
        "projectName": "Main Groove",
        "bpm": 125,
        "channels": [
          {
            "name": "Full Kick",
            "steps": [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60],
            "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0"
          },
          {
            "name": "Snare",
            "steps": [4, 12, 20, 28, 36, 44, 52, 60],
            "src": "3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0"
          },
          {
            "name": "Offbeat Hat",
            "steps": [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62],
            "src": "d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0",
            "volume": 0.6,
            "trimEnd": 0.15,
            "hpfCutoff": 800
          },
          {
            "name": "Plucky Bass",
            "steps": [0, 6, 8, 14, 16, 22, 24, 30, 32, 38, 40, 46, 48, 54, 56, 62],
            "src": "1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0",
            "pitch": -12,
            "trimEnd": 0.2,
            "lpfCutoff": 850
          },
          {"name": "Channel 5"},
          {"name": "Channel 6"},
          {"name": "Channel 7"},
          {"name": "Channel 8"},
          {"name": "Channel 9"},
          {"name": "Channel 10"},
          {"name": "Channel 11"},
          {"name": "Channel 12"},
          {"name": "Channel 13"},
          {"name": "Channel 14"},
          {"name": "Channel 15"},
          {"name": "Channel 16"}
        ]
      }
    }
  ],
  "currentSequenceIndex": 0,
  "maxSequences": 8
}
```