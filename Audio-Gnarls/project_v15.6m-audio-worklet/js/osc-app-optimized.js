/**
 * OscApp - Optimized Main Application Component
 * 
 * Enhanced with:
 * - BaseComponent inheritance
 * - Separated OscControls component
 * - Improved state management
 * - Better component organization
 * - Reduced coupling between components
 */

import { BaseComponent } from './shared/base-component.js';
import { StateManager } from './shared/state-manager.js';
import { createComponentStyles } from './shared/styles.js';
import { OscControls } from './osc-controls.js';
import { Engine } from './engine.js';
import { Signatures } from './engine.js';
import {
  clamp01, pct, on, off, setText, setPressed, toggleClass, byId,
  isBool, isNum, setDisabledAll, addEvents, removeEvents, noop
} from './shared/utils.js';

export class OscApp extends BaseComponent {
  static get observedAttributes() { 
    return ['seed']; 
  }

  constructor() {
    super();
    
    // Initialize state manager
    this.stateManager = new StateManager();
    
    // Component configuration
    this._heldKeys = new Set();
    this.humKey = 'hum';
    this.humLabel = 'Power Hum';
    this.shapes = [
      'circle', 'square', 'butterfly', 'lissajous', 'spiro', 'harmonograph',
      'rose', 'hypocycloid', 'epicycloid', 'spiral', 'star', 'flower',
      'wave', 'mandala', 'infinity', 'dna', 'tornado'
    ];
    this.shapeLabels = Object.fromEntries(
      this.shapes.map(k => [k, k[0].toUpperCase() + k.slice(1)])
    );

    // Integrate Engine and Signatures functionality
    Object.assign(this, Engine(this), Signatures(this));

    // Initialize state
    const attrSeed = (this.getAttribute('seed') || '').trim();
    const htmlSeed = (document.documentElement?.dataset?.seed || '').trim();
    const initialSeed = attrSeed || htmlSeed || 'default';
    
    this.state = this.defaultState(initialSeed);
    this.stateManager.set(this.state);

    // Subscribe to state changes
    this.stateManager.subscribe(this._onStateChange);
  }

  // === Lifecycle Methods ===

  onConnected() {
    this._render();
    this._setupComponents();
    this._attachEvents();
    this._setupCanvasClickGrid();
    this._renderPowerOverlay();
    this._fitLayout();

    // Window events
    this.addEventListeners(window, [
      ['resize', this._onWindowResize],
      ['pointerup', this._onCanvasPointerUp]
    ]);
  }

