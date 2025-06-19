// StrobeFocus_64bars.js
// Features explicitly defined pixel stages at 4-bar intervals for a controlled, strobing focus effect.
export function StrobeFocus_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:64, easing: "linear" },

    // --- Explicitly Defined Pixelation Stages at 4-bar Intervals ---
    // Total 16 stages for 64 bars
    { effect: "pixelate", param: "pixelSize", from: 120, to: 120, startBar: 0,  endBar: 4,  easing: "linear" }, // Start moderate
    { effect: "pixelate", param: "pixelSize", from: 80,  to: 80,  startBar: 4,  endBar: 8,  easing: "linear" }, // Step down
    { effect: "pixelate", param: "pixelSize", from: 60,  to: 60,  startBar: 8,  endBar: 12, easing: "linear" }, // Further down
    { effect: "pixelate", param: "pixelSize", from: 40,  to: 40,  startBar: 12, endBar: 16, easing: "linear" }, // Leading into first strobe

    // First Strobe visual (coincides with fade & glitch around bar 16-18)
    // Pixelation jumps during the strobe
    { effect: "pixelate", param: "pixelSize", from: 20,  to: 20,  startBar: 16, endBar: 17, easing: "linear" }, // Sharper for strobe start
    { effect: "pixelate", param: "pixelSize", from: 160, to: 160, startBar: 17, endBar: 18, easing: "linear" }, // Jump to very blocky
    { effect: "pixelate", param: "pixelSize", from: 80,  to: 80,  startBar: 18, endBar: 20, easing: "linear" }, // Settle slightly
    { effect: "pixelate", param: "pixelSize", from: 60,  to: 60,  startBar: 20, endBar: 24, easing: "linear" },

    { effect: "pixelate", param: "pixelSize", from: 40,  to: 40,  startBar: 24, endBar: 28, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 20,  to: 20,  startBar: 28, endBar: 32, easing: "linear" }, // Leading into second strobe

    // Second Strobe visual (coincides with fade around bar 32)
    // Pixelation changes during this strobe too
    { effect: "pixelate", param: "pixelSize", from: 10,  to: 10,  startBar: 32, endBar: 33, easing: "linear" }, // Even sharper
    { effect: "pixelate", param: "pixelSize", from: 120, to: 120, startBar: 33, endBar: 34, easing: "linear" }, // Blocky again
    { effect: "pixelate", param: "pixelSize", from: 60,  to: 60,  startBar: 34, endBar: 36, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 30,  to: 30,  startBar: 36, endBar: 40, easing: "linear" },

    // Final focus pull to clarity
    { effect: "pixelate", param: "pixelSize", from: 10,  to: 10,  startBar: 40, endBar: 44, easing: "linear" },
    // The "quick focus" mentioned in the original script:
    // { effect: "pixelate", param: "pixelSize", from:4, to:60, startBar:40, endBar:41 },
    // { effect: "pixelate", param: "pixelSize", from:60, to:1, startBar:41, endBar:44 }
    // The above is hard to do with strict 4-bar intervals without very many entries.
    // So, we'll make the final steps to clarity happen over these 4-bar segments.
    { effect: "pixelate", param: "pixelSize", from: 8,   to: 8,   startBar: 44, endBar: 48, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 4,   to: 4,   startBar: 48, endBar: 52, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 2,   to: 2,   startBar: 52, endBar: 56, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 1,   to: 1,   startBar: 56, endBar: 64, easing: "linear" }, // Hold clear for last 8 bars

    // Strobe fade effects
    { effect:"fade", param:"progress", from:1, to:0.2, startBar:16, endBar:16.5, easing: "linear" },
    { effect:"fade", param:"progress", from:0.2, to:1, startBar:16.5, endBar:17, easing: "linear" },

    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17, easing: "linear" }, // Coincides with first strobe
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18, easing: "linear" },

    // Second strobe fade
    { effect:"fade", param:"progress", from:1, to:0, startBar:32, endBar:32.4, easing: "linear" },
    { effect:"fade", param:"progress", from:0, to:1, startBar:32.4, endBar:32.8, easing: "linear" },
  ];
}