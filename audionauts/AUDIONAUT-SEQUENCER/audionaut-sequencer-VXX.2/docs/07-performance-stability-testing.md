
# Performance & Stability Testing Protocol

**Test Matrix**
- Browsers: Chrome, Safari, Firefox (latest)
- Devices: Desktop, recent iOS/Android
- Sample rate: 44.1k, 48k

**Scenarios**
1. 10-minute transport loop, 8 tracks active, 64 steps
2. Rapid BPM sweep 60↔160 while running
3. Open/close synth modal repeatedly
4. Save/Load project 10x in a session

**Metrics**
- CPU usage (DevTools Performance)
- GC/heap growth
- Audio glitches (subjective + `AudioWorklet` meter if added)
- Console errors/warnings

**Pass Criteria**
- Zero uncaught exceptions
- No audible clicks from envelope triggers at default gains
- No drift in step highlighting vs audio