  onCleanup() {
    // Cleanup any remaining timers or resources
    if (this._powerOverlay) {
      this._removePowerOverlay();
    }
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name !== 'seed') return;
    const next = (newVal || '').trim();
    if (!next || next === this.state.seed) return;
    this.resetToSeed(next);
  }

  // === State Management ===

  defaultState(seed = 'default') {
    return {
      isPlaying: false,
      contextUnlocked: false,
      initialBufferingStarted: false,
      initialShapeBuffered: false,
      Tone: null,
      chains: {},
      current: null,
      isLoopEnabled: false,
      volume: 0.2,
      // Sequencer + recording
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(8).fill(null),
      velocities: Array(8).fill(1),
      sequencePlaying: false,
      sequenceIntervalId: null,
      sequenceStepIndex: 0,
      stepTime: 200,
      _seqFirstCycleStarted: false,
      sequenceSteps: 8,
      // Signature modes
      isSequenceSignatureMode: false,
      signatureSequencerRunning: false,
      audioSignaturePlaying: false,
      audioSignatureTimer: null,
      audioSignatureStepIndex: 0,
      audioSignatureOnComplete: null,
      // Manual latch flag
      isLatchOn: false,
      // Misc
      seed,
      presets: {},
      uiHomeShapeKey: null,
      _transientOverride: false,
    };
  }

  _onStateChange = (newState, oldState) => {
    // Update components when state changes
    this._updateControls();
    this._updateSequencer();
    this._updateCanvas();
  };

  // === Rendering ===

  _render() {
    const styles = createComponentStyles('osc-app', `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: var(--font-family);
        overflow: hidden;
      }

      #appWrapper {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      #main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #canvasContainer {
        flex: 1;
        position: relative;
        min-height: 200px;
      }

      #loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-muted);
        font-size: var(--font-size-lg);
        z-index: var(--z-overlay);
      }

      #powerOverlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        pointer-events: auto;
        background: var(--bg-overlay);
        user-select: none;
        cursor: pointer;
        font-family: var(--font-family);
      }

      #powerOverlay > div {
        padding: 14px 18px;
        border: 1px dashed rgba(255,255,255,0.65);
        border-radius: var(--radius-lg);
        font-size: 18px;
        letter-spacing: 0.06em;
        color: var(--text-primary);
        background: rgba(0,0,0,0.25);
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }

      scope-canvas {
        width: 100%;
        height: 100%;
      }

      seq-app {
        transition: all var(--transition-normal);
      }

      seq-app[hidden] {
        display: none;
      }

      osc-hotkeys {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      /* Mobile optimizations */
      @media (max-width: 480px) {
        #main {
          min-height: 100dvh;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }
    `);

    this.setStyles(styles);

    this.shadowRoot.innerHTML = `
      <div id="appWrapper">
        <div id="main">
          <div id="canvasContainer">
            <scope-canvas></scope-canvas>
            <div id="loader">Initializing...</div>
          </div>
          <osc-controls></osc-controls>
          <seq-app style="display: none;"></seq-app>
          <osc-hotkeys style="position: absolute; opacity: 0; pointer-events: none;"></osc-hotkeys>
        </div>
        <tone-loader></tone-loader>
      </div>
    `;
  }

  _setupComponents() {
    // Cache component references
    this._main = this.$('#main');
    this._canvasContainer = this.$('#canvasContainer');
    this._canvas = this.$('scope-canvas');
    this._controls = this.$('osc-controls');
    this._sequencerComponent = this.$('seq-app');
    this._hotkeys = this.$('osc-hotkeys');
    this._loader = this.$('#loader');
    this._toneLoader = this.$('tone-loader');

    // Configure components
    if (this._controls) {
      const shapeOptions = [
        { value: this.humKey, label: this.humLabel },
        ...this.shapes.map((k) => ({ 
          value: k, 
          label: this.shapeLabels[k] || k 
        }))
      ];
      this._controls.setShapes(shapeOptions);
      this._controls.setSeed(this.state.seed);
    }

    if (this._hotkeys) {
      this._hotkeys.setConfig({ 
        humKey: this.humKey, 
        shapes: this.shapes 
      });
    }

    // Set initial canvas state
    if (this._canvas) {
      Object.assign(this._canvas, {
        analyser: null,
        preset: null,
        shapeKey: 'circle',
        mode: 'seed',
        isAudioStarted: false,
        isPlaying: false
      });
    }
  }

  _attachEvents() {
    // Tone loader events
    if (this._toneLoader) {
      this.addEventListeners(this._toneLoader, [
        ['tone-ready', this._onToneReady]
      ]);
    }

    // Controls events
    if (this._controls) {
      this.addEventListeners(this._controls, [
        ['start-request', this._onStartRequest],
        ['mute-toggle', this._onMuteToggle],
        ['shape-change', this._onShapeChange],
        ['toggle-sequencer', this._onToggleSequencer],
        ['audio-signature', this._onAudioSignature],
        ['latch-toggle', this._onLatchToggle],
        ['loop-toggle', this._onLoopToggle],
        ['signature-mode-toggle', this._onSignatureModeToggle],
        ['volume-change', this._onVolumeChange],
        ['seed-set', this._handleSeedSubmit],
        ['controls-resize', this._fitLayout]
      ]);
    }

    // Sequencer events
    if (this._sequencerComponent) {
      this.addEventListeners(this._sequencerComponent, [
        ['seq-record-start', this._onSeqRecordStart],
        ['seq-step-cleared', this._onSeqStepCleared],
        ['seq-step-recorded', this._onSeqStepRecorded],
        ['seq-play-started', this._onSeqPlayStarted],
        ['seq-play-stopped', this._onSeqPlayStopped],
        ['seq-step-advance', this._onSeqStepAdvance],
        ['seq-step-time-changed', this._onSeqStepTimeChanged],
        ['seq-steps-changed', this._onSeqStepsChanged]
      ]);
    }

    // Hotkeys events
    if (this._hotkeys) {
      this.addEventListeners(this._hotkeys, [
        ['hk-press', this._onHotkeyPress],
        ['hk-release', this._onHotkeyRelease],
        ['hk-toggle-loop', this._onHotkeyLoopToggle],
        ['hk-toggle-signature', this._onHotkeySignatureToggle],
        ['hk-shape-step', this._onShapeStep]
      ]);
    }
  }

  // === Event Handlers ===

  _onToneReady = (event) => {
    // Delegate to Engine implementation
    if (this.onToneReady) {
      this.onToneReady(event);
    }
  };

  _onStartRequest = () => {
    if (this.unlockAudioAndBufferInitial) {
      this.unlockAudioAndBufferInitial();
    }
  };

  _onMuteToggle = () => {
    if (this.toggleMute) {
      this.toggleMute();
    }
  };

  _onShapeChange = ({ detail }) => {
    const { shapeKey } = detail || {};
    if (shapeKey && this.setActiveChain) {
      this.setActiveChain(shapeKey);
      this._updateControls({ shapeKey });
    }
  };

  _onToggleSequencer = () => {
    const isVisible = !this.state.isSequencerMode;
    this.stateManager.set({ 
      isSequencerMode: isVisible,
      sequencerVisible: isVisible 
    });
    
    if (this._sequencerComponent) {
      this._sequencerComponent.style.display = isVisible ? 'block' : 'none';
    }
    
    this._fitLayout();
  };

  _onAudioSignature = () => {
    if (this.triggerAudioSignature) {
      this.triggerAudioSignature();
    }
  };

  _onLatchToggle = () => {
    this.stateManager.set({ 
      isLatchOn: !this.state.isLatchOn 
    });
  };

  _onLoopToggle = () => {
    this.stateManager.set({ 
      isLoopEnabled: !this.state.isLoopEnabled 
    });
  };

  _onSignatureModeToggle = () => {
    this.stateManager.set({ 
      isSequenceSignatureMode: !this.state.isSequenceSignatureMode 
    });
  };

  _onVolumeChange = ({ detail }) => {
    const { value } = detail || {};
    if (isNum(value)) {
      this.stateManager.set({ volume: value / 100 });
      if (this.setMasterVolume) {
        this.setMasterVolume(value / 100);
      }
    }
  };

  _handleSeedSubmit = ({ detail }) => {
    const { value } = detail || {};
    if (value && this.resetToSeed) {
      this.resetToSeed(value);
    }
  };

  // Sequencer event handlers
  _onSeqRecordStart = ({ detail }) => {
    const { slotIndex } = detail || {};
    this.stateManager.set({
      isRecording: true,
      currentRecordSlot: slotIndex
    });
  };

  _onSeqStepCleared = ({ detail }) => {
    // Handle step clearing logic
  };

  _onSeqStepRecorded = ({ detail }) => {
    const { slotIndex, value, nextSlot, isRecording } = detail || {};
    this.stateManager.set({
      currentRecordSlot: nextSlot,
      isRecording
    });
  };

  _onSeqPlayStarted = ({ detail }) => {
    this.stateManager.set({ sequencePlaying: true });
  };

  _onSeqPlayStopped = ({ detail }) => {
    this.stateManager.set({ sequencePlaying: false });
  };

  _onSeqStepAdvance = ({ detail }) => {
    const { stepIndex, value, velocity } = detail || {};
    if (this.handleSequenceStep) {
      this.handleSequenceStep(stepIndex, value, velocity);
    }
  };

  _onSeqStepTimeChanged = ({ detail }) => {
    const { stepTime } = detail || {};
    this.stateManager.set({ stepTime });
  };

  _onSeqStepsChanged = ({ detail }) => {
    const { steps } = detail || {};
    this.stateManager.set({ sequenceSteps: steps });
  };

  // Hotkey event handlers
  _onHotkeyPress = ({ detail }) => {
    if (this.handleHotkeyPress) {
      this.handleHotkeyPress(detail);
    }
  };

  _onHotkeyRelease = ({ detail }) => {
    if (this.handleHotkeyRelease) {
      this.handleHotkeyRelease(detail);
    }
  };

  _onHotkeyLoopToggle = () => {
    this._onLoopToggle();
  };

  _onHotkeySignatureToggle = () => {
    if (this.state.isSequencerMode) {
      this._onSignatureModeToggle();
    }
  };

  _onShapeStep = ({ detail }) => {
    if (this.handleShapeStep) {
      this.handleShapeStep(detail);
    }
  };

  // Layout and UI updates
  _onWindowResize = () => {
    this._fitLayout();
  };

  _fitLayout = () => {
    // Implement layout fitting logic
    if (this._main) {
      this._main.style.overflow = 'hidden';
    }
  };

  // === Component Update Methods ===

  _updateControls(overrides = {}) {
    if (!this._controls) return;
    
    const controlsState = {
      isAudioStarted: this.state.contextUnlocked,
      isPlaying: this.state.isPlaying,
      isMuted: this.state.isMuted,
      isAudioSignaturePlaying: this.state.audioSignaturePlaying,
      isLoopEnabled: this.state.isLoopEnabled,
      isSequenceSignatureMode: this.state.isSequenceSignatureMode,
      isLatchOn: this.state.isLatchOn,
      sequencerVisible: this.state.isSequencerMode,
      volume: this.state.volume,
      shapeKey: this.state.current,
      ...overrides
    };
    
    this._controls.updateState(controlsState);
  }

  _updateSequencer() {
    if (!this._sequencerComponent) return;
    
    const sequencerState = {
      isRecording: this.state.isRecording,
      currentRecordSlot: this.state.currentRecordSlot,
      sequence: this.state.sequence,
      velocities: this.state.velocities,
      sequencePlaying: this.state.sequencePlaying,
      sequenceStepIndex: this.state.sequenceStepIndex,
      stepTime: this.state.stepTime,
      steps: this.state.sequenceSteps
    };
    
    this._sequencerComponent.updateState(sequencerState);
  }

  _updateCanvas() {
    if (!this._canvas) return;
    
    // Update canvas state based on app state
    Object.assign(this._canvas, {
      isAudioStarted: this.state.contextUnlocked,
      isPlaying: this.state.isPlaying
    });
  }

  // === Canvas Interaction ===

  _setupCanvasClickGrid() {
    const el = this._canvas;
    if (!el || this._canvasClickGridSetup) return;
    this._canvasClickGridSetup = true;

    const gridKeyFromEvent = (ev) => {
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, (ev.clientX ?? 0) - r.left));
      const y = Math.max(0, Math.min(r.height, (ev.clientY ?? 0) - r.top));
      const cols = 5, rows = 2;
      const col = Math.min(cols - 1, Math.max(0, Math.floor(x / (r.width / cols))));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(y / (r.height / rows))));
      const cell = row * cols + col;
      return cell === 9 ? '0' : String(cell + 1);
    };

    const fakeDown = (k) => this._hotkeys?.simulatePressKey?.(k);
    const fakeUp = (k) => this._hotkeys?.simulateReleaseKey?.(k);

    this._onCanvasPointerDown = (ev) => {
      if (!this.state?.contextUnlocked) {
        try { 
          this.unlockAudioAndBufferInitial?.(); 
        } catch {} 
        ev?.preventDefault?.();
        return;
      }
      
      try {
        this._isCanvasPointerDown = true;
        try { 
          ev.target?.setPointerCapture?.(ev.pointerId); 
        } catch {}
        
        const key = gridKeyFromEvent(ev);
        if (key !== this._lastPointerDigitKey) {
          this._lastPointerDigitKey = key;
          fakeDown(key);
        }
      } catch (e) {
        console.error('canvas grid down error', e);
      }
    };

    this._onCanvasPointerMove = (ev) => {
      if (!this._isCanvasPointerDown || !this.state?.contextUnlocked) return;
      
      try {
        const key = gridKeyFromEvent(ev);
        if (key !== this._lastPointerDigitKey) {
          this._lastPointerDigitKey && fakeUp(this._lastPointerDigitKey);
          this._lastPointerDigitKey = key;
          fakeDown(key);
        }
      } catch (e) {
        console.error('canvas grid move error', e);
      }
    };

    this._onCanvasPointerUp = (ev) => {
      try {
        this._isCanvasPointerDown = false;
        ev?.target?.releasePointerCapture?.(ev.pointerId);
      } catch {}
      
      if (!this._lastPointerDigitKey) return;
      const key = this._lastPointerDigitKey;
      this._lastPointerDigitKey = null;
      fakeUp(key);
    };

    this._onCanvasPointerCancel = () => {
      this._isCanvasPointerDown = false;
      if (this._lastPointerDigitKey) {
        const key = this._lastPointerDigitKey;
        this._lastPointerDigitKey = null;
        fakeUp(key);
      }
    };

    this.addEventListeners(el, [
      ['pointerdown', this._onCanvasPointerDown],
      ['pointermove', this._onCanvasPointerMove],
      ['pointercancel', this._onCanvasPointerCancel],
      ['pointerleave', this._onCanvasPointerUp]
    ]);
  }

  // === Power Overlay ===

  _renderPowerOverlay() {
    if (this._powerOverlay) return;

    try {
      const overlay = this.createElement('div', { id: 'powerOverlay' });
      const inner = this.createElement('div', {}, { 
        textContent: 'Click to power on' 
      });
      overlay.appendChild(inner);

      const parent = this._canvasContainer || this._main;
      if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      (this._canvasContainer || this._main)?.appendChild(overlay);
      this._powerOverlay = overlay;

      const onClick = async (ev) => {
        ev?.preventDefault?.();
        try {
          await this.unlockAudioAndBufferInitial?.();
        } catch (e) {
          console.error('Power-on unlock failed:', e);
        } finally {
          setTimeout(() => {
            if (this.state?.contextUnlocked) {
              this._removePowerOverlay();
            } else {
              this._renderPowerOverlay();
            }
          }, 0);
        }
      };
      
      this.addEventListeners(overlay, [['click', onClick]]);
    } catch (e) {
      console.error('overlay error', e);
    }
  }

  _removePowerOverlay() {
    if (this._powerOverlay?.parentNode) {
      this._powerOverlay.parentNode.removeChild(this._powerOverlay);
      this._powerOverlay = null;
    }
  }

  // === Public API ===

  // Maintain compatibility with existing Engine/Signatures API
  setActiveChain(...args) {
    return this.setActiveChain?.(...args);
  }

  resetToSeed(seed) {
    if (this.resetToSeed) {
      return this.resetToSeed(seed);
    }
  }

  // Additional methods will be provided by Engine and Signatures mixins
}

customElements.define('osc-app', OscApp);

