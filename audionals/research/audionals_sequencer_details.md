# Audionals On-Chain Sequencer Research

## BETA_XI Sequencer Interface

The BETA_XI version of the Audionals on-chain sequencer (BitcoinBeats) is an advanced digital audio workstation that operates directly on the Bitcoin blockchain. Based on exploring the interface, it has the following key features and capabilities:

### Core Functionality

1. **Multi-Channel Sequencer**: The interface provides multiple audio channels (at least 16) for creating complex compositions with different audio samples.

2. **JSON-Based Storage**: Compositions are saved as JSON files, which aligns with the Audionals JSON standard for on-chain audio. This allows for complete compositions to be stored on the Bitcoin blockchain as Ordinals.

3. **BPM Control**: Users can adjust the Beats Per Minute (BPM) to control the tempo of the sequence, with a slider interface for precise control.

4. **Step Sequencer**: The interface uses a step sequencer grid where users can activate steps for each channel to create rhythmic patterns.

5. **Sample Loading**: Each channel can load different audio samples, likely from a library of on-chain audio samples.

### Channel Controls

Each channel has several control options:

1. **Volume (V)**: Adjusts channel volume with a click interface.

2. **Pitch (P)**: Adjusts pitch using playback speed for the current channel.

3. **Audio Trim (T)**: Opens an Audio Trimmer for precise sample editing.

4. **Clear Channel (C)**: Clears the channel's active steps.

5. **Mute Channel (M)**: Mutes or unmutes the current channel.

6. **Solo Channel (S)**: Solos the current channel for isolated playback.

### Pattern Manipulation

The sequencer includes advanced pattern creation tools:

1. **Step Buttons**: Left-click to activate a step (red square), right-click to set reverse play (green square). Grey indicates inactive steps.

2. **Auto-draw Patterns**: Automatically generates trigger patterns for the current channel, with options for different pattern types.

3. **Pattern Shift**: Shifts the entire pattern one step to the right.

### Project Management

1. **Save/Load**: Save work to a JSON file or load a preset sequence from a dropdown or local file.

2. **Copy/Paste**: Copy current sequence steps for pasting to a new sequence.

3. **Project Naming**: Users can name their projects for organization.

4. **Sequence Navigation**: Navigate between multiple sequences with Previous/Next buttons.

5. **Continuous Play**: Toggle continuous play mode for uninterrupted playback.

## Technical Implementation

The Audionals on-chain sequencer appears to be implemented as a web application that can be inscribed as an Ordinal on the Bitcoin blockchain. This makes it a "recursive inscription" - an application that exists on-chain and can create new on-chain content.

The sequencer creates compositions that are stored as JSON files following the Audionals protocol standard, which includes both the audio data (likely in base64 encoding) and comprehensive metadata. When executed, these files programmatically generate the song using on-chain resources.

This implementation demonstrates how the Bitcoin blockchain can be used not just for storing audio files, but for hosting the actual tools used to create and manipulate those files, creating a complete on-chain music production ecosystem.
