### `DEVELOPER_GUIDE.md`


# Audionaut FX Playground - Developer Documentation

## Overview

The Audionaut FX Playground is a single-page web application built with HTML, CSS, and JavaScript. Its primary function is to render an image (typically a PFP from a service like Ordinals.com) onto an HTML5 Canvas and apply a series of WebGL-based visual effects. These effects are controlled by a programmable timeline, synchronized with audio playback.

The application features a modular architecture, separating configuration, rendering, playback logic, and visual components.

## Project Structure


.
├── index.html              # Main application file: structure, styles, and config
├── js/
│   ├── main.js             # Core effects engine (WebGL, canvas management)
│   └── playback.js         # Timeline and audio synchronization logic
├── timelines/
│   └── timeline_*.js       # Effect sequence definitions (e.g., timeline_colourBandsGlitchReveal.js)
└── media/
    └── audionaut-*.png     # Static image assets like the helmet overlay


## Core Concepts

### 1. Configuration (in `index.html`)

The application is primarily configured by setting global `window` variables within a `<script>` tag in `index.html`. This allows for easy customization for each instance of the playground.

*   `window.images`: An array containing the URL of the primary PFP image.
*   `window.badgeImages`: An optional array containing the URL of a badge image to be composited onto the PFP.
*   `window.fxTimelineUrl`: The path to the JavaScript file that defines the effect sequence.
*   `window.fxInitialBPM`: The initial "Beats Per Minute" for synchronizing the effects timeline.
*   `window.titleText` & `window.secondaryTitleText`: The initial large text and the text it animates to when playback begins.
*   `window.titleTextAnimationDuration`: Duration in milliseconds for the title text animation.

### 2. Rendering Pipeline & Layers

The visual output is composed of several layers managed by HTML and CSS:

1.  **Image Composition (JavaScript)**: Before initialization, a script checks for `window.badgeImages`. If a badge is present, it programmatically draws the main PFP and the badge onto a temporary canvas and exports the result as a Base64 `data:URL`. This composite image becomes the new source for `window.images[0]`, ensuring the effects engine receives a single, unified image.

2.  **PFP Canvas (`#main-canvas`)**: This is the base layer where the PFP image is rendered. The visual effects from `main.js` are applied directly to this canvas.

3.  **Helmet Overlay (`#helmet-overlay`)**: This is an `<img>` element positioned absolutely on top of the canvas (`z-index: 2`). It uses a transparent PNG to create a frame around the PFP.

4.  **Clipping Frame (`#canvas-frame`)**: The canvas and the helmet are both children of this container. Crucially, `#canvas-frame` has `overflow: hidden`, which ensures that when the helmet is scaled up, its edges are neatly clipped to the container's boundaries.

### 3. Helmet Overlay Customization

The helmet's appearance can be easily adjusted using CSS Custom Properties defined in the `:root` selector in `index.html`.

```css
:root {
  --helmet-scale: 1.3;   /* Zoom factor. 1 = no zoom. */
  --helmet-x: 0px;       /* Horizontal offset. */
  --helmet-y: 0px;       /* Vertical offset. */
}

#helmet-overlay {
  transform: scale(var(--helmet-scale)) translate(var(--helmet-x), var(--helmet-y));
}
```

To change the helmet's fit, simply edit the values of these variables. For example, to make the helmet smaller and shift it down:

```css
:root {
  --helmet-scale: 0.9;
  --helmet-y: 20px;
}
```

### 4. Animation & Playback Hooks

The application includes a system for animating the main title text. This is decoupled from the core playback logic via globally accessible functions.

*   `window.animateTitleOnPlay()`: Call this function when timeline playback begins. It animates the title text from its large, initial state to its smaller, faded-out state.
*   `window.resetTitleText()`: Call this function when timeline playback stops or is reset. It instantly reverts the title to its initial large, visible state.

**Implementation Requirement:** The core playback logic (likely within `playback.js` or `main.js`) **must** call these functions at the appropriate times to ensure the UI behaves as expected.

**Example:**
```javascript
// Inside your playback logic file (e.g., playback.js)

function playTimeline() {
  // ... your existing logic to start effects and audio ...
  window.animateTitleOnPlay(); // HOOK: Trigger the title animation
}

function stopTimeline() {
  // ... your existing logic to stop effects and audio ...
  window.resetTitleText(); // HOOK: Reset the title
}
```

## How to Customize

*   **Change the PFP**: Modify the URL in the `window.images` array in `index.html`.
*   **Change or Remove the Badge**: Modify or clear the URL in the `window.badgeImages` array. If the array is empty or the URL is blank, the composition step will be skipped.
*   **Change the Helmet Image**: Update the `src` attribute of the `<img id="helmet-overlay">` element.
*   **Adjust the Helmet Fit**: Modify the `--helmet-scale`, `--helmet-x`, and `--helmet-y` CSS variables in `index.html`.
*   **Load a Different Effect Sequence**: Change the path in the `window.fxTimelineUrl` variable to point to a different timeline definition file.

