// audioEngine.js - Facade

// Import the single, primary AudioContext from audioCore.js
import { ctx as primaryCtx } from './audioCore.js';

// Import and re-export from playbackEngine
// This makes start, stop, and playStartTime available as if they were defined in this module,
// maintaining the live binding for the exported 'playStartTime' variable.
export { start, stop, playStartTime } from './playbackEngine.js';

// Re-export the primary AudioContext from audioCore.js
// Any module importing 'ctx' from 'audioEngine.js' will now get the one from 'audioCore.js'.
export { primaryCtx as ctx };

// The State import is no longer needed here as the onstatechange logic
// that used it has been moved to audioCore.js.
// import State from './state.js'; // NO LONGER NEEDED HERE

// All the AudioContext creation, diagnostic logging, and onstatechange handling
// that was previously in this file has been removed or moved to audioCore.js
// to ensure a single source of truth and central management of the AudioContext.

console.log("[audioEngine] Facade initialized. Re-exporting primary ctx from audioCore and playback functions.");