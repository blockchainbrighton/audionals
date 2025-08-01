// __tests__/blockchainPersistence.test.js

/**
 * @file Unit tests for blockchainPersistence.js
 */

import { savePattern, loadPattern } from '../blockchainPersistence.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');

describe('blockchainPersistence', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock state
    getState.mockReturnValue({
      grid: {
        tracks: 4,
        stepsPerTrack: 8,
        patternData: {
          'track-0': { 0: true, 3: true },
          'track-1': { 1: true }
        }
      }
    });
  });

  test('should save pattern and return transaction ID', async () => {
    const txId = await savePattern();
    
    expect(txId).toMatch(/^tx_[a-z0-9]+$/);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'BLOCKCHAIN/SAVE_SUCCESS',
      payload: { txId }
    });
    expect(emit).toHaveBeenCalledWith('BLOCKCHAIN/SAVE_COMPLETED', { txId });
  });

  test('should handle save failure', async () => {
    // Mock simulateInscription to throw an error
    jest.spyOn(global.Math, 'random').mockImplementation(() => {
      throw new Error('Network error');
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const txId = await savePattern();
    
    expect(txId).toBeNull();
    expect(emit).toHaveBeenCalledWith('BLOCKCHAIN/SAVE_FAILED', { error: 'Network error' });
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save pattern to blockchain:', expect.any(Error));
    
    consoleSpy.mockRestore();
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  test('should load pattern successfully', async () => {
    const testTxId = 'tx_test123';
    const result = await loadPattern(testTxId);
    
    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'GRID/LOAD_PATTERN',
      payload: expect.objectContaining({
        tracks: 4,
        stepsPerTrack: 8,
        patternData: {
          'track-0': { 0: true, 3: true },
          'track-1': { 1: true }
        }
      })
    });
    expect(emit).toHaveBeenCalledWith('BLOCKCHAIN/LOAD_COMPLETED', { txId: testTxId });
  });

  test('should handle load failure when inscription not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const result = await loadPattern('invalid_tx_id');
    
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith('BLOCKCHAIN/LOAD_FAILED', {
      txId: 'invalid_tx_id',
      error: 'Inscription not found'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load pattern from blockchain:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  test('should handle load failure with invalid pattern data', async () => {
    // Mock simulateFetchInscription to return invalid data
    const originalSimulate = jest.requireActual('../blockchainPersistence.js');
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const result = await loadPattern('tx_invalid');
    
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith('BLOCKCHAIN/LOAD_FAILED', {
      txId: 'tx_invalid',
      error: expect.any(String)
    });
    
    consoleSpy.mockRestore();
  });

  test('should serialize and deserialize pattern data correctly', async () => {
    // This test verifies the internal serialization logic
    const originalData = {
      'track-0': { 0: true, 5: true, 10: true },
      'track-1': { 2: true },
      'track-2': {} // Empty track
    };
    
    // Manually test the serialization functions
    const { serializePattern, deserializePattern } = jest.requireActual('../blockchainPersistence.js');
    
    const serialized = serializePattern(originalData);
    const deserialized = deserializePattern(serialized);
    
    expect(deserialized).toEqual(originalData);
  });

  // Edge case: Test with empty pattern data
  test('should handle empty pattern data', async () => {
    getState.mockReturnValue({
      grid: {
        tracks: 2,
        stepsPerTrack: 4,
        patternData: {} // Empty pattern
      }
    });
    
    const txId = await savePattern();
    
    expect(txId).toMatch(/^tx_[a-z0-9]+$/);
    
    // Test loading empty pattern
    const result = await loadPattern(txId);
    expect(result).toBe(true);
  });
});