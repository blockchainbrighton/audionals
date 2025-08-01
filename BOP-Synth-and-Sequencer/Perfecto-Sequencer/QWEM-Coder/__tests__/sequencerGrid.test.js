// __tests__/sequencerGrid.test.js

/**
 * @file Unit tests for sequencerGrid.js
 */

import { createGrid, destroyGrid } from '../sequencerGrid.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');

describe('sequencerGrid', () => {
  let container;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup DOM container
    container = document.createElement('div');
    document.body.appendChild(container);
    
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

  afterEach(() => {
    document.body.removeChild(container);
    destroyGrid();
  });

  test('should create grid with correct number of buttons', () => {
    createGrid(container);

    const buttons = container.querySelectorAll('.grid-step');
    expect(buttons.length).toBe(32); // 4 tracks * 8 steps
  });

  test('should set active class for active steps', () => {
    createGrid(container);

    const activeButtons = container.querySelectorAll('.grid-step.active');
    expect(activeButtons.length).toBe(3); // 3 active steps in mock data
  });

  test('should set data attributes correctly', () => {
    createGrid(container);

    const firstButton = container.querySelector('.grid-step');
    expect(firstButton.dataset.track).toBe('0');
    expect(firstButton.dataset.step).toBe('0');
  });

  test('should throw error if container is not provided', () => {
    expect(() => createGrid(null)).toThrow('Container element is required');
  });

  test('should handle step toggle click', () => {
    createGrid(container);
    
    const firstButton = container.querySelector('.grid-step');
    firstButton.click();
    
    // Should emit event
    expect(emit).toHaveBeenCalledWith('GRID/STEP_TOGGLED', {
      track: 0,
      step: 0,
      isActive: true
    });
    
    // Should dispatch action
    expect(dispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: {
        track: 0,
        step: 0,
        isActive: true
      }
    });
    
    // Should update visual state
    expect(firstButton.classList.contains('active')).toBe(true);
  });

  test('should destroy grid and clean up', () => {
    createGrid(container);
    expect(container.innerHTML).not.toBe('');
    
    destroyGrid();
    expect(container.innerHTML).toBe('');
  });

  // Edge case: Test with empty pattern data
  test('should handle empty pattern data gracefully', () => {
    getState.mockReturnValue({
      grid: {
        tracks: 2,
        stepsPerTrack: 4,
        patternData: {} // No pattern data
      }
    });

    expect(() => createGrid(container)).not.toThrow();
    
    const buttons = container.querySelectorAll('.grid-step');
    expect(buttons.length).toBe(8);
    
    const activeButtons = container.querySelectorAll('.grid-step.active');
    expect(activeButtons.length).toBe(0);
  });
});