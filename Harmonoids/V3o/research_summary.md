
### Research Findings on Web Audio API for Musical Elements

**Sound Synthesis and Harmonic Frequencies:**
*   The Web Audio API provides `OscillatorNode` for generating basic waveforms (sine, square, sawtooth, triangle). Multiple `OscillatorNode`s can be combined to create complex sounds through additive synthesis.
*   Generating a harmonic series involves creating multiple `OscillatorNode`s, each set to an integer multiple of a fundamental frequency, and then summing their outputs. A `GainNode` can be used to control the overall amplitude and prevent clipping.

**Real-time Audio Processing (Pitch Shifting & Tempo Changes):**
*   **Pitch Shifting:** Directly changing the `playbackRate` of an `AudioBufferSourceNode` will alter both pitch and tempo. For independent pitch shifting (without changing tempo), more advanced techniques like granular synthesis or dedicated pitch-shifting algorithms (often implemented via `AudioWorklet` or external libraries) are required. Some resources suggest that `AudioBufferSourceNode.playbackRate` can be used for pitch shifting if `preservesPitch` is set to `false` (though this might be an HTML5 Audio element property, not directly Web Audio API's `AudioBufferSourceNode`). Further investigation or a simpler approach for the prototype might be needed.
*   **Tempo Changes:** The `playbackRate` property of `AudioBufferSourceNode` directly controls the playback speed, which can be used for tempo changes. If the source is an `OscillatorNode`, changing its frequency will change its pitch, not its tempo.

**Musical Scales, Chords, and Intervals:**
*   The harmonic series naturally contains fundamental musical intervals (octave, perfect fifth, perfect fourth, major third, minor third). This provides a strong basis for generating musically relevant sounds.
*   Chords can be constructed by combining specific frequencies (e.g., a major triad from 440Hz, 550Hz, 660Hz as shown in an example).

**Conclusion for Prototype:**
For the initial prototype, we can leverage `OscillatorNode`s for generating Harmonoid sounds and harmonic gates. For pitch shifting, we can initially implement a simple frequency change on the `OscillatorNode` (which will also change tempo) and explore more advanced pitch-shifting techniques if time permits or if it's crucial for the core gameplay. Tempo changes for Harmonoid movement can be handled by adjusting their animation speed, and if tied to audio, we can explore `playbackRate` on `AudioBufferSourceNode` if we use pre-recorded samples, or manipulate `OscillatorNode` frequencies if we want to change the 

