// __tests__/sequencerGrid.test.js
import { sequencerGrid } from '../sequencerGrid';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

describe('sequencerGrid', () => {
  let gridModule;
  let container;

  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Setup DOM container
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Setup default state
    mockGetState.mockReturnValue({
      grid: {
        tracks: 4,
        stepsPerTrack: 8,
        patternData: {}
      }
    });
    
    gridModule = sequencerGrid(mockGetState, mockDispatch, mockEmit);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('createGrid()', () => {
    it('should create a grid with correct structure', () => {
      gridModule.createGrid(container);
      
      // Should have created grid elements
      expect(container.querySelector('.sequencer-grid')).toBeTruthy();
      expect(container.querySelectorAll('.grid-track-row').length).toBe(4);
      expect(container.querySelectorAll('.grid-step-header').length).toBe(8);
      expect(container.querySelectorAll('.grid-cell').length).toBe(32);
    });

    it('should handle existing grid cleanup', () => {
      // Create first grid
      gridModule.createGrid(container);
      const firstGrid = container.querySelector('.sequencer-grid');
      
      // Create second grid
      gridModule.createGrid(container);
      const secondGrid = container.querySelector('.sequencer-grid');
      
      // Should have replaced the first grid
      expect(firstGrid).not.toBe(secondGrid);
      expect(container.querySelectorAll('.sequencer-grid').length).toBe(1);
    });

    it('should add click handlers to cells', () => {
      gridModule.createGrid(container);
      
      const firstCell = container.querySelector('.grid-cell');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      // Spy on dispatch and emit
      const dispatchSpy = jest.spyOn(gridModule, 'updateGrid');
      
      // Simulate click
      firstCell.dispatchEvent(clickEvent);
      
      // Should have dispatched action
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 0, step: 0, isActive: true }
      });
      
      // Should have emitted event
      expect(mockEmit).toHaveBeenCalledWith('GRID/STEP_TOGGLED', {
        track: 0,
        step: 0,
        isActive: true
      });
    });
  });

  describe('destroyGrid()', () => {
    it('should remove grid from DOM', () => {
      gridModule.createGrid(container);
      expect(container.querySelector('.sequencer-grid')).toBeTruthy();
      
      gridModule.destroyGrid();
      expect(container.querySelector('.sequencer-grid')).toBeFalsy();
    });

    it('should handle multiple calls gracefully', () => {
      gridModule.destroyGrid(); // Should not throw
      expect(() => gridModule.destroyGrid()).not.toThrow();
    });
  });

  describe('updateGrid()', () => {
    it('should update cell states based on state changes', () => {
      gridModule.createGrid(container);
      
      // Initially no cells should be active
      const cells = container.querySelectorAll('.grid-cell');
      cells.forEach(cell => {
        expect(cell.classList.contains('active')).toBeFalsy();
      });
      
      // Mock state with some active cells
      mockGetState.mockReturnValue({
        grid: {
          tracks: 4,
          stepsPerTrack: 8,
          patternData: {
            0: { 0: true, 2: true },
            1: { 1: true }
          }
        }
      });
      
      // Update grid
      gridModule.updateGrid();
      
      // Check that correct cells are active
      const cell0_0 = container.querySelector('[data-track="0"][data-step="0"]');
      const cell0_1 = container.querySelector('[data-track="0"][data-step="1"]');
      const cell0_2 = container.querySelector('[data-track="0"][data-step="2"]');
      const cell1_1 = container.querySelector('[data-track="1"][data-step="1"]');
      
      expect(cell0_0.classList.contains('active')).toBeTruthy();
      expect(cell0_1.classList.contains('active')).toBeFalsy();
      expect(cell0_2.classList.contains('active')).toBeTruthy();
      expect(cell1_1.classList.contains('active')).toBeTruthy();
    });

    it('should handle uninitialized grid gracefully', () => {
      expect(() => gridModule.updateGrid()).not.toThrow();
    });
  });
});