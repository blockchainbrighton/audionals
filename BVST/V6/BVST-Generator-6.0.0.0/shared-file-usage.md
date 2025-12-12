# BVST Plugin Shared Module Usage and Framework Information

This document summarizes the usage of shared modules (`System/shared/` and `System/bvst_lib/`) across various BVST plugins and highlights key aspects of their framework implementation.

---

## Plugins/Modulation/OrbitalChorus

*   **Type:** Effect
*   **Description:** Swirling chorus/flanger with stereo offset and feedback.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Delay}}` (for parameter handling, curves, DSP utilities, and delay effects).
*   **Framework Information:**
    *   Uses `AudioWorkletProcessor` in `processor.js` for high-performance audio processing.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`).
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to DSP parameters.
    *   Audio processing is done in the `process` function in Rust, which takes input and output buffers.
    *   UI configuration is defined directly in `gui.html` using a `CONFIG` object, which is then passed to `BVST.init()`.

---

## Plugins/Dynamics/GlueBusComp

*   **Type:** Dynamics
*   **Description:** Bus compressor with sidechain high-pass, mix, and makeup gain.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp}` (for plugin macro, parameter handling, curves, and DSP utilities like `db_to_lin` and `lerp`).
*   **Framework Information:**
    *   Uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust, which simplifies the parameter declaration.
    *   `AudioWorkletProcessor` in `processor.js` handles audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`).
    *   Parameter control is handled by the `bvst_plugin!` macro's generated `set_param` and the `Param` struct in Rust.
    *   Audio processing is done in the `process` function in Rust, which includes sidechain high-pass filtering, envelope detection, gain calculation, and wet/dry mixing.
    *   UI configuration is defined directly in `gui.html` using a `CONFIG` object, passed to `BVST.init()`.

---

## Plugins/Instruments/UniversalEngine

*   **Type:** Instrument
*   **Description:** Reference Universal Plugin Template (Polyphonic Synth)
*   **Shared Modules Used:**
    *   **JavaScript:** `../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, NoiseGen, WaveType}}` (for parameter handling, curves, DSP utilities including oscillators, state variable filters, ADSR envelopes, noise generation, and waveform types).
