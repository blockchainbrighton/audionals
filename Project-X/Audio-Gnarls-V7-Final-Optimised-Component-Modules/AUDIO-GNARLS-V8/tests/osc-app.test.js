// Jest test suite for the oscilloscope application.  These tests
// focus on verifying that audio playback can be started and stopped
// repeatedly without leaving residual state and that muting behaves
// correctly.  The real Tone.js library is replaced with a simple
// mock in order to run deterministically without relying on audio
// hardware or asynchronous loading.

/* eslint-env jest */

describe('OscApp2 reset cycle and audio controls', () => {
  let app;

  // Provide a minimal Tone.js mock before each test.  The mock
  // exposes the properties and methods referenced by the application
  // code.  It records calls where appropriate so that behaviour can
  // be asserted.
  const createToneMock = () => {
    const analyserFactory = () => ({
      fftSize: 2048,
      getFloatTimeDomainData: jest.fn()
    });
    return {
      Destination: { mute: false },
      context: {
        createAnalyser: analyserFactory
      },
      getContext: () => ({ resume: jest.fn().mockResolvedValue() }),
      start: jest.fn().mockResolvedValue(),
      Volume: function () {
        this.connect = jest.fn();
      },
      Oscillator: function () {
        this.start = jest.fn().mockReturnThis();
        this.connect = jest.fn();
        this.stop = jest.fn();
        this.dispose = jest.fn();
      },
      Filter: function () {
        this.Q = { value: 0 };
        this.connect = jest.fn();
        this.dispose = jest.fn();
      },
      LFO: function () {
        this.start = jest.fn().mockReturnThis();
        this.connect = jest.fn();
        this.dispose = jest.fn();
      },
      Freeverb: function () {
        this.set = jest.fn().mockReturnThis();
        this.connect = jest.fn();
        this.dispose = jest.fn();
      }
    };
  };

  beforeEach(async () => {
    // Clean the document between tests
    document.body.innerHTML = '';
    // Install Tone mock on the global window
    window.Tone = createToneMock();
    // Load dependencies and register custom elements.  The require
    // calls will define custom elements globally via
    // customElements.define().
    await import('../osc-controls.js');
    await import('../scope-canvas.js');
    await import('../osc-app.js');
    // Create a new app instance and add it to the DOM.  Appending
    // triggers connectedCallback which builds the UI.  Stubs for
    // bufferShapeChain and setActiveChain are injected to avoid
    // constructing real audio graphs.  Instead they populate the
    // state with trivial analysers.
    app = document.createElement('osc-app');
    document.body.appendChild(app);
    // Replace bufferShapeChain with a stub that provisions a fake
    // chain.  Each chain includes a dummy reverb with the methods
    // expected by the application and an analyser for drawing.
    app.bufferShapeChain = jest.fn(async (shape) => {
      app.state.chains[shape] = {
        reverb: {
          toDestination: jest.fn(),
          disconnect: jest.fn()
        },
        analyser: {
          fftSize: 2048,
          getFloatTimeDomainData: jest.fn()
        }
      };
    });
    // Replace setActiveChain to avoid routing audio; it simply
    // records the current shape and sets analyser and flags on the
    // canvas.
    app.setActiveChain = jest.fn((shape) => {
      const chain = app.state.chains[shape];
      app.state.current = shape;
      app._canvas.analyser = chain.analyser;
      app._canvas.isAudioStarted = true;
      app._canvas.isPlaying = true;
    });
    // Simulate Tone ready.  Instead of waiting for the tone-loader
    // element to fire its event we call the handler directly and
    // assign the mock Tone instance onto the state.  This loads
    // deterministic presets and initialises the UI controls.
    app.state.Tone = window.Tone;
    app._onToneReady();
  });

  test('start, stop and restart audio without residual state', async () => {
    // Start audio: unlock the context and buffer the first shape
    await app.unlockAudioAndBufferInitial();
    expect(app.state.isPlaying).toBe(true);
    expect(app._canvas.isPlaying).toBe(true);
    // Stop audio and reset
    app.stopAudioAndDraw();
    // After reset the app should not be playing, have no buffered
    // chains and the canvas should be idle
    expect(app.state.isPlaying).toBe(false);
    expect(app.state.contextUnlocked).toBe(false);
    expect(Object.keys(app.state.chains)).toHaveLength(0);
    expect(app._canvas.isPlaying).toBe(false);
    // Starting again should recreate chains and set playing flags
    await app.unlockAudioAndBufferInitial();
    expect(app.state.isPlaying).toBe(true);
    expect(app._canvas.isPlaying).toBe(true);
  });

  test('mute toggles audio activity but preserves playing state', async () => {
    await app.unlockAudioAndBufferInitial();
    const wasPlaying = app._canvas.isPlaying;
    // Mute should flag Tone.Destination.mute and pause canvas
    app._onMuteToggle();
    expect(window.Tone.Destination.mute).toBe(true);
    expect(app._canvas.isPlaying).toBe(false);
    // Unmute should restore original mute flag and canvas state
    app._onMuteToggle();
    expect(window.Tone.Destination.mute).toBe(false);
    expect(app._canvas.isPlaying).toBe(wasPlaying);
  });
});