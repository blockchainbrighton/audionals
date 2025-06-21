````markdown
# Audional Sequencer X Reference Guide

A concise reference for AI/MCP agents to generate multi-sequence songs in the correct serialized format for the Audional Sequencer X.

---

## 1. Overview

- **App Name**: AudionalSequencer  
- **Serialization Format Version**: `2.0`  
- **Default Project BPM**: `120.0`  
- **Default Number of Steps**: `64`  

All sequences are represented as a JSON-like object with:
1. **meta** block  
2. Optional **projectName** and **bpm**  
3. **channels** array  

---

## 2. Sample Library

| ID                                                                 | Label                                                     | Type      | BPM  |
| ------------------------------------------------------------------ | --------------------------------------------------------- | --------- | ---- |
| `6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0` | Audional Sample #1, 125BPM                                | one-shot  | 125  |
| `0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0` | Melophonic Bass + Kick, 125BPM                            | one-shot  | 125  |
| `6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0` | Melophonic Snare                                          | one-shot  |      |
| `6d8be8186e63b4557e51edd66184a567bc6f5f9f5ba4bb34ba8c67e652c1934ei0` | Neill Armstrong “One small step for man…”                 | one-shot  |      |
| `3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0` | 8 Bit Drum Loop, 105BPM                                   | loop      | 105  |
| `43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0` | Pump It                                                   | one-shot  |      |
| `fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0` | Wobble Bass, 125BPM                                       | one-shot  | 125  |
| `c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0` | Audional Jim                                              | one-shot  |      |
| `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` | Denim Avengers Kick                                       | one-shot  |      |
| `5b2dc7be28ad70c233b06d0ba23888aa38eb8711c24f8462d2774ac5fb7e7212i0` | Denim Avengers Kick                                       | one-shot  |      |
| `a511d79317efac68fea3b14070bebe208aefde07ce1c55d6f4cfe42e8273cbdbi0` | Denim Avengers Tom                                        | one-shot  |      |
| `fb0e5e0b512ad0caf2b0ebed011d2d29aa670ce48f3c147cfc9e633d963f369bi0` | Denim Avengers cheese HUUH                                | one-shot  |      |
| `4d73f49620b708e098a59b9c7d5a40bd0c14057d4b803e2f8842d183708ed8a5i0` | Denim Avengers I Like Cheese                              | one-shot  |      |
| `752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0` | Denim Avengers MS10 woop                                  | one-shot  |      |
| `8fa54ad2d9e297c79b225eff67a481ebc8682dacf4fe9dbf5b692a60b237c163i0` | Entertainment - Quiet Loop                                | loop      |      |
| `c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0` | Bitcoin Step Melody G, 105BPM                             | one-shot  | 105  |
| `e9885c35376ae95dd291bb02075b0763fb3e655d51dc981984130b8366a6d3c8i0` | Bitcoin Step Mel Fill 2, 105BPM                           | one-shot  | 105  |
| `34e73ef718034a3c0fdeba53899a2af8ee7771f252c419ab63cd13b0a39f6b10i0` | Bitcoin Step Mel Fill 1, 105BPM                           | one-shot  | 105  |
| … (and so on for all 53 samples)                                    |                                                           |           |      |

> **Note**: If BPM is blank, it’s a one-shot without tempo metadata. Loops usually include “Loop” in the label.

---

## 3. Serialization Format

Each sequence must be serialized via `serializeSequence(fullSequenceData)` into an object:

```json
{
  "meta": {
    "appName": "AudionalSequencer",
    "version": "2.0",
    "createdAt": "2025-06-20T14:23:00.000Z"
  },
  "projectName": "My Project",      // optional, omit if default
  "bpm": 108.00,                    // optional, omit if 120.00
  "channels": [
    {
      "i": 0,                       // channel index (0–15)
      "src": "<sampleID>",          // one of the IDs above
      "s": "<base64Steps>",         // 64-step pattern
      // only include non-default parameters:
      "n": "Bass",                  // name
      "v": 0.9,                     // volume (0.0–1.0)
      "p": -2,                      // pitch shift in semitones
      "m": false,                   // mute
      "so": false,                  // solo
      "r": false,                   // reverse
      "ts": 0.05,                   // trimStart (0.0–1.0)
      "te": 0.95,                   // trimEnd (0.0–1.0)
      "fi": 0.1,                    // fadeInTime (s)
      "fo": 0.2,                    // fadeOutTime (s)
      "hpf": 200,                   // high-pass cutoff (Hz)
      "hpfq": 0.707,                // HPF Q
      "lpf": 8000,                  // low-pass cutoff (Hz)
      "lpfq": 0.707,                // LPF Q
      "eql": -3,                    // EQ low gain (dB)
      "eqm": 1.5,                   // EQ mid gain (dB)
      "eqh": 2                      // EQ high gain (dB)
    },
    // … additional channels …
  ]
}
````

### Field Short-Key Mapping

| Full Key      | Short Key | Default            |
| ------------- | --------- | ------------------ |
| `i`           | `i`       | —                  |
| `src`         | `src`     | `null`             |
| `steps`       | `s`       | all `false`        |
| `name`        | `n`       | `"Channel ${i+1}"` |
| `volume`      | `v`       | `0.8`              |
| `pitch`       | `p`       | `0`                |
| `mute`        | `m`       | `false`            |
| `solo`        | `so`      | `false`            |
| `reverse`     | `r`       | `false`            |
| `trimStart`   | `ts`      | `0`                |
| `trimEnd`     | `te`      | `1.0`              |
| `fadeInTime`  | `fi`      | `0`                |
| `fadeOutTime` | `fo`      | `0`                |
| `hpfCutoff`   | `hpf`     | `20`               |
| `hpfQ`        | `hpfq`    | `0.707`            |
| `lpfCutoff`   | `lpf`     | `20000`            |
| `lpfQ`        | `lpfq`    | `0.707`            |
| `eqLowGain`   | `eql`     | `0`                |
| `eqMidGain`   | `eqm`     | `0`                |
| `eqHighGain`  | `eqh`     | `0`                |

---

## 4. Steps Encoding

* **`stepsToB64(stepsArray)`**: Converts a 64-element boolean array into a compact Base64 string.
* **`b64ToSteps(b64string)`**: Decodes Base64 back to a boolean array.

---

## 5. Example Serialized Sequence

```json
{
  "meta": {
    "appName": "AudionalSequencer",
    "version": "2.0",
    "createdAt": "2025-06-20T14:30:00.000Z"
  },
  "bpm": 105.0,
  "channels": [
    {
      "i": 0,
      "src": "3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0",
      "s": "Qk9PUk9PV...",      // your Base64
      "n": "Drum Loop",
      "v": 1.0
    },
    {
      "i": 1,
      "src": "c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0",
      "s": "AAA…AAA",    
      "n": "Melody",
      "p": 2,
      "v": 0.8
    }
  ]
}
```

---

## 6. Prompting Guidelines for AI/MCP Agents

1. **Specify Global BPM**: If using loops with fixed BPM (e.g., 105 BPM), set the top-level `"bpm"`.
2. **Select Samples**: Use the **ID** values exactly—to load samples.
3. **Pattern Design**: Craft a 64-element boolean array, then encode it via `stepsToB64`.
4. **Channel Indexing**: Use `"i"` from `0` to `15`. Omit empty channels.
5. **Non-Default Settings**: Only include short keys (`n, v, p, …`) when deviating from defaults.
6. **Meta Block**: Always include `"meta"` with correct `"version"` and ISO timestamp.
7. **Validation**: Ensure JSON is valid and matches the schema above before feeding to the Sequencer.

Use this guide as the template whenever generating or modifying Audional Sequencer X projects. Happy sequencing!

```
```