*   **Framework Information:**
    *   This is a polyphonic synthesizer with 8 voices.
    *   It handles MIDI note on/off events via `set_param` (with IDs 128 and 129) which then call `note_on` and `note_off` methods in Rust.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`).
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to DSP parameters and MIDI events.
    *   Audio processing is done in the `process` function in Rust, which iterates through voices, applies envelopes, oscillators, mixes noise, and routes through a state variable filter.
    *   UI configuration is defined directly in `gui.html` using a `CONFIG` object, which includes `midiMap` and `keyboard` settings, and is passed to `BVST.init()`.

---

## Plugins/Instruments/SliceMaster

*   **Type:** Instrument
*   **Description:** Rhythmic Slice Chopper. Maps C4-G4 to 8 slices.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_sampler.js` (specialized WASM loader for samplers, which likely provides the `init` and `BvstSynth` exports).
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Adsr, Delay}}` (for parameter handling, curves, DSP utilities including a `Sampler`, State Variable Filter (`Svf`), ADSR envelope, and `Delay`).
*   **Framework Information:**
    *   This plugin is a sampler-based instrument designed for slicing audio.
    *   It uses a custom `wasm_loader_sampler.js` which suggests a specialized WASM interface for sample loading.
    *   The `gui.html` includes a `keyboard` configuration with custom `onNoteOn` and `onNoteOff` logic to trigger slices based on MIDI notes (C4-G4).
    *   The `processor.js` is optimized for samplers and uses the shared `wasm_loader_sampler.js`.
    *   The `load_sample` function is exposed from the Rust WASM module to load audio data into the sampler.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various parameters including slice playback speed, envelope, filter, drive, and delay send.
    *   MIDI note on/off (IDs 128 and 129) directly trigger (`voice.trigger`) and release (`voice.release`) the internal voice.
    *   Audio processing is done in the `process` function in Rust, which operates in blocks (`BLOCK_SIZE`), handles sample playback, filtering, drive, and delay.

---

## Plugins/Instruments/NeonPoly

*   **Type:** Instrument
*   **Description:** Poly subtractive synth with dual oscillators, filter env, and LFO.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, NoiseGen, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filters, ADSR envelopes, noise generation, and waveform types).
*   **Framework Information:**
    *   This is a polyphonic subtractive synthesizer, similar in structure to `UniversalEngine` but with its own specific voice and parameter configuration.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI note on/off events via the `custom_param` function within the `bvst_plugin!` macro, which then calls `note_on` and `note_off` methods in Rust.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to DSP parameters and MIDI events.
    *   Audio processing is done in the `process` function in Rust, which iterates through voices, applies envelopes, oscillators, mixes noise, and routes through a state variable filter, incorporating LFO modulation.
    *   UI configuration is defined directly in `gui.html` using a `CONFIG` object, including `keyboard` settings, and is passed to `BVST.init()`.

---

## Plugins/Instruments/ArpOne

*   **Type:** Instrument
*   **Description:** Plucky monosynth with a built-in Javascript Arpeggiator.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **JavaScript (Sequencer):** `sequencer: { type: 'arp' }` in `gui.html` indicates integration with a shared sequencer, likely `System/shared/sequencer_core.js` and `System/shared/sequencer_ui.js` through `plugin_core.js`.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelope, delay, and waveform types).
*   **Framework Information:**
    *   This is a monophonic synthesizer designed for arpeggiation.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` config includes `sequencer: { type: 'arp' }`, indicating that `plugin_core.js` integrates a shared arpeggiator logic (likely from `System/shared/sequencer_core.js`). The arpeggiator controls MIDI notes which are then passed to the WASM module.
    *   MIDI note on/off events are handled by the `custom_param` function in Rust (IDs 128 and 129), which then trigger the internal envelope and reset oscillators.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth parameters (oscillator mix, pulse width, detune, filter cutoff, resonance, envelope amount, decay, release, delay time, delay mix, and volume).
    *   Audio processing is done in the `process` function in Rust, which generates audio from dual oscillators, routes it through a filter, applies an ADSR envelope, and adds delay.

---

## Plugins/Instruments/MorphFilter

*   **Type:** Instrument
*   **Description:** Noise/Drone synth with Multi-mode Filter and LFO.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **JavaScript (Visualizer):** `visualizer: 'scope'` in `gui.html` indicates integration with a shared oscilloscope visualizer, likely `System/shared/visualizer.js` through `plugin_core.js`.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, FilterMode, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, noise generator, state variable filter, ADSR envelope, filter modes, and waveform types).
*   **Framework Information:**
    *   This is a noise/drone synthesizer with a multi-mode filter and LFO modulation.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` has custom JavaScript code to update a label for the filter mode, demonstrating how UI elements can be dynamically updated.
    *   Handles MIDI `curr_freq` and `gate` events via `custom_param` (IDs 26 and 27) which trigger the ADSR envelope.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth parameters (oscillator mix, noise mix, filter mode, cutoff, resonance, LFO rate, LFO depth, and volume).
    *   Audio processing is done in the `process` function in Rust, which combines an oscillator and noise, applies LFO modulation to the filter cutoff, and processes through a multi-mode state variable filter.

---

## Plugins/Instruments/BeatMachine

*   **Type:** Instrument
*   **Description:** Drum machine with Kick, Snare, Hat and Bass.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **JavaScript (Sequencer):** `sequencer: { type: 'grid' }` in `gui.html` indicates integration with a shared sequencer, likely `System/shared/sequencer_core.js` and `System/shared/sequencer_ui.js` through `plugin_core.js`. This sequencer is a step grid.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, noise generator, state variable filter, ADSR envelope, and waveform types).
*   **Framework Information:**
    *   This is a drum machine instrument featuring a kick, snare, hat, and bass synthesis engines, each implemented as a separate Rust struct (`Kick`, `Snare`, `Hat`, `Bass`).
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` config includes `sequencer: { type: 'grid' }` with `initialData` for a 16-step pattern and `rows` mapping each drum sound to a MIDI note and a visual row. This integrates with a shared grid sequencer logic.
    *   MIDI note events (ID 128) are handled by the `custom_param` function in Rust, which then calls `trigger_note` to activate the corresponding drum sound with its specific parameters.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various drum parameters (volume, tune, decay, snap, tone, color, cutoff, etc.).
    *   Audio processing is done in the `process` function in Rust, which calls the `process` method for each drum voice and mixes their output.

