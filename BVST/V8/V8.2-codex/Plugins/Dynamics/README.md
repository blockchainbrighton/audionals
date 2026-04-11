# Dynamics

This category contains **Dynamic Processors** (Compressors, Limiters, Gates, Expanders).

## Reference Implementation: `UniversalDynamics`
A Feed-Forward Compressor demonstrating:
*   **Envelope Follower:** Detection of signal level.
*   **Gain Computer:** Calculating reduction based on Threshold/Ratio.
*   **Smoothing:** Attack/Release ballistics.

## How to Create a New Dynamics Plugin
1.  Copy `UniversalDynamics`.
2.  Update `manifest.json`.
3.  Modify the `Compressor` struct in `lib.rs` to implement different topologies (e.g., Feedback, Opto, RMS).

## Key Considerations
*   **Metering:** Visualizing Gain Reduction is currently done via the main "Scope", but future updates might support a dedicated GR meter in the `Visualizer` module.
*   **Sidechain:** BVST currently supports Stereo In/Out. For external sidechain, you would need a 4-channel input setup (supported by the unified loader, but `host.html` needs configuration).
