// TypeScript definitions for SeedSynth component

export interface SeedSynthOptions {
  seed?: string;
  showSequencer?: boolean;
  toneModuleUrl?: string;
  audioContext?: AudioContext;
}

export type OptionKey = 'hum' | 'circle' | 'square' | 'butterfly' |
                       'lissajous' | 'spiro' | 'harmonograph' |
                       'rose' | 'hypocycloid' | 'epicycloid';

export interface SeedSynthOption {
  key: OptionKey;
  label: string;
}

export interface SeedSynthState {
  seed: string;
  currentKey: OptionKey;
  sequence: (number | null)[];
  stepTime: number;
  muted: boolean;
  isSequencerMode: boolean;
  sequencePlaying: boolean;
}

export interface SeedSynthElement extends HTMLElement {
  // Lifecycle / setup
  setOptions(opts: Partial<SeedSynthOptions>): void;

  // Seed & options (presets)
  seed: string;
  readonly options: ReadonlyArray<SeedSynthOption>;
  readonly currentKey: OptionKey;
  setCurrent(key: OptionKey): void;

  // Transport
  start(): Promise<void>;
  stop(): void;
  mute(value?: boolean): void;
  readonly muted: boolean;

  // Sequencer (shape indices 1–9)
  recordStep(indexOrNumber: number): void;
  playSequence(): void;
  stopSequence(): void;
  setStepTime(ms: number): void;

  // Analysis
  getAnalyser(): AnalyserNode | null;

  // State
  getState(): SeedSynthState | null;
  setState(state: Partial<SeedSynthState>): void;

  // Advanced injection
  audioContext?: AudioContext;
  tone?: any;

  // Cleanup
  dispose(): void;
}

// Event types
export interface SeedSynthReadyEvent extends CustomEvent {
  type: 'ready';
}

export interface SeedSynthOptionChangeEvent extends CustomEvent {
  type: 'optionchange';
  detail: {
    key: OptionKey;
    label: string;
  };
}

export interface SeedSynthStateChangeEvent extends CustomEvent {
  type: 'statechange';
  detail: {
    state: SeedSynthState;
  };
}

export interface SeedSynthScopeFrameEvent extends CustomEvent {
  type: 'scopeframe';
  detail: {
    buffer: Float32Array;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'seed-synth': SeedSynthElement;
  }
}