---

## Plugins/Instruments/CelestialPad

*   **Type:** Instrument
*   **Description:** Ethereal pads with massive reverb and chorus.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Reverb, Delay, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelope, reverb, delay, and waveform types).
*   **Framework Information:**
    *   This is a polyphonic synthesizer designed for pad sounds, featuring multiple voices, chorus, and reverb.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI note on/off events via `custom_param` (IDs 128 and 129), which trigger and release individual voices. It also includes legacy MIDI handling (IDs 26 and 27).
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth parameters (filter cutoff, PWM rate, detune, chorus mix, reverb mix, volume, attack, and release).
    *   Audio processing is done in the `process` function in Rust, which sums the output of multiple voices (each with oscillators, filter, and ADSR), then applies chorus and reverb effects.

---

## Plugins/Instruments/JMS10

*   **Type:** Instrument
*   **Description:** Analog Monosynth inspired by the Korg MS-10.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType, FilterMode}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, noise generator, state variable filter, ADSR envelope, waveform types, and filter modes).
*   **Framework Information:**
    *   This is a monophonic analog-style synthesizer, emulating aspects of the Korg MS-10.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI `target_freq` (note frequency) and `gate` events via `custom_param` (IDs 26 and 27), which controls the envelope and glide.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth parameters (oscillator wave type, octave, pulse width, filter cutoff, resonance/peak, envelope generator amount to filter, modulation generator amount to filter, MG rate, MG wave, MG pitch modulation to VCO, ADSR envelope parameters, volume, and glide/portamento).
    *   Audio processing is done in the `process` function in Rust, which generates sound from an oscillator and noise, applies LFO modulation, processes through a state variable filter, and shapes with an ADSR envelope and VCA. It also includes glide functionality.

---

## Plugins/Instruments/BlueMarvinTwo

*   **Type:** Instrument
*   **Description:** ARP 2600 Emulation (Mk II) - 3 VCOs, 2 Envelopes, Ladder Filter
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_fx.js` (specialized WASM loader for FX/Hybrids, which implies it supports a 4-argument `process` function: `inL, inR, outL, outR`). Although this is an Instrument, it uses the FX loader, suggesting it *can* process input, even if it primarily generates sound.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType, FilterMode}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelopes, waveform types, and filter modes).
*   **Framework Information:**
    *   This is a complex polyphonic synthesizer emulating the ARP 2600, featuring 3 VCOs, 2 envelopes (one for filter, one for amp), and a ladder-style filter (implemented with two cascaded `Svf` instances).
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI note on/off events via `custom_param` (IDs 128 and 129), which trigger and release individual voices.
    *   Uses `AudioWorkletProcessor` in `processor.js` with `wasm_loader_fx.js`, indicating it's set up to handle stereo input and output in its `process` function in Rust.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from `wasm_loader_fx.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to a wide range of synth parameters (oscillator wave types, coarse/fine tuning, levels, filter frequency, resonance, envelope amounts, and ADSR/AR envelope timings).
    *   Audio processing is done in the `process` function in Rust, which iterates through voices, generating sound from 3 oscillators, mixes them, and then applies a dual cascaded state variable filter and two independent envelopes (filter and amplitude).

---

## Plugins/Instruments/GrainCloud

