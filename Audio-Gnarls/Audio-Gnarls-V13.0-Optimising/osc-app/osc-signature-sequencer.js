// osc-signature-sequencer.js

/**
 * =============================================================================
 * osc-signature-sequencer.js — Signature generation + Sequencer bridge
 * =============================================================================
 * Notes (updated):
 * - Uses internal helpers for shape-index<->key and timing to reduce branching.
 * - Avoids external dependency on app.updateSequencerState() by calling the
 *   local method consistently.
 * - UI messaging guarded behind optional DOM nodes.
 * - Restores user selection reliably without flipping UI to HUM.
 */

export function SignatureSequencer(app) {
  // ---------- Dynamic shape helpers (discover from <scope-canvas>) ----------
  const humKey = () => app.humKey || 'hum';

  const shapeList = () => {
    const fromCanvas = app._canvas?.listShapes?.();
    const list = Array.isArray(fromCanvas) && fromCanvas.length
      ? fromCanvas
      : (Array.isArray(app.shapes) ? app.shapes : []);
    return list.filter(k => k !== humKey());
  };

  const shapeCount = () => shapeList().length; // N (excluding hum)
  const allKeys = () => [humKey(), ...shapeList()];

  // ---------- Pure helpers ----------
  const randIntInclusive = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const randValue = (rng) => { // 0..N (0 = hum)
    const N = shapeCount();
    return randIntInclusive(rng, 0, N);
  };
  const randNonHum = (rng) => { // 1..N
    const N = shapeCount();
    return N > 0 ? randIntInclusive(rng, 1, N) : 0;
  };

  const indexToShapeKey = (value) => {
    if (value === 0) return humKey();
    if (typeof value === 'number' && value >= 1 && value <= shapeCount()) {
      return shapeList()[value - 1];
    }
    return null;
  };

  const selectStepTimeByAlgorithm = (algorithm) => {
    switch (algorithm) {
      case 3:
      case 7:  return 100;
      case 5:  return 150;
      case 10: return 200;
      default: return 125;
    }
  };

  const safeSleep = async (ms) => {
    if (typeof app._sleep === 'function') return app._sleep(ms);
    return new Promise(r => setTimeout(r, ms));
  };

  const setLoaderText = (t) => {
    if (app._loader && typeof t === 'string') app._loader.textContent = t;
  };

  const restoreUiSelection = () => {
    const s = app.state;
    if (s._uiReturnShapeKey) {
      app.state.current = s._uiReturnShapeKey;
      app._updateControls?.({ shapeKey: s._uiReturnShapeKey });
    } else {
      app._updateControls?.({});
    }
  };

  return {
    // ---------- Global toggles ----------
    _onToggleSequencer() {
      const s = app.state;
      s.isSequencerMode = !s.isSequencerMode;

      if (app._sequencerComponent) {
        app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';
      }

      if (s.isSequencerMode) {
        if (app._main) app._main.style.overflow = 'auto';
        if (app._canvasContainer) {
          app._canvasContainer.style.maxHeight = '60vh';
          app._canvasContainer.style.flex = '0 0 auto';
        }
        if (app._canvas) app._canvas.style.maxHeight = '60vh';
        this.updateSequencerState();
      } else {
        if (app._main) app._main.style.overflow = 'hidden';
        if (app._canvasContainer) {
          app._canvasContainer.style.maxHeight = '';
          app._canvasContainer.style.flex = '';
        }
        if (app._canvas) app._canvas.style.maxHeight = '';
        s.isRecording = false;
        s.currentRecordSlot = -1;
        if (s.sequencePlaying) this.stopSequence();
        if (s.signatureSequencerRunning) this._stopSignatureSequencer();
      }

      app._updateControls?.();
    },

    _onLoopToggle() {
      app.state.isLoopEnabled = !app.state.isLoopEnabled;
      app._updateControls?.();
      if (app.state.audioSignaturePlaying && !app.state.isSequenceSignatureMode) {
        setLoaderText(app.state.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.');
      }
    },

    _onSignatureModeToggle() {
      const s = app.state;
      s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
      app._updateControls?.();

      if (s.sequencePlaying) {
        this.stopSequence();
        this.stopAudioSignature();
        setLoaderText(
          s.isSequenceSignatureMode
            ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.'
            : 'Sequencer Signature Mode disabled. Press Play for normal step timing.'
        );
      }
    },

    // ---------- Signature generation ----------
    _getUniqueAlgorithmMapping(seed) {
      const rng = app._rng(`${seed}_unique_algo_mapping`);
      const keys = allKeys();             // [hum, ...shapes]
      const count = keys.length;

      const base = [1,2,3,4,5,6,7,8,9,10];
      const pool = [];
      while (pool.length < count) pool.push(...base);
      pool.length = count;

      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const map = {};
      keys.forEach((k, i) => { map[k] = pool[i]; });
      return map;
    },

    generateAudioSignature(seed, algorithm = 1) {
      const rng = app._rng(`${seed}_audio_signature_v${algorithm}`);
      const STEPS = 32;

      switch (algorithm) {
        case 1: {
          const seq = []; for (let i = 0; i < STEPS; i++) seq.push(randValue(rng)); return seq;
        }
        case 2:
          return this._generateSignatureWithConstraints(seed, {
            steps: STEPS, paletteSize: Math.min(6, Math.max(1, shapeCount())),
            pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true
          });
        case 3: {
          const L = 8; const pattern = Array.from({ length: L }, () => randValue(rng));
          return Array.from({ length: STEPS }, (_, i) => pattern[i % L]);
        }
        case 4: {
          const N = shapeCount();
          const seq = [0]; let cur = 0;
          for (let i = 1; i < STEPS; i++) {
            const dir = rng() > 0.5 ? 1 : -1; const step = (Math.floor(rng() * 3) + 1);
            cur = Math.max(0, Math.min(N, cur + dir * step)); seq.push(cur);
          } return seq;
        }
        case 5: {
          const seq = []; let cluster = randValue(rng);
          for (let i = 0; i < STEPS;) {
            const len = Math.min((Math.floor(rng() * 6) + 2), STEPS - i);
            for (let j = 0; j < len; j++, i++) seq.push(cluster);
            cluster = randValue(rng);
          } return seq;
        }
        case 6: {
          const seq = []; for (let i = 0; i < STEPS; i++) seq.push(rng() > 0.7 ? randNonHum(rng) : 0); return seq;
        }
        case 7: {
          const seq = new Array(STEPS).fill(0); let pos = 0; let a = 1, b = 1;
          while (pos < STEPS) { seq[pos] = randNonHum(rng); const next = a + b; a = b; b = next; pos += next; }
          return seq;
        }
        case 8: {
          const a = randValue(rng); const b = randValue(rng);
          return Array.from({ length: STEPS }, (_, i) => (i % 2 === 0 ? a : b));
        }
        case 9: {
          let v = randNonHum(rng);
          const seq = [];
          for (let i = 0; i < STEPS; i++) {
            if (rng() < 0.2 || v === 0) v = randValue(rng);
            seq.push(v); if (rng() > 0.7) v = Math.max(0, v - 1);
          } return seq;
        }
        case 10: {
          let c = randValue(rng);
          const seq = [];
          for (let i = 0; i < STEPS; i++) { if (i % 8 === 0 || rng() > 0.6) c = randValue(rng); seq.push(c); }
          return seq;
        }
        default:
          return this._generateSignatureWithConstraints(seed);
      }
    },

    _generateSignatureWithConstraints(seed, {
      steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true
    } = {}) {
      const rng = app._rng(`${seed}_audio_signature_constrained`);
      const N = shapeCount();
      const sequence = [];
      const paletteCount = Math.max(1, Math.min(N, paletteSize));

      let last = null;
      let prevNonHum = null;

      for (let i = 0; i < steps; i++) {
        if (rng() < pSilence) { sequence.push(null); continue; }
        const roll = rng();
        let next;

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
        if (next !== null) {
          if (next >= 1) prevNonHum = next;
          last = next;
        }
      }

      return sequence;
    },

    // ---------- Audio Signature UI trigger ----------
    _onAudioSignature() {
      const s = app.state;
      if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
      const selected = s._uiReturnShapeKey || s.current || humKey();
      this._triggerSignatureFor(selected, { loop: s.isLoopEnabled });
    },

    _triggerSignatureFor(shapeKey, { loop = app.state.isLoopEnabled } = {}) {
      const s = app.state;
      if (!s.contextUnlocked || !s.initialShapeBuffered) return;

      if (s.sequencePlaying) this.stopSequence();
      if (s.audioSignaturePlaying) this.stopAudioSignature();

      s._uiReturnShapeKey = shapeKey || s._uiReturnShapeKey || humKey();

      const algorithmMap = this._getUniqueAlgorithmMapping(s.seed);
      const algorithm = algorithmMap[shapeKey] || 1;
      const sequence = this.generateAudioSignature(s.seed, algorithm);

      this.playAudioSignature(sequence, algorithm, { loop });

      setLoaderText(loop
        ? `Playing ${shapeKey} Audio Signature (Loop).`
        : `Playing ${shapeKey} Audio Signature...`);
    },

    // ---------- Signature playback ----------
    playAudioSignature(sequence, algorithm = 1, { loop = false, onComplete = null } = {}) {
      const s = app.state;
      if (s.audioSignaturePlaying) this.stopAudioSignature();

      const currentUiShape = (typeof s.current === 'string' && s.current) ? s.current : null;
      s._uiReturnShapeKey = currentUiShape || s._uiReturnShapeKey || humKey();

      s.audioSignaturePlaying = true;
      s.audioSignatureStepIndex = 0;
      s.audioSignatureOnComplete = onComplete;

      const stepTime = selectStepTimeByAlgorithm(algorithm);

      const playStep = () => {
        if (!s.audioSignaturePlaying) return;

        const stepIndex = s.audioSignatureStepIndex;
        const shapeIndex = sequence[stepIndex];

        if (shapeIndex !== null) {
          const shapeKey = indexToShapeKey(shapeIndex);
          if (shapeKey) {
            app._updateControls?.({ shapeKey });
            app._onShapeChange?.({ detail: { shapeKey } });
          }
        }

        s.audioSignatureStepIndex++;

        if (s.audioSignatureStepIndex >= sequence.length) {
          const finishOnce = () => {
            s.audioSignaturePlaying = false;
            s.audioSignatureTimer = null;
            const cb = s.audioSignatureOnComplete;
            s.audioSignatureOnComplete = null;
            if (typeof cb === 'function') cb();
            else setLoaderText('Audio Signature complete.');
          };

          if (loop) {
            s.audioSignatureStepIndex = 0;
            s.audioSignatureTimer = setTimeout(playStep, stepTime);
          } else {
            try { app.setActiveChain?.(humKey(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
            if (app._canvas) app._canvas.isPlaying = false;

            restoreUiSelection();

            s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
          }
          return;
        }

        s.audioSignatureTimer = setTimeout(playStep, stepTime);
      };

      playStep();
    },

    stopAudioSignature() {
      const s = app.state;
      if (s.audioSignatureTimer) {
        clearTimeout(s.audioSignatureTimer);
        s.audioSignatureTimer = null;
      }
      s.audioSignaturePlaying = false;
      s.audioSignatureStepIndex = 0;

      try { app.setActiveChain?.(humKey(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
      if (app._canvas) app._canvas.isPlaying = false;

      restoreUiSelection();
      s.audioSignatureOnComplete = null;
    },

    // ---------- Sequencer bridge ----------
    _onSeqRecordStart(e) {
      const slotIndex = e?.detail?.slotIndex ?? -1;
      app.state.isRecording = true;
      app.state.currentRecordSlot = slotIndex;
      app._updateControls?.();
    },

    _onSeqStepCleared(e) {
      const slotIndex = e?.detail?.slotIndex;
      if (typeof slotIndex !== 'number') return;

      app.state.sequence[slotIndex] = null;

      if (app.state.isRecording && app.state.currentRecordSlot === slotIndex) {
        app.state.currentRecordSlot = (slotIndex + 1) % app.state.sequenceSteps;
        if (app.state.currentRecordSlot === 0) app.state.isRecording = false;
      }
    },

    _onSeqStepRecorded(e) {
      const { slotIndex, value, nextSlot, isRecording } = e?.detail ?? {};
      if (typeof slotIndex === 'number') app.state.sequence[slotIndex] = value;
      if (typeof nextSlot === 'number') app.state.currentRecordSlot = nextSlot;
      if (typeof isRecording === 'boolean') app.state.isRecording = isRecording;
    },

    _onSeqPlayStarted(e) {
      const stepTime = e?.detail?.stepTime;
      app.state.sequencePlaying = true;
      app.state.sequenceStepIndex = 0;
      app.state._seqFirstCycleStarted = false;
      if (typeof stepTime === 'number') app.state.stepTime = stepTime;
      app._updateControls?.();

      if (app.state.isSequenceSignatureMode) {
        app._sequencerComponent?.stopSequence?.();
        this._startSignatureSequencer();
      }
    },

    _onSeqPlayStopped() {
      const s = app.state;
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;

      if (s.signatureSequencerRunning) this._stopSignatureSequencer();

      app._updateControls?.();
    },

    _onSeqStepAdvance(e) {
      if (app.state.isSequenceSignatureMode) return;

      const d = e?.detail || {};
      const stepIndex = (typeof d.stepIndex === 'number') ? d.stepIndex
                       : (typeof d.index === 'number') ? d.index
                       : app.state.sequenceStepIndex;
      const value = d.value;

      if (app.state.sequencePlaying) {
        if (stepIndex === 0) {
          if (app.state._seqFirstCycleStarted) {
            if (!app.state.isLoopEnabled) {
              this.stopSequence();
              return;
            }
          } else {
            app.state._seqFirstCycleStarted = true;
          }
        }
      }

      app.state.sequenceStepIndex = stepIndex;

      const shapeKey = indexToShapeKey(value);
      if (!shapeKey) return;

      app._updateControls?.({ shapeKey });
      app._onShapeChange?.({ detail: { shapeKey } });
    },

    _onSeqStepTimeChanged(e) {
      const stepTime = e?.detail?.stepTime;
      if (typeof stepTime === 'number') app.state.stepTime = stepTime;
    },

    _onSeqStepsChanged(e) {
      const steps = e?.detail?.steps;
      if (typeof steps === 'number' && steps > 0) {
        app.state.sequenceSteps = steps;

        const currentLength = app.state.sequence.length;
        if (steps !== currentLength) {
          const oldSequence = [...app.state.sequence];
          const oldVelocities = [...(app.state.velocities || [])];

          app.state.sequence = Array(steps).fill(null);
          app.state.velocities = Array(steps).fill(1);

          for (let i = 0; i < Math.min(oldSequence.length, steps); i++) {
            app.state.sequence[i] = oldSequence[i];
            if (oldVelocities[i] !== undefined) {
              app.state.velocities[i] = oldVelocities[i];
            }
          }

          if (app.state.sequenceStepIndex >= steps) {
            app.state.sequenceStepIndex = 0;
          }
        }

        this.updateSequencerState();
      }
    },

    async _startSignatureSequencer() {
      const s = app.state;
      if (s.signatureSequencerRunning) this._stopSignatureSequencer();
      s.signatureSequencerRunning = true;

      const currentUiShape = (typeof s.current === 'string' && s.current) ? s.current : null;
      s._uiReturnShapeKey = currentUiShape || s._uiReturnShapeKey || humKey();

      this.stopAudioSignature();

      const algorithmMap = this._getUniqueAlgorithmMapping(s.seed);

      const runOnePass = async () => {
        if (!s.signatureSequencerRunning) return;

        for (let i = 0; i < s.sequence.length; i++) {
          if (!s.signatureSequencerRunning) return;

          s.sequenceStepIndex = i;
          this.updateSequencerState();

          const value = s.sequence[i];

          if (value === null || typeof value !== 'number' || value < 0) {
            await safeSleep(Math.max(50, s.stepTime));
            continue;
          }

          const shapeKey = indexToShapeKey(value);
          if (!shapeKey) { await safeSleep(Math.max(50, s.stepTime)); continue; }

          const algo = algorithmMap[shapeKey] || 1;
          const seq = this.generateAudioSignature(s.seed, algo);

          await new Promise(resolve => {
            if (!s.signatureSequencerRunning) { resolve(); return; }
            this.playAudioSignature(seq, algo, { loop: false, onComplete: () => resolve() });
          });

          if (!s.signatureSequencerRunning) return;
          await safeSleep(Math.max(30, s.stepTime));
        }
      };

      await runOnePass();
      if (!s.signatureSequencerRunning) return;

      if (s.isLoopEnabled && s.sequencePlaying) {
        while (s.signatureSequencerRunning && s.sequencePlaying) {
          await runOnePass();
        }
      }

      this._stopSignatureSequencer();
      app._sequencerComponent?.stopSequence?.();
    },

    _stopSignatureSequencer() {
      const s = app.state;
      s.signatureSequencerRunning = false;

      this.stopAudioSignature(); // routes to HUM and restores UI

      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;

      this.updateSequencerState();

      if (s._uiReturnShapeKey) app._updateControls?.({ shapeKey: s._uiReturnShapeKey });
      else app._updateControls?.();
    },

    updateSequencerState() {
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
    },

    // Public proxies to child component
    recordStep(number) { app._sequencerComponent?.recordStep?.(number); },
    playSequence() { app._sequencerComponent?.playSequence?.(); },
    stopSequence() {
      app._sequencerComponent?.stopSequence?.();
      if (app.state.signatureSequencerRunning) this._stopSignatureSequencer();
      if (app.state.audioSignaturePlaying) this.stopAudioSignature();
      app.state.sequencePlaying = false;
      app.state.sequenceStepIndex = 0;
      app.state._seqFirstCycleStarted = false;
      this.updateSequencerState();
      app._updateControls?.();
    },
  };
}
