// __tests__/blockchainPersistence.test.js
import { blockchainPersistence } from '../blockchainPersistence';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

describe('blockchainPersistence', () => {
  let blockchainModule;

  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Setup default state
    mockGetState.mockReturnValue({
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {
          0: { 0: true, 4: true },
          1: { 1: true, 5: true }
        }
      },
      transport: {
        bpm: 120,
        isPlaying: false,
        position: 0
      }
    });
    
    blockchainModule = blockchainPersistence(mockGetState, mockDispatch, mockEmit);
  });

  describe('savePattern()', () => {
    it('should serialize and save pattern data', async () => {
      const txId = await blockchainModule.savePattern('mock-tx-id-123');
      
      expect(txId).toBe('mock-tx-id-123');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'BLOCKCHAIN/TRANSACTION_SAVED',
        payload: { txId: 'mock-tx-id-123' }
      });
      expect(mockEmit).toHaveBeenCalledWith('BLOCKCHAIN/PATTERN_SAVED', expect.any(Object));
    });

    it('should generate random TX ID when none provided', async () => {
      const txId = await blockchainModule.savePattern();
      
      // Should contain "tx_" prefix and be a string
      expect(typeof txId).toBe('string');
      expect(txId.startsWith('tx_')).toBe(true);
    });

    it('should handle save errors gracefully', async () => {
      // Mock an error scenario
      const error = new Error('Network error');
      jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw error;
      });
      
      await expect(blockchainModule.savePattern()).rejects.toThrow('Network error');
      expect(mockEmit).toHaveBeenCalledWith('BLOCKCHAIN/SAVE_ERROR', { 
        error: 'Network error' 
      });
      
      // Restore
      JSON.stringify.mockRestore();
    });
  });

  describe('loadPattern()', () => {
    it('should load pattern data from blockchain', async () => {
      const result = await blockchainModule.loadPattern('mock-tx-id-456');
      
      // Should have updated grid state
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'GRID/RESET' });
      
      // Should have dispatched multiple step toggles
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 0, step: 0, isActive: true }
      });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 0, step: 4, isActive: true }
      });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'TRANSPORT/SET_BPM',
        payload: { bpm: 130 }
      });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'BLOCKCHAIN/TRANSACTION_SAVED',
        payload: { txId: 'mock-tx-id-456' }
      });
      
      expect(mockEmit).toHaveBeenCalledWith('BLOCKCHAIN/PATTERN_LOADED', expect.any(Object));
      
      // Should return the mock data
      expect(result).toHaveProperty('version', '1.0');
      expect(result).toHaveProperty('bpm', 130);
    });

    it('should handle load errors gracefully', async () => {
      // Mock an error scenario
      const error = new Error('Transaction not found');
      jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
        throw error;
      });
      
      await expect(blockchainModule.loadPattern('invalid-tx')).rejects.toThrow('Transaction not found');
      expect(mockEmit).toHaveBeenCalledWith('BLOCKCHAIN/LOAD_ERROR', { 
        error: 'Transaction not found', 
        txId: 'invalid-tx' 
      });
      
      // Restore
      JSON.parse.mockRestore();
    });
  });
});