*   **Type:** Instrument
*   **Description:** Granular Texturizer with 8 parallel grain streams.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_sampler.js` (specialized WASM loader for samplers, indicating sample loading capabilities and a 4-argument `process` function).
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Delay}}` (for parameter handling, curves, DSP utilities including a `Sampler` (used for buffer storage), State Variable Filter (`Svf`), and `Delay`). It also implements a custom `Rng` (Random Number Generator) for granular operations.
*   **Framework Information:**
    *   This is a granular synthesizer that processes a loaded sample into a "cloud" of small grains.
    *   It uses a custom `Granulator` struct in Rust to manage the spawning and processing of individual grains.
    *   The `gui.html` config includes `sampler: { enabled: true, ... }` with custom `onSeek` and `onControlChange` logic to map UI interactions to granular parameters (e.g., `grainPos`, `grainSize`).
    *   The `processor.js` is optimized for samplers and uses the shared `wasm_loader_sampler.js`.
    *   The `load_sample` function is exposed from the Rust WASM module to load audio data into the internal `Sampler` buffer.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to granular parameters (position, spread, density, grain size, jitter size, jitter pitch, speed) and output effects (cutoff, delay send).
    *   Audio processing is done in the `process` function in Rust, which operates in blocks. Within each block, it spawns and processes individual grains, applies a filter, and adds delay.

---

## Plugins/Instruments/CosmoSampler

*   **Type:** Instrument
*   **Description:** Polyphonic Sampler with looping, filtering, drive, and delay.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_sampler.js` (specialized WASM loader for samplers, indicating sample loading capabilities and a 4-argument `process` function).
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Adsr, Delay}}` (for parameter handling, curves, DSP utilities including a `Sampler`, State Variable Filter (`Svf`), ADSR envelope, and `Delay`).
*   **Framework Information:**
    *   This is a monophonic sampler instrument with extensive controls over playback, looping, filtering, and effects.
    *   The `gui.html` config includes `sampler: { enabled: true, ... }` with custom `onNoteOn`, `onNoteOff`, `onSeek`, and `onPreview` logic to handle sampler-specific UI interactions and MIDI mapping.
    *   The `processor.js` is optimized for samplers and uses the shared `wasm_loader_sampler.js`.
    *   The `load_sample` function is exposed from the Rust WASM module to load audio data into the internal `Sampler` buffer.
    *   MIDI note on/off (IDs 128 and 129) directly trigger and release the internal voice. A special parameter ID 30 is used for seeking within the sample.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various sampler parameters (playback speed, loop start/end, loop enable, filter cutoff, resonance, filter mode, attack, release, drive, and delay send).
    *   Audio processing is done in the `process` function in Rust, which operates in blocks. Within each block, it processes the single voice, applies filter and drive, and adds delay. The sampler's pitch is modulated by MIDI notes.

---

## Plugins/Instruments/BlueMarvinOne

*   **Type:** Instrument
*   **Description:** ARP 2600 Emulation (Mk I) - 2 VCOs, 1 Envelope
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_fx.js` (specialized WASM loader for FX/Hybrids, which implies it supports a 4-argument `process` function: `inL, inR, outL, outR`). Similar to `BlueMarvinTwo`, it uses this loader even though it's an Instrument.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType, FilterMode}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelope, waveform types, and filter modes).
*   **Framework Information:**
    *   This is a polyphonic synthesizer emulating an earlier version of the ARP 2600, featuring 2 VCOs and 1 ADSR envelope.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI note on/off events via `custom_param` (IDs 128 and 129), which trigger and release individual voices.
    *   Uses `AudioWorkletProcessor` in `processor.js` with `wasm_loader_fx.js`, indicating it's set up to handle stereo input and output in its `process` function in Rust.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from `wasm_loader_fx.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth parameters (VCO frequencies/detune, pulse width, mix levels, filter cutoff, resonance, and ADSR envelope timings).
    *   Audio processing is done in the `process` function in Rust, which iterates through voices, generating sound from 2 oscillators, mixes them, and then applies a state variable filter and an ADSR envelope.

---

## Plugins/Instruments/RetroKeys

