
# Audional Sequencer X: AI Agent Prompting Guide for Song Generation

## 1. Introduction & Goal

This document provides a definitive guide for AI agents and developers to generate valid, serialized JSON files for the **Audional Sequencer X**. The primary goal is to create multi-sequence musical projects that can be loaded directly into the application.

Adherence to the serialization rules outlined here is **critical**. The application saves space by omitting default values; generated JSON must follow the same rules to be considered valid.

## 2. Core Generation Concepts

To generate a valid project file, an AI must understand three core concepts:

1.  **Multi-Sequence Structure:** The root of the JSON file is a "multi-sequence" object that acts as a container for one or more individual song patterns (sequences).
2.  **Compact Serialization:** The format is designed to be compact. This is achieved by **omitting any parameter that is set to its default value**. For example, if a channel's volume is the default `0.8`, the `"volume": 0.8` key-value pair should **not** be included in the output for that channel.
3.  **Sparse Step Arrays:** The sequencer step data is stored in a sparse format. Instead of a 64-element boolean array, the JSON should contain an array of numbers, where each number is the zero-indexed position of an active step. An empty sequence has no `steps` property at all.

## 3. Top-Level Multi-Sequence Schema

All projects must conform to the following top-level structure.

```json
{
  "version": "1.0",
  "type": "multi-sequence",
  "sequences": [
    // Array of one or more sequence data objects.
    // See Section 4 for the structure of these objects.
  ],
  "currentSequenceIndex": 0,
  "maxSequences": 8
}
```

### Top-Level Field Descriptions

| Field | Data Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `version` | String | Yes | Must be `"1.0"`. |
| `type` | String | Yes | Must be `"multi-sequence"`. |
| `sequences`| Array | Yes | An array containing one or more sequence objects. |
| `currentSequenceIndex`| Number | Yes | The 0-indexed integer of the sequence that should be active when loaded. |
| `maxSequences` | Number | Yes | The maximum number of sequences allowed. Should be `8`. |

## 4. The `sequences` Array Object Schema

Each element in the `sequences` array is an object with two parts: metadata and the `data` payload.

```json
{
  "id": "seq_1717800000000_a1b2c3d4",
  "name": "My First Sequence",
  "created": 1717800000000,
  "modified": 1717800000000,
  "data": {
    // This object contains the actual song data.
    // See Section 5 for its structure.
  }
}
```

### Sequence Metadata Field Descriptions

| Field | Data Type | Required? | Description & Generation Rule |
| :--- | :--- | :--- | :--- |
| `id` | String | Yes | A unique identifier for the sequence. **Rule:** Generate using `seq_` + current Unix timestamp (ms) + `_` + 8 random hex chars. |
| `name`| String | Yes | A user-friendly name for the sequence (e.g., "Intro", "Chorus", "Beat Drop"). |
| `created` | Number | Yes | The creation timestamp. **Rule:** Use the current Unix timestamp in milliseconds. |
| `modified`| Number | Yes | The last-modified timestamp. **Rule:** Should be the same as `created` on initial generation. |
| `data` | Object | Yes | The object containing the project settings, channels, and steps for this sequence. Its schema is detailed below. |

---

## 5. The Sequence `data` Object Schema

This object holds the core musical information for a single sequence.

```json
{
  "projectName": "My First Sequence",
  "bpm": 120,
  "channels": [
    // Array of Channel Objects
    // See Section 6 for this critical structure.
  ]
}
```

### `data` Field Descriptions

| Field | Data Type | Required? | Description & Generation Rule |
| :--- | :--- | :--- | :--- |
| `projectName`| String | Yes | The name of the sequence. Should generally match the metadata `name`. |
| `bpm` | Number | Yes | Beats Per Minute for the sequence. Must be between `1` and `420`. |
| `channels` | Array | Yes | An array of 16 channel objects. Empty channels should be included as objects with default values omitted (see below). |

---

## 6. The Channel Object Schema & Serialization Rules

This is the most important part of the generation task. A channel object is defined by its `name`, its `src` (audio sample), and its `steps`. All other properties are **optional** and should **only be included if their value is different from the default**.

### Default Channel State

This table defines the default values. **If a parameter matches this default, omit it from the JSON.**

| Parameter | Data Type | Default Value | Serialization Rule |
| :--- | :--- | :--- | :--- |
| `name` | String | n/a | **Always include**. E.g., `"Channel 1"`. |
| `src` | String | `null` | **Include if a sample is used**. Otherwise, omit. |
| `steps` | Array | `[]` (empty) | **Include if steps exist**. Omit for silent channels. |
| `volume` | Number | `0.8` | Omit if `0.8`. Range: 0.0-1.0. |
| `mute` | Boolean | `false` | Omit if `false`. |
| `solo` | Boolean | `false` | Omit if `false`. |
| `pitch` | Number | `0` | Omit if `0`. Range: -24 to 24 semitones. |
| `reverse` | Boolean | `false` | Omit if `false`. |
| `trimStart`| Number | `0` | Omit if `0`. Range: 0.0-1.0. |
| `trimEnd` | Number | `1.0` | Omit if `1.0`. Range: 0.0-1.0. |
| `fadeInTime`| Number | `0` | Omit if `0`. In seconds (e.g., 0.0-0.5). |
| `fadeOutTime`| Number| `0` | Omit if `0`. In seconds (e.g., 0.0-0.5). |
| `hpfCutoff` | Number | `20` | Omit if `20`. In Hz (20-20000). |
| `hpfQ` | Number | `0.707` | **Always omit (not user-configurable yet)**. |
| `lpfCutoff` | Number | `20000` | Omit if `20000`. In Hz (20-20000). |
| `lpfQ` | Number | `0.707` | **Always omit (not user-configurable yet)**. |
| `eqLowGain`| Number | `0` | Omit if `0`. In dB (-18 to 18). |
| `eqMidGain`| Number | `0` | Omit if `0`. In dB (-18 to 18). |
| `eqHighGain`| Number | `0` | Omit if `0`. In dB (-18 to 18). |

