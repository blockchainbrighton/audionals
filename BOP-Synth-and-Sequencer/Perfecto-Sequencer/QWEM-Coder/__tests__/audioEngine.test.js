// __tests__/audioEngine.test.js

/**
 * @file Unit tests for audioEngine.js
 */

import { initAudio, triggerNote, dispose, getAudioStatus } from '../audioEngine.js';

// Mock ToneJS
const mockSynth = {
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
  dispose: jest.fn()
};

const mockPolySynth = jest.fn(() => mockSynth);
const mockToneStart = jest.fn();

describe('audioEngine', () => {
  beforeEach(() => {
    // Reset module state
    dispose();
    
    // Setup ToneJS mock
    window.Tone = {
      PolySynth: mockPolySynth,
      Synth: jest.fn(),
      start: mockToneStart
    };
  });

  afterEach(() => {
    delete window.Tone;
    jest.clearAllMocks();
  });

  test('should initialize audio with correct number of synths', async () => {
    await initAudio(4);

    expect(mockPolySynth).toHaveBeenCalledTimes(4);
    expect(mockToneStart).toHaveBeenCalledTimes(1);
    expect(getAudioStatus().isInitialized).toBe(true);
  });

  test('should not reinitialize if already initialized', async () => {
    await initAudio(2);
    await initAudio(2); // Second call should not do anything

    expect(mockPolySynth).toHaveBeenCalledTimes(2);
    expect(mockToneStart).toHaveBeenCalledTimes(1);
  });

  test('should throw error if ToneJS is not loaded', async () => {
    delete window.Tone;
    
    await expect(initAudio(2)).rejects.toThrow('ToneJS not loaded');
  });

  test('should trigger note on correct synth', async () => {
    await initAudio(3);
    triggerNote(1, 'C4', '8n');

    expect(mockSynth.triggerAttackRelease).toHaveBeenCalledWith('C4', '8n');
  });

  test('should warn when triggering note before initialization', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    triggerNote(0, 'C4', '8n');
    
    expect(consoleSpy).toHaveBeenCalledWith('Audio not initialized. Call initAudio first.');
    consoleSpy.mockRestore();
  });

  test('should warn when triggering note on non-existent track', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    await initAudio(1);
    triggerNote(5, 'C4', '8n'); // Track 5 doesn't exist
    
    expect(consoleSpy).toHaveBeenCalledWith('No synth found for track 5');
    consoleSpy.mockRestore();
  });

  test('should dispose all synths and reset state', async () => {
    await initAudio(3);
    dispose();

    expect(mockSynth.dispose).toHaveBeenCalledTimes(3);
    expect(getAudioStatus().isInitialized).toBe(false);
  });
});