*   **Type:** Instrument
*   **Description:** Electric Piano Emulation with FM and Tremolo
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Reverb, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelope, reverb, and waveform types).
*   **Framework Information:**
    *   This is an electric piano emulator using FM synthesis and featuring tremolo and reverb effects.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` includes a `presets` object, demonstrating how presets can be defined within the UI configuration for quick sound changes.
    *   Handles MIDI `curr_freq` (note frequency) and `gate` events via `custom_param` (IDs 26 and 27), which controls the envelope.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth and effect parameters (FM amount, tremolo rate, tremolo depth, tone/filter cutoff, decay, volume, and reverb mix).
    *   Audio processing is done in the `process` function in Rust, which generates sound using two oscillators (carrier and modulator for FM), applies tremolo via an LFO, routes through a filter, and adds reverb.

---

## Plugins/Instruments/BamMono

*   **Type:** Instrument
*   **Description:** Dual Oscillator Analog-Style Monosynth
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, Delay, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, noise generator, state variable filter, ADSR envelopes, delay, and waveform types).
*   **Framework Information:**
    *   This is a monophonic analog-style synthesizer with dual oscillators, noise, two ADSR envelopes (one for amp, one for filter), a 24dB ladder-style filter (two cascaded `Svf` instances), LFO modulation, distortion, and delay.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` includes `presets` for quick sound changes.
    *   Handles MIDI `base_freq` (note frequency), `gate` (note on/off), and `velocity` events via `custom_param` (IDs 26, 27, and 28), which control the envelopes and note triggering.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to a comprehensive set of synth and effect parameters (oscillator waveforms, octaves, tuning, mix levels, noise mix, filter cutoff, resonance, filter envelope amount, ADSR envelope timings for both amp and filter, LFO rate, LFO amount to filter, glide/portamento, distortion amount, delay wet/dry mix, and master volume).
    *   Audio processing is done in the `process` function in Rust, which generates sound from two oscillators and noise, applies glide, modulates the filter with LFO and filter envelope, processes through the cascaded filter stages, applies distortion, shapes with the amp envelope, and adds delay.

---

## Plugins/Instruments/TechBass

*   **Type:** Instrument
*   **Description:** Aggressive FM Bass with Compression and Distortion.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Compressor, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelopes, compressor, and waveform types).
*   **Framework Information:**
    *   This is an FM bass synthesizer designed for aggressive sounds, featuring FM synthesis, filtering, distortion, and compression.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Handles MIDI `curr_freq` (note frequency) and `gate` events via `custom_param` (IDs 26 and 27), which controls both the amplitude and modulation envelopes.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth and effect parameters (FM amount, modulator ratio, filter cutoff, decay, drive/distortion, compressor threshold, and volume).
    *   Audio processing is done in the `process` function in Rust, which generates sound using two oscillators (carrier and modulator for FM), applies independent ADSR envelopes to amplitude and modulation, filters the signal, adds distortion (tanh), and finally processes through a compressor.

---

## Plugins/Instruments/BassLine303

*   **Type:** Instrument
*   **Description:** Acid Bass Sequencer
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **JavaScript (Sequencer):** `sequencer: { type: 'step' }` in `gui.html` indicates integration with a shared step sequencer, likely `System/shared/sequencer_core.js` and `System/shared/sequencer_ui.js` through `plugin_core.js`. It explicitly maps sequencer parameters like `freq`, `accent`, `slide`, and `gate`.
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType}}` (for plugin macro, parameter handling, curves, DSP utilities including oscillators, state variable filter, ADSR envelope, and waveform types).
*   **Framework Information:**
    *   This is a monophonic bass synthesizer with a built-in step sequencer, emulating the Roland TB-303. It features unique accent and slide behaviors.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` config includes `sequencer: { type: 'step', ... }` with `paramMap` to connect sequencer events (note frequency, accent, slide, gate) to specific WASM parameters. It also has sequencer control buttons and BPM knob.
    *   Sequencer events (parameters 20, 21, 22, 23 for freq, accent, slide, gate) are handled by the `custom_param` function in Rust, which updates internal state for note frequency, accent, and slide, and triggers the ADSR envelope.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various synth and effect parameters (oscillator wave type, sub oscillator volume, filter cutoff, resonance, envelope modulation amount, decay, accent amount, drive/distortion, glide, and master volume).
    *   Audio processing is done in the `process` function in Rust, which generates sound from a main oscillator and a sub oscillator, applies glide, modulates a cascaded state variable filter with the envelope and accent, adds drive, and shapes with the amplitude envelope.

