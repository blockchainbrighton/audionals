# Utility

This category contains **Signal Tools** (Generators, Analyzers, Gain Staging, Routing).

## Reference Implementation: `UniversalUtility`
A swiss-army knife tool demonstrating:
*   **Test Tone Gen:** Sin/Noise/Saw at specific frequencies (useful for calibrating systems).
*   **Stereo Imaging:** Mid/Side processing for Width control.
*   **Phase:** Channel inversion.

## How to Create a New Utility
1.  Copy `UniversalUtility`.
2.  Implement features like DC Offset removal, Tuner (Pitch detection), or custom signal routing.

## Key Considerations
*   **Visualizer:** The `Visualizer` module ("spectrum" mode) is very useful here for Analysis tools.
