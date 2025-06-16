# Music Sequencer Project Schema Documentation

## 1. Overview

This document describes the JSON schema used for storing music sequencer projects. The schema defines the project's global settings (like tempo), an array of channels (tracks), and playback state. Each channel contains its own audio source, step sequence, and various audio processing parameters.

The primary purpose of this schema is to save and load the state of a music project within a web-based or standalone digital audio workstation (DAW) or sequencer application.

## 2. Root Object

The root of the JSON object contains global project settings and the main data structures.

| Field Name      | Data Type        | Description                                                                                                | Example Value      |
|-----------------|------------------|------------------------------------------------------------------------------------------------------------|--------------------|
| `projectName`   | String           | A user-defined name for the project.                                                                       | `"Jimmy 12"`       |
| `bpm`           | Number           | Beats Per Minute. The tempo of the project.                                                                | `120`              |
| `channels`      | Array of Objects | An array where each object represents a single audio channel/track. See [Channel Object](#3-channel-object) for details. | `[...]`            |
| `playing`       | Boolean          | Indicates if the project is currently in playback mode. `true` if playing, `false` if paused/stopped.        | `false`            |
| `currentStep`   | Number           | The current step (0-indexed) in the sequence playback. Likely ranges from 0 to `steps.length - 1`.       | `0`                |

## 3. Channel Object

Each object within the `channels` array represents a single instrument track or audio channel. It contains the sequence data, audio source, and various parameters for playback and effects. In the provided example, there are 16 channels, some with audio sources and step data, and others are empty placeholders.

| Field Name                    | Data Type         | Description                                                                                                                                                             | Example Value (from Kick channel) | Notes                                                                   |
|-------------------------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|-------------------------------------------------------------------------|
| `name`                        | String            | A user-friendly name for the channel.                                                                                                                                   | `"Kick"`                          |                                                                         |
| `steps`                       | Array of Booleans | An array representing the sequencer steps for this channel. `true` indicates a note/trigger at that step, `false` indicates silence. The length (e.g., 64) determines the sequence length (e.g., 4 bars of 16th notes). | `[true, false, ...]`              | Length is typically a power of 2 (e.g., 16, 32, 64).                    |
| `src`                         | String / `null`   | URL or path to the audio sample for this channel. `null` if no sample is loaded.                                                                                          | `"https://ordinals.com/..."`      | Could be a local path or a web URL.                                     |
| `volume`                      | Number            | The volume level for this channel, typically ranging from 0.0 (silent) to 1.0 (full volume).                                                                            | `0.8`                             | Values > 1.0 might be possible for gain.                                |
| `mute`                        | Boolean           | If `true`, this channel is muted.                                                                                                                                       | `false`                           |                                                                         |
| `solo`                        | Boolean           | If `true`, this channel is soloed (typically mutes other non-soloed channels).                                                                                          | `false`                           |                                                                         |
| `pitch`                       | Number            | Pitch shift in semitones. `0` is original pitch. Positive values shift up, negative values shift down.                                                                  | `0` (Kick), `13` (Cowbell)        |                                                                         |
| `reverse`                     | Boolean           | If `true`, the audio sample is played in reverse.                                                                                                                       | `false` (Kick), `true` (Cowbell)  |                                                                         |
| `trimStart`                   | Number            | Normalized start point for trimming the sample (0.0 to 1.0). `0` is the beginning of the sample.                                                                          | `0`                               | `0.0` to `trimEnd`.                                                     |
| `trimEnd`                     | Number            | Normalized end point for trimming the sample (0.0 to 1.0). `1.0` is the end of the sample.                                                                              | `1`                               | `trimStart` to `1.0`.                                                   |
| `hpfCutoff`                   | Number            | High-Pass Filter cutoff frequency in Hz.                                                                                                                                | `20`                              | Frequencies below this are attenuated.                                  |
| `hpfQ`                        | Number            | High-Pass Filter Q factor (resonance).                                                                                                                                  | `0.707`                           | Higher values create a resonant peak at the cutoff.                     |
| `lpfCutoff`                   | Number            | Low-Pass Filter cutoff frequency in Hz.                                                                                                                                 | `20000`                           | Frequencies above this are attenuated.                                  |
| `lpfQ`                        | Number            | Low-Pass Filter Q factor (resonance).                                                                                                                                   | `0.707`                           | Higher values create a resonant peak at the cutoff.                     |
| `eqLowGain`                   | Number            | Gain adjustment for the low-frequency band of an equalizer, typically in dB. `0` is no change.                                                                          | `0`                               | The specific frequency range for "Low" is not defined in the schema.    |
| `eqMidGain`                   | Number            | Gain adjustment for the mid-frequency band of an equalizer, typically in dB. `0` is no change.                                                                           | `0`                               | The specific frequency range for "Mid" is not defined in the schema.    |
| `eqHighGain`                  | Number            | Gain adjustment for the high-frequency band of an equalizer, typically in dB. `0` is no change.                                                                         | `0`                               | The specific frequency range for "High" is not defined in the schema.   |
| `fadeInTime`                  | Number            | Duration of the fade-in effect in seconds when a sample starts playing. `0` means no fade-in.                                                                           | `0`                               |                                                                         |
| `fadeOutTime`                 | Number            | Duration of the fade-out effect in seconds applied at the end of a sample's playback (considering trim). `0` means no fade-out.                                           | `0`                               |                                                                         |
| `activePlaybackScheduledTime` | Number / `null`   | Timestamp (e.g., from `AudioContext.currentTime`) when the current sound on this channel was scheduled to start playing. `null` if no sound is actively scheduled/playing. | `null`                            | Likely a runtime state, not necessarily for persistent storage editing. |
| `activePlaybackDuration`      | Number / `null`   | The actual duration (in seconds) of the sound currently playing on this channel, considering trimming and potential fades. `null` if not applicable.                      | `null`                            | Likely a runtime state.                                                 |
| `activePlaybackTrimStart`     | Number / `null`   | The `trimStart` value used for the currently active playback instance. `null` if no sound active or if default trim is used.                                                | `0` (Kick), `null` (Channel 8)  | Allows for dynamic trim overrides during playback.                      |
| `activePlaybackTrimEnd`       | Number / `null`   | The `trimEnd` value used for the currently active playback instance. `null` if no sound active or if default trim is used.                                                  | `1` (Kick), `null` (Channel 8)  | Allows for dynamic trim overrides during playback.                      |
| `activePlaybackReversed`      | Boolean / `null`  | Whether the currently active playback instance is reversed. `null` if no sound active or if default reverse setting is used.                                                | `null`                            | Allows for dynamic reverse overrides during playback.                   |

**Note on `activePlayback...` fields:**
These fields (`activePlaybackScheduledTime`, `activePlaybackDuration`, `activePlaybackTrimStart`, `activePlaybackTrimEnd`, `activePlaybackReversed`) appear to store runtime state information about the audio that is *currently* playing or scheduled on a channel.
*   For channels with `src: null` (empty channels), these `activePlayback...` fields are also `null`.
*   For channels with a `src` but no `true` steps (or project not playing), these are also `null`.
*   When saving a project, these might be reset to `null` or reflect the last known state if the application supports "freezing" runtime parameters.

## 4. Data Types Summary

*   **String**: Standard text. Used for names, URLs.
*   **Number**: Numerical values. Used for BPM, volume, pitch, filter/EQ settings, time durations, step counts.
*   **Boolean**: `true` or `false`. Used for on/off states like steps, mute, solo, reverse.
*   **Array**: Ordered list of values. Used for `channels` and `steps`.
*   **Object**: Collection of key-value pairs. Used for the root object and individual channel objects.
*   **`null`**: Represents the absence of a value, e.g., an empty channel `src` or no active playback.

## 5. Example Snippet (Kick Channel)

```json
{
  "name": "Kick",
  "steps": [
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false,
    true, false, false, false, false, false, false, false
  ],
  "src": "https://ordinals.com/content/437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0",
  "volume": 0.8,
  "mute": false,
  "solo": false,
  "pitch": 0,
  "reverse": false,
  "trimStart": 0,
  "trimEnd": 1,
  "hpfCutoff": 20,
  "hpfQ": 0.707,
  "lpfCutoff": 20000,
  "lpfQ": 0.707,
  "eqLowGain": 0,
  "eqMidGain": 0,
  "eqHighGain": 0,
  "fadeInTime": 0,
  "fadeOutTime": 0,
  "activePlaybackScheduledTime": null,
  "activePlaybackDuration": null,
  "activePlaybackTrimStart": 0,
  "activePlaybackTrimEnd": 1,
  "activePlaybackReversed": null
}