Great, I see you've uploaded `asx.zip`. I'll do the following:

1. **Extract the ZIP** and review the `samples.js` list of samples, one-shots, and loops (including their BPMs).
2. **Review your serialisation code** to fully understand the correct serialised format for multi-sequence songs.
3. **Draft a clear Markdown document** for AI and MCP agents:

   * Reference sample usage (loops, one-shots, BPM, structure, etc.).
   * Outline strict serialization formatting.
   * Include clear, real-world examples.

Let's get started by extracting and listing the files inside the ZIP.


The ZIP archive contains a main folder named `asx`. I’ll list the files inside `asx` to locate `samples.js`, the serialisation code, and any other relevant files.


The `asx` directory contains several folders. The most likely location for `samples.js` and serialization logic is within the `js` folder. I’ll list the files inside `js`.


Located:

* `samples.js` (sample list)
* `sequenceSerializer.js` (likely handles serialization)
* `app_multisequence.js`, `multiSequenceSaveLoad.js`, and `testSerialise.js` (possibly related to multi-sequence song logic/format)

Next steps:

1. **Extract sample list & structure from `samples.js`**
2. **Analyze serialization format from `sequenceSerializer.js` and related files**
3. **Produce the clear .md document for agent use**

Let’s start by reading `samples.js` to see how samples, one-shots, loops, and BPM are defined.


The structure is clear:

* **Each sample is an object with**:

  * `id`: unique identifier (used for sequencing, loading, and reference)
  * `label`: readable description, usually including sample type and BPM for loops

* **Types**:

  * **Loops**: label includes BPM (e.g. `"Bitcoin Step Drums Beat, 105BPM"`)
  * **One-shots**: label just names the instrument/sound (e.g. `"OB1 #1 - 808 Kick"`)
  * **Vocal/FX**: e.g. “Neill Armstrong …”

* **No strict categorisation in code**; inferred from label and BPM presence.

Next:
I’ll examine the serialization logic (`sequenceSerializer.js`) to see how a full multi-sequence song is encoded for the Audional Sequencer X.

Let’s read `sequenceSerializer.js`.


This module defines the **serialization format** for the sequencer:

* **Project Settings:**

  * `projectName`
  * `bpm`

* **Channels:**

  * Each channel has:

    * `name`
    * `src` (the sample ID)
    * `steps` (array of 64 booleans, indicating triggers per step)
    * Mixer and FX settings: `volume`, `mute`, `solo`, `pitch`, `reverse`, `trimStart`, `trimEnd`, `fadeInTime`, `fadeOutTime`, filters/EQ, etc.

* **Steps** are compacted as a **Base64 string** (from 64 booleans).

Let’s confirm the *serialized song structure* by searching for the main serialization/export function (likely exporting to JSON or a compact object). I’ll search for an `export`/`serialize` function in this file.


The main serialization logic is in the function:
**`serializeSequence`**
Deserialization is handled by **`deserializeSequence`**.

Let's extract and examine the **`serializeSequence`** function to document the expected multi-sequence song format.


**Summary of serialization logic (`serializeSequence`):**

* **Root object** has:

  * `meta`: { `appName`, `version`, `createdAt` }
  * `projectName` (optional, only if not default)
  * `bpm` (optional, only if not default)
  * `channels`: Array of channel objects

* **Each channel** (object) has:

  * `i`: Channel index
  * `s`: Steps as base64 (if any true triggers)
  * Other properties, *only if they differ from default*, using short keys:

    * `n`: name
    * `v`: volume
    * `p`: pitch
    * `r`: reverse (bool)
    * `m`: mute (bool)
    * `o`: solo (bool)
    * `src`: sample ID
    * `ts`: trimStart
    * `te`: trimEnd
    * `fi`: fadeInTime
    * `fo`: fadeOutTime
    * `hpf`: hpfCutoff
    * `lpf`: lpfCutoff
    * `eql`: eqLowGain
    * `eqm`: eqMidGain
    * `eqh`: eqHighGain

**Resulting format is compact and omits default values.**
Let’s now draft a detailed, precise reference Markdown for AI/MCP agents.
I will include:

* How to select and reference samples (with ID/label, loop/one-shot/BPM logic)
* How to structure a multi-sequence song
* Explicit serialization format (with key examples)
* Best-practice guidance for AI

---

**If you want a specific example of a full serialised song or special cases, let me know now.**
Otherwise, I’ll include a standard example with a loop and a one-shot track.
