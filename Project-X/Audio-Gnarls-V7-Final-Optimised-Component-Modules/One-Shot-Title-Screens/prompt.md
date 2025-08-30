Goal

Create a single self-contained HTML file (inline CSS + JS) that renders a square title overlay for the project “Audio Gnarls.” This overlay plays a short, high-impact intro sequence—showing, animating, and transforming the words “Audio Gnarls”—and then reveals the underlying already-running artwork by ending fully transparent (or removing itself).
Do not implement any audio synthesis, visualizers, or the underlying art program. This is only the title/reveal layer.

Canvas & Layout

One square stage (e.g., 1024×1024 or responsive but always square).

The overlay must sit on top of an existing app (assume there is content beneath it). Use absolute/fixed positioning and high z-index.

At the end of the sequence, the overlay becomes transparent (opacity→0) and disables pointer events, or dispatches a completion event and removes itself from the DOM.

Title Focus

Prominently feature the text “Audio Gnarls” as the hero object. The title is the only content the overlay animates.

Sequence (example flow—make it feel cinematic)

Black intro with subtle grain.

Audio Gnarls appears via one or more treatments (fade, scale from nothing, kerning drift, particle assemble, etc.).

Short montage cycling through several distinct title treatments (see below), each 0.5–2s, with tasteful transitions.

Reveal transition: creative wipe/dissolve that ends with the overlay fully transparent so the underlying artwork is visible and interactive.

Title Treatments (cycle internally or via key T)

Implement at least 6 distinct treatments; keep them purely visual:

Assemble/Disassemble (explode/implode letters)

Kern-drift (micro jitter, elastic spacing)

Glitch/Scramble (brief substitutions, scanlines)

Spline-flow (letters slide along curved paths)

Gravity pile (simple faux physics: drop & settle)

Mask-type (letters act as a stencil to black, then invert)

Wave-warp (letters displaced by a synthetic waveform)

Pixelate → Sharpen (progressive clarity)

Reveal Modes (cycle via key R)

Implement at least 3 reveal styles that end in full transparency:

Radial/Iris wipe

Noise-threshold dissolve (seeded)

Venetian blinds / scanline decode

Determinism (optional but encouraged)

Support a seeded RNG so the montage order, noise patterns, and minor variations are repeatable.

const CONFIG = {
  SEED: 12345,          // change to explore; used for deterministic randomness
  CANVAS_SIZE: 1024,    // square stage
  START_TREATMENT: "Assemble",
  START_REVEAL: "NoiseDissolve",
  LOW_POWER: false,     // fewer particles/cheaper effects
  AUTO_START: true,     // play sequence on user gesture or on load if allowed
  AUTO_REMOVE: true     // remove node after reveal completes
};

Controls (lightweight)

Space: pause/resume montage.

T: cycle Title Treatments.

R: cycle Reveal Modes.

S: save snapshot (PNG of the title overlay stage).

Esc or Skip Button: immediately finish and reveal transparency.

Provide a minimal unobtrusive overlay UI (top-left) showing current treatment, reveal, seed, and a Skip button.

Integration Hooks

Expose a tiny API on window.AudioGnarlsTitle:

start(), pause(), resume(), replay()

setSeed(n), randomizeSeed()

setTitleTreatment(name), setReveal(name)

skipToReveal()

on(eventName, handler) to subscribe to:

"started", "treatmentchange", "revealchange", "complete"

On completion, either:

Dispatch a CustomEvent: AudioGnarlsTitle:complete, and

Remove or fade the overlay to full transparency and set pointer-events:none.

Visual Polish

Subtle bloom/grain/vignette (cheap post effects).

Typography: system stack + one inline stylized face; animated letterspacing.

Respect LOW_POWER by reducing particles, blur, and trail lengths.

Accessibility: reduced motion query to shorten or simplify animations.

Performance & Fallback

Target 60 FPS; degrade gracefully.

Prefer Canvas2D or minimal WebGL (if used, provide a Canvas2D fallback).

No external network calls; everything inline.

Non-Goals (explicitly exclude)

No Web Audio API synths, presets, call-signs, visualizers, or oscilloscope modes.

No generation of the underlying artwork or NFT logic.

No blockchain/Web3 calls.

No external fonts/scripts/styles.

What to Output

A single HTML document containing:

The square title overlay canvas + tiny UI.

Inline JS implementing:

The title treatments (≥6),

The reveal modes (≥3),

The deterministic seeding (optional),

Controls & the public API,

Completion event & graceful removal/opacity-to-0.

Clean, commented, modular code so additional treatments/reveals can be added easily.

A dev preview mode that shows a black square “beneath” the overlay if no page content exists, so behavior can be tested standalone. In production, the overlay must be transparent at the end so the existing Audio Gnarls artworks beneath are revealed.