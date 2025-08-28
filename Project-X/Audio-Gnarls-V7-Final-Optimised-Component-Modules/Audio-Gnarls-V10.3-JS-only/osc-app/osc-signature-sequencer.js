// osc-signature-sequencer.js
export function SignatureSequencer(app) {
  return {
    // ---------- Global toggles ----------
    _onToggleSequencer() {
      const s = app.state;
      s.isSequencerMode = !s.isSequencerMode;
      app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';

      if (s.isSequencerMode) {
        app._main.style.overflow = 'auto';
        if (app._canvasContainer) { app._canvasContainer.style.maxHeight = '60vh'; app._canvasContainer.style.flex = '0 0 auto'; }
        if (app._canvas) { app._canvas.style.maxHeight = '60vh'; }
        app.updateSequencerState();
      } else {
        app._main.style.overflow = 'hidden';
        if (app._canvasContainer) { app._canvasContainer.style.maxHeight = ''; app._canvasContainer.style.flex = ''; }
        if (app._canvas) { app._canvas.style.maxHeight = ''; }
        s.isRecording = false;
        s.currentRecordSlot = -1;
        if (s.sequencePlaying) app.stopSequence();
        if (s.signatureSequencerRunning) app._stopSignatureSequencer();
      }

      app._updateControls();
    },

    _onLoopToggle() {
      app.state.isLoopEnabled = !app.state.isLoopEnabled;
      app._updateControls();
      if (app.state.audioSignaturePlaying && !app.state.isSequenceSignatureMode) {
        app._loader.textContent = app.state.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.';
      }
    },

    _onSignatureModeToggle() {
      const s = app.state;
      s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
      app._updateControls();

      if (s.sequencePlaying) {
        app.stopSequence();
        app.stopAudioSignature();
        app._loader.textContent = s.isSequenceSignatureMode
          ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.'
          : 'Sequencer Signature Mode disabled. Press Play for normal step timing.';
      }
    },

    // ---------- Audio Signature UI trigger ----------
    _onAudioSignature() {
      const s = app.state;
      if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
      if (s.sequencePlaying) app.stopSequence();

      const algorithmMap = app._getUniqueAlgorithmMapping(s.seed);
      const algorithm = algorithmMap[s.current] || 1;
      const audioSignatureSequence = app.generateAudioSignature(s.seed, algorithm);
      app.playAudioSignature(audioSignatureSequence, algorithm, { loop: s.isLoopEnabled });

      app._loader.textContent = s.isLoopEnabled ? 'Playing Audio Signature (Loop).' : 'Playing Audio Signature...';
    },

    // ---------- Signature generation ----------
    _getUniqueAlgorithmMapping(seed) {
      const rng = app._rng(`${seed}_unique_algo_mapping`);
      const shapeKeys = [app.humKey, ...app.shapes];
      const algorithms = [1,2,3,4,5,6,7,8,9,10];

      for (let i = algorithms.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [algorithms[i], algorithms[j]] = [algorithms[j], algorithms[i]];
      }
      const map = {};
      shapeKeys.forEach((k, i) => { map[k] = algorithms[i]; });
      return map;
    },

    generateAudioSignature(seed, algorithm = 1) {
      const rng = app._rng(`${seed}_audio_signature_v${algorithm}`);
      switch (algorithm) {
        case 1: {
          const seq = []; for (let i = 0; i < 32; i++) seq.push(Math.floor(rng() * 10)); return seq;
        }
        case 2:
          return app._generateSignatureWithConstraints(seed, {
            steps: 32, paletteSize: 6, pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true
          });
        case 3: {
          const L = 8; const pattern = Array.from({ length: L }, () => Math.floor(rng() * 10));
          return Array.from({ length: 32 }, (_, i) => pattern[i % L]);
        }
        case 4: {
          const seq = [0]; let cur = 0;
          for (let i = 1; i < 32; i++) {
            const dir = rng() > 0.5 ? 1 : -1; const step = (Math.floor(rng() * 3) + 1);
            cur = Math.max(0, Math.min(9, cur + dir * step)); seq.push(cur);
          } return seq;
        }
        case 5: {
          const seq = []; let cluster = Math.floor(rng() * 10);
          for (let i = 0; i < 32;) { const len = Math.min((Math.floor(rng() * 6) + 2), 32 - i);
            for (let j = 0; j < len; j++, i++) seq.push(cluster); cluster = Math.floor(rng() * 10);
          } return seq;
        }
        case 6: {
          const seq = []; for (let i = 0; i < 32; i++) seq.push(rng() > 0.7 ? (Math.floor(rng() * 9) + 1) : 0); return seq;
        }
        case 7: {
          const seq = new Array(32).fill(0); let pos = 0; let a = 1, b = 1;
          while (pos < 32) { seq[pos] = Math.floor(rng() * 9) + 1; const next = a + b; a = b; b = next; pos += next; }
          return seq;
        }
        case 8: {
          const a = Math.floor(rng() * 10); const b = Math.floor(rng() * 10);
          return Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? a : b));
        }
        case 9: {
          const seq = []; let v = Math.floor(rng() * 9) + 1;
          for (let i = 0; i < 32; i++) { if (rng() < 0.2 || v === 0) v = Math.floor(rng() * 10);
            seq.push(v); if (rng() > 0.7) v = Math.max(0, v - 1);
          } return seq;
        }
        case 10: {
          const seq = []; let c = Math.floor(rng() * 10);
          for (let i = 0; i < 32; i++) { if (i % 8 === 0 || rng() > 0.6) c = Math.floor(rng() * 10); seq.push(c); }
          return seq;
        }
        default:
          return app._generateSignatureWithConstraints(seed);
      }
    },

    _generateSignatureWithConstraints(seed, {
      steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true
    } = {}) {
      const rng = app._rng(`${seed}_audio_signature_constrained`);
      const sequence = [];
      const paletteCount = Math.max(1, Math.min(9, paletteSize));

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
            next = 1 + Math.floor(rng() * paletteCount);
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

    // ---------- Signature playback ----------
    playAudioSignature(sequence, algorithm = 1, { loop = false, onComplete = null } = {}) {
      const s = app.state;
      if (s.audioSignaturePlaying) app.stopAudioSignature();

      s.audioSignaturePlaying = true;
      s.audioSignatureStepIndex = 0;
      s.audioSignatureOnComplete = onComplete;

      let stepTime;
      switch (algorithm) {
        case 3: case 7: stepTime = 100; break;
        case 5: stepTime = 150; break;
        case 10: stepTime = 200; break;
        default: stepTime = 125;
      }

      const playStep = () => {
        if (!s.audioSignaturePlaying) return;

        const stepIndex = s.audioSignatureStepIndex;
        const shapeIndex = sequence[stepIndex];

        if (shapeIndex !== null) {
          let shapeKey;
          if (shapeIndex === 0) shapeKey = app.humKey;
          else shapeKey = app.shapes[shapeIndex - 1];

          if (shapeKey) {
            app._updateControls({ shapeKey });
            app._onShapeChange({ detail: { shapeKey } });
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
            else app._loader.textContent = 'Audio Signature complete.';
          };

          if (loop) {
            s.audioSignatureStepIndex = 0;
            s.audioSignatureTimer = setTimeout(playStep, stepTime);
          } else {
            app._updateControls({ shapeKey: app.humKey });
            app._onShapeChange({ detail: { shapeKey: app.humKey } });
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
      s.audioSignatureOnComplete = null;
    },

    // ---------- Sequencer bridge ----------
    _onSeqRecordStart(e) {
      const slotIndex = e?.detail?.slotIndex ?? -1;
      app.state.isRecording = true;
      app.state.currentRecordSlot = slotIndex;
      app._updateControls();
    },

    _onSeqStepCleared(e) {
      const slotIndex = e?.detail?.slotIndex;
      if (typeof slotIndex !== 'number') return;

      app.state.sequence[slotIndex] = null;

      if (app.state.isRecording && app.state.currentRecordSlot === slotIndex) {
        app.state.currentRecordSlot = (slotIndex + 1) % 8;
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
      app._updateControls();

      if (app.state.isSequenceSignatureMode) {
        app._sequencerComponent?.stopSequence();
        app._startSignatureSequencer();
      }
    },

    _onSeqPlayStopped() {
      const s = app.state;
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;

      if (s.signatureSequencerRunning) app._stopSignatureSequencer();

      app._updateControls();
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
              app.stopSequence();
              return;
            }
          } else {
            app.state._seqFirstCycleStarted = true;
          }
        }
      }

      app.state.sequenceStepIndex = stepIndex;

      let shapeKey;
      if (value === 0) shapeKey = app.humKey;
      else if (value >= 1 && value <= app.shapes.length) shapeKey = app.shapes[value - 1];
      else return;

      app._updateControls({ shapeKey });
      app._onShapeChange({ detail: { shapeKey } });
    },

    _onSeqStepTimeChanged(e) {
      const stepTime = e?.detail?.stepTime;
      if (typeof stepTime === 'number') app.state.stepTime = stepTime;
    },

    async _startSignatureSequencer() {
      const s = app.state;
      if (s.signatureSequencerRunning) app._stopSignatureSequencer();
      s.signatureSequencerRunning = true;

      app.stopAudioSignature();

      const algorithmMap = app._getUniqueAlgorithmMapping(s.seed);

      const runOnePass = async () => {
        if (!s.signatureSequencerRunning) return;

        for (let i = 0; i < s.sequence.length; i++) {
          if (!s.signatureSequencerRunning) return;

          s.sequenceStepIndex = i;
          app.updateSequencerState();

          const value = s.sequence[i];

          if (value === null || typeof value !== 'number' || value < 0) {
            await app._sleep(Math.max(50, s.stepTime));
            continue;
          }

          let shapeKey = null;
          if (value === 0) shapeKey = app.humKey;
          else if (value >= 1 && value <= app.shapes.length) shapeKey = app.shapes[value - 1];

          if (!shapeKey) { await app._sleep(Math.max(50, s.stepTime)); continue; }

          const algo = algorithmMap[shapeKey] || 1;
          const seq = app.generateAudioSignature(s.seed, algo);

          await new Promise(resolve => {
            if (!s.signatureSequencerRunning) { resolve(); return; }
            app.playAudioSignature(seq, algo, { loop: false, onComplete: () => resolve() });
          });

          if (!s.signatureSequencerRunning) return;
          await app._sleep(Math.max(30, s.stepTime));
        }
      };

      await runOnePass();
      if (!s.signatureSequencerRunning) return;

      if (s.isLoopEnabled && s.sequencePlaying) {
        while (s.signatureSequencerRunning && s.sequencePlaying) {
          await runOnePass();
        }
      }

      app._stopSignatureSequencer();
      app._sequencerComponent?.stopSequence?.();
    },

    _stopSignatureSequencer() {
      const s = app.state;
      s.signatureSequencerRunning = false;
      app.stopAudioSignature();
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      app.updateSequencerState();
      app._updateControls();
    },

    updateSequencerState() {
      if (!app._sequencerComponent) return;
      app._sequencerComponent.updateState?.({
        isRecording: app.state.isRecording,
        currentRecordSlot: app.state.currentRecordSlot,
        sequence: [...app.state.sequence],
        sequencePlaying: app.state.sequencePlaying,
        sequenceStepIndex: app.state.sequenceStepIndex,
        stepTime: app.state.stepTime,
        isLoopEnabled: app.state.isLoopEnabled,
        isSequenceSignatureMode: app.state.isSequenceSignatureMode
      });
    },

    // Public proxies to child component
    recordStep(number) { app._sequencerComponent?.recordStep(number); },
    playSequence() { app._sequencerComponent?.playSequence(); },
    stopSequence() {
      app._sequencerComponent?.stopSequence();
      if (app.state.signatureSequencerRunning) app._stopSignatureSequencer();
      if (app.state.audioSignaturePlaying) app.stopAudioSignature();
      app.state.sequencePlaying = false;
      app.state.sequenceStepIndex = 0;
      app.state._seqFirstCycleStarted = false;
      app.updateSequencerState();
      app._updateControls();
    },
  };
}
