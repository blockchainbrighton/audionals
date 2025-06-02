// timeline_PulseSweep_64bars **NEEDS CLEAN ENDING**
// Features a dynamic pixelation effect that changes at specific, non-uniform bar intervals,
// cycling through predefined pixel sizes. This creates a more syncopated or pulsed pixel reveal.
export function timeline_PulseSweep_64bars() {
  // Specific bar timings for pixel changes
  const pixelChangeBars = [0, 4, 8, 16, 32, 40, 48, 56, 60, 64]; // Last entry is timeline end

  // Desired pixel sizes to cycle through (can be in any order you design)
  // We have 9 intervals defined by pixelChangeBars, so we need 9 pixel sizes.
  // Let's create a sequence that pulses and generally decreases.
  const pixelSequence = [
    240, // Bar 0-4
    160, // Bar 4-8
    200, // Bar 8-16 (pulse up)
    120, // Bar 16-32
    80,  // Bar 32-40
    160, // Bar 40-48 (pulse up)
    80,  // Bar 48-56
    1,   // Bar 56-60 (quick clear)
    1    // Bar 60-64 (hold clear)
  ];

  if (pixelSequence.length !== pixelChangeBars.length - 1) {
    console.error("timeline_PulseSweep_64bars: Mismatch between pixelSequence length and the number of intervals defined by pixelChangeBars. Adjust data.");
    // Fallback or throw error
    return [];
  }

  const pixelateEntries = [];
  for (let i = 0; i < pixelSequence.length; i++) {
    pixelateEntries.push({
      effect: "pixelate",
      param: "pixelSize",
      from: pixelSequence[i],
      to: pixelSequence[i], // Hold this value for the duration of the segment
      startBar: pixelChangeBars[i],
      endBar: pixelChangeBars[i +2],
      easing: "linear" // Easing is irrelevant when from === to
    });
  }

  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "linear" },

    // --- Dynamic, Timed Pixelation ---
    // Replaces the original continuous pixelate animation.
    // PixelSize changes at specific bar intervals to create a pulsing effect.
    ...pixelateEntries,

    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 4, endBar: 12, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0, to: 1, startBar: 20, endBar: 28, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 36, endBar: 44, easing: "linear" },

    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 44, easing: "linear" },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.7, startBar: 4, endBar: 44, easing: "linear" },

    // Blur should resolve completely, let's extend its endBar to match where pixelation gets very low or clear.
    // Given the new pixelation, it makes sense for blur to resolve by bar 56 or 60.
    // Original endBar was 44.
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 56, easing: "easeInOut" },

    // Original pixelate entry is removed and replaced by pixelateEntries
    // { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 44, easing: "linear" }
  ];
}