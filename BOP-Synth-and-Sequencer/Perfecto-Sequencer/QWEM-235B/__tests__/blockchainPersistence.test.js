// __tests__/blockchainPersistence.test.js
import { savePattern, loadPattern } from '../blockchainPersistence.js';
import { emit, on } from '../eventBus.js';
import { getState } from '../stateManager.js';

// Mock stateManager
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: { 0: { 0: true, 4: true, 8: true, 12: true } },
    },
    transport: {
      bpm: 120,
    },
  })),
}));

describe('blockchainPersistence', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should save pattern and emit success event', async () => {
    const mockResponse = { txid: 'abc123def456', status: 'inscribed' };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const successCallback = jest.fn();
    on('BLOCKCHAIN/SAVE_SUCCESS', successCallback);

    await savePattern({
      inscriptionEndpoint: 'https://mock-inscribe.com',
      fetchFn: async (url, options) => {
        expect(url).toBe('https://mock-inscribe.com');
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');
        
        const body = JSON.parse(options.body);
        expect(body.type).toBe('ordinal-sequencer-pattern');
        expect(body.version).toBe('1.0');
        expect(body.grid.tracks).toBe(8);
        expect(body.transport.bpm).toBe(120);

        return mockResponse;
      }
    });

    expect(successCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BLOCKCHAIN/SAVE_SUCCESS',
        payload: { txId: 'abc123def456' }
      })
    );
  });

  test('should emit error event if save fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failed'));

    const errorCallback = jest.fn();
    on('BLOCKCHAIN/SAVE_ERROR', errorCallback);

    await expect(savePattern()).rejects.toThrow('Network failed');

    expect(errorCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BLOCKCHAIN/SAVE_ERROR',
        payload: expect.objectContaining({ message: 'Network failed' })
      })
    );
  });

  test('should load pattern by txId and emit loaded event', async () => {
    const mockPattern = {
      type: 'ordinal-sequencer-pattern',
      version: '1.0',
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { 1: { 2: true, 6: true } }
      },
      transport: { bpm: 90 }
    };

    mockFetch.mockResolvedValueOnce(mockPattern);

    const loadedCallback = jest.fn();
    on('BLOCKCHAIN/PATTERN_LOADED', loadedCallback);

    await loadPattern({
      txId: 'abc123',
      inscriptionApiUrl: 'https://mock-api.com',
      fetchFn: async (url) => {
        expect(url).toBe('https://mock-api.com/content/abc123');
        return mockPattern;
      }
    });

    expect(loadedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BLOCKCHAIN/PATTERN_LOADED',
        payload: expect.objectContaining({
          txId: 'abc123',
          pattern: mockPattern
        })
      })
    );
  });

  test('should emit load error if inscription is not a valid pattern', async () => {
    mockFetch.mockResolvedValueOnce({ type: 'unknown-type' });

    const errorCallback = jest.fn();
    on('BLOCKCHAIN/LOAD_ERROR', errorCallback);

    await expect(loadPattern({ txId: 'abc123' })).rejects.toThrow('not a valid sequencer pattern');

    expect(errorCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BLOCKCHAIN/LOAD_ERROR',
        payload: expect.objectContaining({
          txId: 'abc123',
          message: expect.stringContaining('not a valid sequencer pattern')
        })
      })
    );
  });

  test('should throw error if txId is missing during load', async () => {
    await expect(loadPattern({})).rejects.toThrow('txId is required');
  });

  test('should use default endpoints if not provided', async () => {
    mockFetch.mockResolvedValueOnce({ txid: 'def456' });
    const successCallback = jest.fn();
    on('BLOCKCHAIN/SAVE_SUCCESS', successCallback);

    // Use defaults
    await savePattern();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ordinals.com/inscribe',
      expect.any(Object)
    );

    mockFetch.mockResolvedValueOnce({ type: 'ordinal-sequencer-pattern' });
    on('BLOCKCHAIN/PATTERN_LOADED', successCallback);

    await loadPattern({ txId: 'abc123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ordinals.com/content/abc123',
      expect.any(Object)
    );
  });
});