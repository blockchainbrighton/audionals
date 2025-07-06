// ---- visor-js/flashUtils.js

// Returns true if text should be ON (visible) this frame
export function isFlashOn(playbackTime, seedCfg, bpm = 104.15) {
    if (!seedCfg.flashing) return true;
    // Determine which BPM/timing to use
    const baseBpm = seedCfg.flashSyncBPM || bpm;
    const division = seedCfg.flashDivision || 1;
    const beats = seedCfg.flashBeats || 1;
  
    // Duration of one flash cycle (on+off) in seconds
    const beatLength = 60 / baseBpm;
    const flashCycle = beatLength * beats / division;
  
    // Use playback time to decide if ON or OFF (e.g., on for first half, off for second)
    const phase = playbackTime % flashCycle;
    return phase < flashCycle / 2;
  }
  