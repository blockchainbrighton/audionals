// osc-signatures.js
// Lifts Signature + Sequencer bridge into a single cohesive mixin.
// Public API preserved from osc-signature-sequencer.js

export function Signatures(app) {
  const humKey = () => app.humKey || 'hum';
  const shapeList = () => {
    const fromCanvas = app._canvas?.listShapes?.();
    const list = Array.isArray(fromCanvas) && fromCanvas.length ? fromCanvas : (Array.isArray(app.shapes) ? app.shapes : []);
    return list.filter(k => k !== humKey());
  };
  const shapeCount = () => shapeList().length;
  const allKeys = () => [humKey(), ...shapeList()];
  const randIntInclusive = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const randValue = (rng) => { const N = shapeCount(); return randIntInclusive(rng, 0, N); };
  const randNonHum = (rng) => { const N = shapeCount(); return N > 0 ? randIntInclusive(rng, 1, N) : 0; };

  // ---------- Global toggles ----------
  function _onToggleSequencer() {
    const s = app.state;
    s.isSequencerMode = !s.isSequencerMode;
    app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';
    if (s.isSequencerMode) {
      app._main.style.overflow = 'auto';
      if (app._canvasContainer) { app._canvasContainer.style.maxHeight = '60vh'; app._canvasContainer.style.flex = '0 0 auto'; }
      if (app._canvas) { app._canvas.style.maxHeight = '60vh'; }
      updateSequencerState();
    } else {
      app._main.style.overflow = 'hidden';
      if (app._canvasContainer) { app._canvasContainer.style.maxHeight = ''; app._canvasContainer.style.flex = ''; }
      if (app._canvas) { app._canvas.style.maxHeight = ''; }
      s.isRecording = false; s.currentRecordSlot = -1;
      if (s.sequencePlaying) stopSequence();
      if (s.signatureSequencerRunning) _stopSignatureSequencer();
    }
    app._updateControls();
  }

  function _onLoopToggle() {
    app.state.isLoopEnabled = !app.state.isLoopEnabled;
    app._updateControls();
    if (app.state.audioSignaturePlaying && !app.state.isSequenceSignatureMode) {
      app._loader.textContent = app.state.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.';
    }
  }

  function _onSignatureModeToggle() {
    const s = app.state;
    s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
    app._updateControls();
    if (s.sequencePlaying) {
      stopSequence(); stopAudioSignature();
      app._loader.textContent = s.isSequenceSignatureMode
        ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.'
        : 'Sequencer Signature Mode disabled. Press Play for normal step timing.';
    }
  }

  // ---------- Signature generation ----------
  function _getUniqueAlgorithmMapping(seed) {
    const rng = app._rng(`${seed}_unique_algo_mapping`);
    const keys = allKeys(); const count = keys.length;
    const base = [1,2,3,4,5,6,7,8,9,10]; const pool = [];
    while (pool.length < count) pool.push(...base); pool.length = count;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const map = {}; keys.forEach((k, i) => { map[k] = pool[i]; }); return map;
  }

  function generateAudioSignature(seed, algorithm = 1) {
    const rng = app._rng(`${seed}_audio_signature_v${algorithm}`);
    const STEPS = 32;
    switch (algorithm) {
      case 1: { const seq = []; for (let i = 0; i < STEPS; i++) seq.push(randValue(rng)); return seq; }
      case 2: return _generateSignatureWithConstraints(seed, { steps: STEPS, paletteSize: Math.min(6, Math.max(1, shapeCount())), pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true });
      case 3: { const L = 8; const pattern = Array.from({ length: L }, () => randValue(rng)); return Array.from({ length: STEPS }, (_, i) => pattern[i % L]); }
      case 4: { const N = shapeCount(); const seq = [0]; let cur = 0; for (let i = 1; i < STEPS; i++) { const dir = rng() > 0.5 ? 1 : -1; const step = (Math.floor(rng() * 3) + 1); cur = Math.max(0, Math.min(N, cur + dir * step)); seq.push(cur); } return seq; }
      case 5: { const seq = []; let cluster = randValue(rng); for (let i = 0; i < STEPS;) { const len = Math.min((Math.floor(rng() * 6) + 2), STEPS - i); for (let j = 0; j < len; j++, i++) seq.push(cluster); cluster = randValue(rng); } return seq; }
      case 6: { const seq = []; for (let i = 0; i < STEPS; i++) seq.push(rng() > 0.7 ? randNonHum(rng) : 0); return seq; }
      case 7: { const seq = new Array(STEPS).fill(0); let pos = 0; let a = 1, b = 1; while (pos < STEPS) { seq[pos] = randNonHum(rng); const next = a + b; a = b; b = next; pos += next; } return seq; }
      case 8: { const a = randValue(rng); const b = randValue(rng); return Array.from({ length: STEPS }, (_, i) => (i % 2 === 0 ? a : b)); }
      case 9: { let v = randNonHum(rng); const seq = []; for (let i = 0; i < STEPS; i++) { if (rng() < 0.2 || v === 0) v = randValue(rng); seq.push(v); if (rng() > 0.7) v = Math.max(0, v - 1); } return seq; }
      case 10: { let c = randValue(rng); const seq = []; for (let i = 0; i < STEPS; i++) { if (i % 8 === 0 || rng() > 0.6) c = randValue(rng); seq.push(c); } return seq; }
      default: return _generateSignatureWithConstraints(seed);
    }
  }

  function _generateSignatureWithConstraints(seed, { steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true } = {}) {
    const rng = app._rng(`${seed}_audio_signature_constrained`);
    const N = shapeCount(); const sequence = []; const paletteCount = Math.max(1, Math.min(N, paletteSize));
    let last = null; let prevNonHum = null;
    for (let i = 0; i < steps; i++) {
      if (rng() < pSilence) { sequence.push(null); continue; }
      const roll = rng(); let next;
      if (roll < pHum) next = 0;
      else if (roll < pHum + pRepeat && prevNonHum !== null) next = prevNonHum;
      else {
        do {
          next = randIntInclusive(rng, 1, paletteCount);
          if (avoidBackAndForth && last !== null && last >= 1 && next >= 1) {
            if (sequence.length >= 2 && sequence[sequence.length - 2] === next) next = null;
          }
        } while (next === null);
      }
      sequence.push(next);
      if (next !== null) { if (next >= 1) prevNonHum = next; last = next; }
    }
    return sequence;
  }

  // ---------- Audio Signature triggers ----------
  function _onAudioSignature() {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
    const selected = s._uiReturnShapeKey || s.current || humKey();
    _triggerSignatureFor(selected, { loop: s.isLoopEnabled });
  }

  function _triggerSignatureFor(shapeKey, { loop = app.state.isLoopEnabled } = {}) {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    if (s.sequencePlaying) stopSequence();
    if (s.audioSignaturePlaying) stopAudioSignature();
    s._uiReturnShapeKey = shapeKey || s._uiReturnShapeKey || humKey();
    const algorithmMap = _getUniqueAlgorithmMapping(s.seed);
    const algorithm = algorithmMap[shapeKey] || 1;
    const sequence = generateAudioSignature(s.seed, algorithm);
    playAudioSignature(sequence, algorithm, { loop });
    app._loader.textContent = loop ? `Playing ${shapeKey} Audio Signature (Loop).` : `Playing ${shapeKey} Audio Signature...`;
  }

  function playAudioSignature(sequence, algorithm = 1, { loop = false, onComplete = null } = {}) {
    const s = app.state; if (s.audioSignaturePlaying) stopAudioSignature();
    const currentUiShape = (typeof s.current === 'string' && s.current) ? s.current : null; s._uiReturnShapeKey = currentUiShape || s._uiReturnShapeKey || humKey();
    s.audioSignaturePlaying = true; s.audioSignatureStepIndex = 0; s.audioSignatureOnComplete = onComplete;
    let stepTime; switch (algorithm) { case 3: case 7: stepTime = 100; break; case 5: stepTime = 150; break; case 10: stepTime = 200; break; default: stepTime = 125; }
    const playStep = () => {
      if (!s.audioSignaturePlaying) return;
      const stepIndex = s.audioSignatureStepIndex; const shapeIndex = sequence[stepIndex];
      if (shapeIndex !== null) {
        let sk; if (shapeIndex === 0) sk = humKey(); else { const list = shapeList(); sk = list[shapeIndex - 1]; }
        if (sk) { app._updateControls({ shapeKey: sk }); app._onShapeChange({ detail: { shapeKey: sk } }); }
      }
      s.audioSignatureStepIndex++;
      if (s.audioSignatureStepIndex >= sequence.length) {
        const finishOnce = () => { s.audioSignaturePlaying = false; s.audioSignatureTimer = null; const cb = s.audioSignatureOnComplete; s.audioSignatureOnComplete = null; if (typeof cb === 'function') cb(); else app._loader.textContent = 'Audio Signature complete.'; };
        if (loop) { s.audioSignatureStepIndex = 0; s.audioSignatureTimer = setTimeout(playStep, stepTime); }
        else {
          try { app.setActiveChain(humKey(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
          if (app._canvas) app._canvas.isPlaying = false;
          if (s._uiReturnShapeKey) { app.state.current = s._uiReturnShapeKey; app._updateControls({ shapeKey: s._uiReturnShapeKey }); } else { app._updateControls({}); }
          s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
        }
        return;
      }
      s.audioSignatureTimer = setTimeout(playStep, stepTime);
    };
    playStep();
  }

  function stopAudioSignature() {
    const s = app.state; if (s.audioSignatureTimer) { clearTimeout(s.audioSignatureTimer); s.audioSignatureTimer = null; }
    s.audioSignaturePlaying = false; s.audioSignatureStepIndex = 0;
    try { app.setActiveChain(humKey(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
    if (app._canvas) app._canvas.isPlaying = false;
    if (s._uiReturnShapeKey) { app.state.current = s._uiReturnShapeKey; app._updateControls({ shapeKey: s._uiReturnShapeKey }); } else { app._updateControls({}); }
    s.audioSignatureOnComplete = null;
  }

  // ---------- Sequencer bridge ----------
  function _onSeqRecordStart(e) { const slotIndex = e?.detail?.slotIndex ?? -1; app.state.isRecording = true; app.state.currentRecordSlot = slotIndex; app._updateControls(); }
  function _onSeqStepCleared(e) {
    const slotIndex = e?.detail?.slotIndex; if (typeof slotIndex !== 'number') return;
    app.state.sequence[slotIndex] = null;
    if (app.state.isRecording && app.state.currentRecordSlot === slotIndex) { app.state.currentRecordSlot = (slotIndex + 1) % 8; if (app.state.currentRecordSlot === 0) app.state.isRecording = false; }
  }
  function _onSeqStepRecorded(e) { const { slotIndex, value, nextSlot, isRecording } = e?.detail ?? {}; if (typeof slotIndex === 'number') app.state.sequence[slotIndex] = value; if (typeof nextSlot === 'number') app.state.currentRecordSlot = nextSlot; if (typeof isRecording === 'boolean') app.state.isRecording = isRecording; }
  function _onSeqPlayStarted(e) { const stepTime = e?.detail?.stepTime; app.state.sequencePlaying = true; app.state.sequenceStepIndex = 0; app.state._seqFirstCycleStarted = false; if (typeof stepTime === 'number') app.state.stepTime = stepTime; app._updateControls(); if (app.state.isSequenceSignatureMode) { app._sequencerComponent?.stopSequence(); _startSignatureSequencer(); } }
  function _onSeqPlayStopped() { const s = app.state; s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; if (s.signatureSequencerRunning) _stopSignatureSequencer(); app._updateControls(); }
  function _onSeqStepAdvance(e) {
    if (app.state.isSequenceSignatureMode) return;
    const d = e?.detail || {}; const stepIndex = (typeof d.stepIndex === 'number') ? d.stepIndex : (typeof d.index === 'number') ? d.index : app.state.sequenceStepIndex; const value = d.value;
    if (app.state.sequencePlaying) {
      if (stepIndex === 0) { if (app.state._seqFirstCycleStarted) { if (!app.state.isLoopEnabled) { stopSequence(); return; } } else { app.state._seqFirstCycleStarted = true; } }
    }
    app.state.sequenceStepIndex = stepIndex;
    let shapeKey = null; if (value === 0) shapeKey = humKey(); else if (value >= 1 && value <= shapeCount()) shapeKey = shapeList()[value - 1]; else return;
    app._updateControls({ shapeKey }); app._onShapeChange({ detail: { shapeKey } });
  }
  function _onSeqStepTimeChanged(e) { const stepTime = e?.detail?.stepTime; if (typeof stepTime === 'number') app.state.stepTime = stepTime; }
  function _onSeqStepsChanged(e) {
    const steps = e?.detail?.steps; if (typeof steps === 'number' && steps > 0) {
      app.state.sequenceSteps = steps;
      const currentLength = app.state.sequence.length;
      if (steps !== currentLength) {
        const oldSeq = [...app.state.sequence]; const oldVel = [...(app.state.velocities || [])];
        app.state.sequence = Array.from({ length: steps }, (_, i) => oldSeq[i] ?? null);
        app.state.velocities = Array.from({ length: steps }, (_, i) => oldVel[i] ?? 1);
      }
      updateSequencerState();
    }
  }

  async function _startSignatureSequencer() {
    const s = app.state; if (s.signatureSequencerRunning) return; s.signatureSequencerRunning = true;
    stopAudioSignature(); const algorithmMap = _getUniqueAlgorithmMapping(s.seed);
    const runOnePass = async () => {
      if (!s.signatureSequencerRunning) return;
      for (let i = 0; i < s.sequence.length; i++) {
        if (!s.signatureSequencerRunning) return;
        s.sequenceStepIndex = i; updateSequencerState();
        const value = s.sequence[i];
        if (value === null || typeof value !== 'number' || value < 0) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        let shapeKey = null; if (value === 0) shapeKey = humKey(); else if (value >= 1 && value <= shapeCount()) shapeKey = shapeList()[value - 1];
        if (!shapeKey) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        const algo = algorithmMap[shapeKey] || 1; const seq = generateAudioSignature(s.seed, algo);
        await new Promise(resolve => { if (!s.signatureSequencerRunning) { resolve(); return; } playAudioSignature(seq, algo, { loop: false, onComplete: () => resolve() }); });
        if (!s.signatureSequencerRunning) return; await app._sleep(Math.max(30, s.stepTime));
      }
    };
    await runOnePass(); if (!s.signatureSequencerRunning) return;
    if (s.isLoopEnabled && s.sequencePlaying) { while (s.signatureSequencerRunning && s.sequencePlaying) { await runOnePass(); } }
    _stopSignatureSequencer(); app._sequencerComponent?.stopSequence?.();
  }

  function _stopSignatureSequencer() {
    const s = app.state; s.signatureSequencerRunning = false; stopAudioSignature(); s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; updateSequencerState(); if (s._uiReturnShapeKey) app._updateControls({ shapeKey: s._uiReturnShapeKey }); else app._updateControls();
  }

  function updateSequencerState() {
    if (!app._sequencerComponent) return;
    app._sequencerComponent.updateState?.({
      isRecording: app.state.isRecording,
      currentRecordSlot: app.state.currentRecordSlot,
      sequence: [...app.state.sequence],
      velocities: [...app.state.velocities],
      sequencePlaying: app.state.sequencePlaying,
      sequenceStepIndex: app.state.sequenceStepIndex,
      stepTime: app.state.stepTime,
      isLoopEnabled: app.state.isLoopEnabled,
      isSequenceSignatureMode: app.state.isSequenceSignatureMode,
      steps: app.state.sequenceSteps
    });
  }

  function recordStep(number) { app._sequencerComponent?.recordStep(number); }
  function playSequence() { app._sequencerComponent?.playSequence(); }
  function stopSequence() { app._sequencerComponent?.stopSequence(); if (app.state.signatureSequencerRunning) _stopSignatureSequencer(); if (app.state.audioSignaturePlaying) stopAudioSignature(); app.state.sequencePlaying = false; app.state.sequenceStepIndex = 0; app.state._seqFirstCycleStarted = false; updateSequencerState(); app._updateControls(); }

  return {
    // toggles
    _onToggleSequencer, _onLoopToggle, _onSignatureModeToggle,
    // signatures
    _getUniqueAlgorithmMapping, generateAudioSignature, _generateSignatureWithConstraints,
    _onAudioSignature, _triggerSignatureFor, playAudioSignature, stopAudioSignature,
    // sequencer bridge
    _onSeqRecordStart, _onSeqStepCleared, _onSeqStepRecorded, _onSeqPlayStarted, _onSeqPlayStopped, _onSeqStepAdvance, _onSeqStepTimeChanged, _onSeqStepsChanged,
    _startSignatureSequencer, _stopSignatureSequencer, updateSequencerState,
    // proxies
    recordStep, playSequence, stopSequence,
  };
}
