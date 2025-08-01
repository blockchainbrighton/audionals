// __tests__/blockchainPersistence.test.js
/**
 * Unit tests for blockchainPersistence.js
 * @file blockchainPersistence.test.js
 */

import { savePattern, loadPattern } from '../blockchainPersistence.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

describe('blockchainPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.fetch = jest.fn();
  });

  test('savePattern serializes grid state and returns TX ID', async () => {
    const mockState = {
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { '0-0': true, '1-1': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    const result = await savePattern();

    expect(result).toMatch(/^tx_[a-z0-9]+_[a-z0-9]{8}$/);

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'BLOCKCHAIN/PATTERN_SAVED',
      payload: { txId: expect.stringMatching(/^tx_[a-z0-9]+_[a-z0-9]{8}$/) }
    });

    expect(spyEmit).toHaveBeenCalledWith('BLOCKCHAIN/PATTERN_SAVED', { txId: expect.any(String) });

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('savePattern handles empty patternData correctly', async () => {
    const mockState = {
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch');
    const spyEmit = jest.spyOn(window, 'emit');

    const result = await savePattern();

    expect(result).toMatch(/^tx_[a-z0-9]+_[a-z0-9]{8}$/);

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'BLOCKCHAIN/PATTERN_SAVED',
      payload: { txId: expect.any(String) }
    });

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('loadPattern fetches and parses inscription data by TX ID', async () => {
    const mockTxId = 'tx_abc123_xyz789';

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    const result = await loadPattern(mockTxId);

    expect(result).toEqual({
      tracks: 8,
      stepsPerTrack: 16,
      patternData: {
        '0-0': true,
        '1-4': true,
        '2-8': true,
        '3-12': true
      }
    });

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'BLOCKCHAIN/PATTERN_LOADED',
      payload: {
        patternData: {
          '0-0': true,
          '1-4': true,
          '2-8': true,
          '3-12': true
        }
      }
    });

    expect(spyEmit).toHaveBeenCalledWith('BLOCKCHAIN/PATTERN_LOADED', {
      txId: mockTxId,
      patternData: {
        '0-0': true,
        '1-4': true,
        '2-8': true,
        '3-12': true
      }
    });

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('loadPattern throws error if invalid TX ID', async () => {
    const invalidTxId = '';

    await expect(loadPattern(invalidTxId)).rejects.toThrowError();
  });

  test('loadPattern respects mock delay', async () => {
    const spyTimeout = jest.spyOn(window, 'setTimeout').mockImplementation((fn) => fn());

    const result = await loadPattern('tx_123');

    expect(spyTimeout).toHaveBeenCalled();

    spyTimeout.mockRestore();
  });

  test('savePattern emits event only once', async () => {
    const mockState = {
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    await savePattern();
    await savePattern();

    expect(spyEmit).toHaveBeenCalledTimes(1); // Only one emission per save

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyEmit.mockRestore();
  });

  test('loadPattern emits event only once', async () => {
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    await loadPattern('tx_123');
    await loadPattern('tx_123');

    expect(spyEmit).toHaveBeenCalledTimes(1); // Only one emission per load

    spyEmit.mockRestore();
  });

  test('savePattern does not mutate state directly', async () => {
    const mockState = {
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} },
      blockchain: { lastTxId: null }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch');

    await savePattern();

    expect(spyDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'BLOCKCHAIN/PATTERN_SAVED'
    }));

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });
});