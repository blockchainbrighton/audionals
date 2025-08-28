import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type {
  SeedSynthElement,
  SeedSynthOptions,
  OptionKey,
  SeedSynthOption,
  SeedSynthState,
  SeedSynthReadyEvent,
  SeedSynthOptionChangeEvent,
  SeedSynthStateChangeEvent,
  SeedSynthScopeFrameEvent
} from '../src/types';

// Import the custom element (this will register it)
import '../dist/seed-synth.js';

export interface SeedSynthProps extends Partial<SeedSynthOptions> {
  // Event handlers
  onReady?: (event: SeedSynthReadyEvent) => void;
  onOptionChange?: (event: SeedSynthOptionChangeEvent) => void;
  onStateChange?: (event: SeedSynthStateChangeEvent) => void;
  onScopeFrame?: (event: SeedSynthScopeFrameEvent) => void;
  
  // Style props
  className?: string;
  style?: React.CSSProperties;
  
  // Additional props
  children?: React.ReactNode;
}

export interface SeedSynthRef {
  // Element reference
  element: SeedSynthElement | null;
  
  // API methods
  setOptions(opts: Partial<SeedSynthOptions>): void;
  setCurrent(key: OptionKey): void;
  start(): Promise<void>;
  stop(): void;
  mute(value?: boolean): void;
  recordStep(indexOrNumber: number): void;
  playSequence(): void;
  stopSequence(): void;
  setStepTime(ms: number): void;
  getAnalyser(): AnalyserNode | null;
  getState(): SeedSynthState | null;
  setState(state: Partial<SeedSynthState>): void;
  dispose(): void;
  
  // Properties
  readonly seed: string;
  readonly options: ReadonlyArray<SeedSynthOption>;
  readonly currentKey: OptionKey;
  readonly muted: boolean;
  audioContext?: AudioContext;
  tone?: any;
}

const SeedSynth = forwardRef<SeedSynthRef, SeedSynthProps>(({
  seed,
  showSequencer,
  toneModuleUrl,
  audioContext,
  onReady,
  onOptionChange,
  onStateChange,
  onScopeFrame,
  className,
  style,
  children,
  ...props
}, ref) => {
  const elementRef = useRef<SeedSynthElement | null>(null);

  // Set up the imperative handle
  useImperativeHandle(ref, () => ({
    get element() {
      return elementRef.current;
    },
    
    setOptions(opts: Partial<SeedSynthOptions>) {
      elementRef.current?.setOptions(opts);
    },
    
    setCurrent(key: OptionKey) {
      elementRef.current?.setCurrent(key);
    },
    
    async start() {
      if (elementRef.current) {
        await elementRef.current.start();
      }
    },
    
    stop() {
      elementRef.current?.stop();
    },
    
    mute(value?: boolean) {
      elementRef.current?.mute(value);
    },
    
    recordStep(indexOrNumber: number) {
      elementRef.current?.recordStep(indexOrNumber);
    },
    
    playSequence() {
      elementRef.current?.playSequence();
    },
    
    stopSequence() {
      elementRef.current?.stopSequence();
    },
    
    setStepTime(ms: number) {
      elementRef.current?.setStepTime(ms);
    },
    
    getAnalyser() {
      return elementRef.current?.getAnalyser() || null;
    },
    
    getState() {
      return elementRef.current?.getState() || null;
    },
    
    setState(state: Partial<SeedSynthState>) {
      elementRef.current?.setState(state);
    },
    
    dispose() {
      elementRef.current?.dispose();
    },
    
    get seed() {
      return elementRef.current?.seed || '';
    },
    
    get options() {
      return elementRef.current?.options || [];
    },
    
    get currentKey() {
      return elementRef.current?.currentKey || 'hum';
    },
    
    get muted() {
      return elementRef.current?.muted || false;
    },
    
    get audioContext() {
      return elementRef.current?.audioContext;
    },
    
    set audioContext(ctx: AudioContext | undefined) {
      if (elementRef.current) {
        elementRef.current.audioContext = ctx;
      }
    },
    
    get tone() {
      return elementRef.current?.tone;
    },
    
    set tone(toneInstance: any) {
      if (elementRef.current) {
        elementRef.current.tone = toneInstance;
      }
    }
  }), []);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleReady = (event: Event) => {
      onReady?.(event as SeedSynthReadyEvent);
    };

    const handleOptionChange = (event: Event) => {
      onOptionChange?.(event as SeedSynthOptionChangeEvent);
    };

    const handleStateChange = (event: Event) => {
      onStateChange?.(event as SeedSynthStateChangeEvent);
    };

    const handleScopeFrame = (event: Event) => {
      onScopeFrame?.(event as SeedSynthScopeFrameEvent);
    };

    element.addEventListener('ready', handleReady);
    element.addEventListener('optionchange', handleOptionChange);
    element.addEventListener('statechange', handleStateChange);
    element.addEventListener('scopeframe', handleScopeFrame);

    return () => {
      element.removeEventListener('ready', handleReady);
      element.removeEventListener('optionchange', handleOptionChange);
      element.removeEventListener('statechange', handleStateChange);
      element.removeEventListener('scopeframe', handleScopeFrame);
    };
  }, [onReady, onOptionChange, onStateChange, onScopeFrame]);

  // Update element properties when props change
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const options: Partial<SeedSynthOptions> = {};
    
    if (seed !== undefined) options.seed = seed;
    if (showSequencer !== undefined) options.showSequencer = showSequencer;
    if (toneModuleUrl !== undefined) options.toneModuleUrl = toneModuleUrl;
    if (audioContext !== undefined) options.audioContext = audioContext;

    if (Object.keys(options).length > 0) {
      element.setOptions(options);
    }
  }, [seed, showSequencer, toneModuleUrl, audioContext]);

  return React.createElement('seed-synth', {
    ref: elementRef,
    seed,
    'show-sequencer': showSequencer ? '' : undefined,
    className,
    style,
    ...props
  }, children);
});

SeedSynth.displayName = 'SeedSynth';

export default SeedSynth;

// Re-export types for convenience
export type {
  SeedSynthElement,
  SeedSynthOptions,
  OptionKey,
  SeedSynthOption,
  SeedSynthState,
  SeedSynthReadyEvent,
  SeedSynthOptionChangeEvent,
  SeedSynthStateChangeEvent,
  SeedSynthScopeFrameEvent
};