### Channel Object Examples

**Example 1: A minimal Kick drum on the first beat.**
- All parameters are default except for `src`, `name`, and `steps`.

```json
{
  "name": "Kick",
  "src": "437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0",
  "steps": [0]
}
```

**Example 2: A complex Cowbell sound.**
- Pitch is raised, volume is lowered, LPF is applied. Defaults (`mute`, `solo`, `reverse`, etc.) are omitted.

```json
{
  "name": "Cowbell Lead",
  "src": "3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0",
  "steps": [4, 10, 16, 19, 24, 27, 36, 40, 42, 47, 49, 52, 55, 60, 63],
  "volume": 0.7,
  "pitch": 5,
  "lpfCutoff": 14000
}
```

**Example 3: An empty channel (Channel 9).**
- Since all parameters are default, only the `name` is required. The sequencer needs 16 channels in the array, so empty channels must be represented this way.

```json
{
  "name": "Channel 9"
}
```

## 7. Available Sample Library

Use the `Source ID` in the `src` field of a channel. Note the BPM and type to make musically coherent choices.

| Sample Label | Type | BPM (if known) | Source ID (`src`) |
| :--- | :--- | :--- | :--- |
| Hard Kick | One-shot | | `437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0` |
| Hard Snare | One-shot | | `3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0` |
| Closed Hat | One-shot | | `d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0` |
| 808 Clap | One-shot | | `3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0` |
| 808 Kick | One-shot | | `e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0` |
| 808 Snare | One-shot | | `ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0` |
| Crash | One-shot | | `5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0` |
| Cowbell | One-shot | | `3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0` |
| Small Click | One-shot | | `1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0` |
| Synth Bass 1 (Pluck) | One-shot | | `1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0` |
| Synth Bass 3 (Pluck) | One-shot | | `ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0` |
| Glockenspiel | One-shot | | `578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0` |
| DJ Scratch | FX | | `228947e9fc52e44d3a22e84aed7bbaeff08d60c5f925aa6be7e265d210425c28i0` |
| Denim Kick | One-shot | | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` |
| Denim Tom | One-shot | | `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` |
| Denim "cheese HUUH" | Vocal FX | | `fb0e5e0b512ad0caf2b0ebed011d2d29aa670ce48f3c147cfc9e633d963f369bi0` |
| MS-10 Woop | FX | | `752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0` |
| Melophonic Snare | One-shot | | `6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0` |
| Pump It | Loop | | `43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0` |
| Wobble Bass | Loop | 125 | `fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0` |
| Audional Sample #1| Loop | 125 | `6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0` |
| 8-Bit Drum Loop | Loop | 105 | `3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0` |
| BTC Step Drum Beat| Loop | 105 | `ccf99852fb85d63b5f65124fe506b08c11eb400a7b1da75cd3e0c9538fc49977i0` |
| Melophonic Bass+Kick| Loop | 125 | `0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0` |

## 8. Prompting Strategy & Final Example

When prompting an AI, be specific about the genre, BPM, and instrumentation. Crucially, remind the AI to follow the serialization rules.

**Example Prompt:**

> "Generate a 2-sequence song for Audional Sequencer X.
>
> **Sequence 1: Intro (8 bars / 32 steps)**
> - BPM: 90
> - Style: Sparse, ambient lo-fi.
> - Drums: Use 'Dusty Kick' on a simple pattern. Use 'Lazy Hats' with a low volume.
> - FX: Use 'Glockenspiel Echo' for a reversed, ethereal melody on a few steps.
>
> **Sequence 2: Main Beat (16 bars / 64 steps)**
> - BPM: 90
> - Style: Full lo-fi hip hop groove.
> - Drums: Keep the Intro drums, but add 'Snappy Snare' on the 2s and 4s (steps 4, 12, 20...). Add 'Vinyl Crackle' as a light background texture.
> - Bass: Add a simple bassline using 'Hard Kick Sub Layer'.
>
> **CRITICAL INSTRUCTIONS:**
> 1.  Generate a valid multi-sequence JSON file.
> 2.  The `data` for each sequence must contain a `projectName`, `bpm`, and 16 `channels`.
> 3.  **For each channel, OMIT any parameter that is set to its default value.**
> 4.  Use the **sparse array of indices** format for the `steps` property. Omit `steps` if the channel is empty.
> 5.  Use the provided Sample Library for `src` values.