---

## Plugins/Instruments/ResampleX

*   **Type:** Instrument
*   **Description:** Lo-Fi Resampling Synth with Bitcrush and Downsampling
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader_sampler.js` (specialized WASM loader for samplers, indicating sample loading capabilities and a 4-argument `process` function).
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Adsr, Delay}}` (for parameter handling, curves, DSP utilities including a `Sampler`, State Variable Filter (`Svf`), ADSR envelope, and `Delay`).
*   **Framework Information:**
    *   This is a monophonic sampler instrument focused on lo-fi audio effects, including bitcrushing and sample rate reduction.
    *   The `gui.html` config includes `sampler: { enabled: true, ... }` with custom `onNoteOn`, `onNoteOff`, `onSeek`, and `onPreview` logic to handle sampler-specific UI interactions and MIDI mapping.
    *   The `processor.js` is optimized for samplers and uses the shared `wasm_loader_sampler.js`.
    *   The `load_sample` function is exposed from the Rust WASM module to load audio data into the internal `Sampler` buffer.
    *   MIDI note on/off (IDs 128 and 129) directly trigger and release the internal voice. A special parameter ID 30 is used for seeking within the sample.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various sampler parameters (playback speed, loop start/end, loop enable, bit depth, sample rate reduction factor, filter cutoff, resonance, filter mode, attack, release, drive, and delay send).
    *   Audio processing is done in the `process` function in Rust, which operates in blocks. Within each block, it processes the single voice, applies sample rate reduction and bitcrushing, filtering, drive, and adds delay. The sampler's pitch is modulated by MIDI notes.

---

## Plugins/Effects/AuroraDelay

*   **Type:** Effect
*   **Description:** Tape-voiced delay with tone sculpting and gentle modulation.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **Rust (bvst_lib):** `bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Delay, Svf}}` (for plugin macro, parameter handling, curves, DSP utilities including `Delay` and State Variable Filter (`Svf`)).
*   **Framework Information:**
    *   This is a stereo delay effect with built-in tone shaping and LFO-driven modulation for stereo width.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to various effect parameters (delay time, feedback, mix, tone/filter frequency, drive, and stereo width modulation amount).
    *   Audio processing is done in the `process` function in Rust, which takes input and output buffers. It applies soft saturation, filters the signal with an SVF, and then feeds it into two independent delay lines with LFO modulation to create stereo widening. The output is then mixed.

---

## Plugins/Utility/GainPanScope

*   **Type:** Utility
*   **Description:** Gain and tilt utility with simple metering safety.
*   **Shared Modules Used:**
    *   **JavaScript:** `../../../System/shared/plugin_core.js` (for UI and core plugin setup)
    *   **JavaScript (WASM Loader):** `../../../System/shared/wasm_loader.js` (general-purpose WASM loader).
    *   **JavaScript (Visualizer):** `visualizer: 'scope'` in `gui.html` indicates integration with a shared oscilloscope visualizer, likely `System/shared/visualizer.js` through `plugin_core.js`.
    *   **Rust (bvst_lib):** `bvst_lib::{Param, Curve, dsp}` (for parameter handling, curves, and DSP utilities like `db_to_lin`).
*   **Framework Information:**
    *   This is a utility plugin for controlling gain and pan/tilt, and visualizing the audio waveform.
    *   It uses the `bvst_plugin!` macro for defining the plugin structure and parameters in Rust.
    *   The `gui.html` config includes `visualizer: 'scope'`, enabling the shared oscilloscope.
    *   Uses `AudioWorkletProcessor` in `processor.js` for audio.
    *   WASM module (`bvst_engine_bg.wasm`) is initialized via `__wbg_init` (or `init`) from the general `wasm_loader.js`.
    *   Parameter control is handled by `set_param` in Rust, mapping integer IDs to gain (dB), pan/tilt, mono switch, and clip guard.
    *   Audio processing is done in the `process` function in Rust, which applies gain, a simple tilt EQ (influenced by the pan parameter), an optional clip guard (tanh), and performs basic RMS and peak metering. It currently treats stereo input as mono for processing purposes if `mono` is enabled.
