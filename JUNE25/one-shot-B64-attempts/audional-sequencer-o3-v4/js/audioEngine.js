// audioEngine.js - Facade

// Import from audioCore to ensure it's initialized and to get ctx
// The import itself ensures audioCore.js runs its initAudioEngineStateListener.
import { ctx as coreCtx } from './audioCore.js';

// Import and re-export from playbackEngine
// This makes start, stop, and playStartTime available as if they were defined in this module,
// maintaining the live binding for the exported 'playStartTime' variable.
export { start, stop, playStartTime } from './playbackEngine.js';

// Export ctx, obtained from audioCore
export const ctx = coreCtx;