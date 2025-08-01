// __tests__/sequencerGrid.test.js
import { createGrid, destroyGrid } from '../sequencerGrid.js';
import { emit, on } from '../eventBus.js';
import { dispatch, getState } from '../stateManager.js';

// Mock stateManager
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    grid: {
      tracks: 2,
      stepsPerTrack: 4,
      patternData: {
        0: { 0: true, 2: true },
        1: { 1: true, 3: true },
      },
    },
  })),
  dispatch: jest.fn(),
}));

describe('sequencerGrid', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should create a grid with correct number of rows and cells', () => {
    createGrid(container);

    const table = container.querySelector('table.sequencer-grid');
    expect(table).not.toBeNull();

    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2); // 2 tracks

    rows.forEach((row, trackIndex) => {
      const cells = row.querySelectorAll('td');
      expect(cells).toHaveLength(4); // 4 steps

      cells.forEach((cell, stepIndex) => {
        expect(cell.dataset.track).toBe(String(trackIndex));
        expect(cell.dataset.step).toBe(String(stepIndex));
        expect(cell.getAttribute('role')).toBe('button');
        expect(cell.tabIndex).toBe(0);
      });
    });
  });

  test('should reflect active steps from state in UI', () => {
    createGrid(container);

    const cells = container.querySelectorAll('td');
    expect(cells[0].classList.contains('active')).toBe(true);   // (0,0)
    expect(cells[1].classList.contains('active')).toBe(false);  // (0,1)
    expect(cells[2].classList.contains('active')).toBe(true);   // (0,2)
    expect(cells[3].classList.contains('active')).toBe(false);  // (0,3)
    expect(cells[5].classList.contains('active')).toBe(true);   // (1,1)
    expect(cells[7].classList.contains('active')).toBe(true);   // (1,3)
  });

  test('should toggle cell state on click and emit event', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    createGrid(container);

    const cell = container.querySelector('td[data-track="0"][data-step="0"]');
    expect(cell.classList.contains('active')).toBe(true);

    // Click to deactivate
    cell.click();

    expect(cell.classList.contains('active')).toBe(false);
    expect(cell.getAttribute('aria-pressed')).toBe('false');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        track: 0,
        step: 0,
        isActive: false,
      })
    );

    // Click to reactivate
    cell.click();
    expect(cell.classList.contains('active')).toBe(true);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        track: 0,
        step: 0,
        isActive: true,
      })
    );
  });

  test('should support keyboard interaction (Enter and Space)', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    createGrid(container);

    const cell = container.querySelector('td[data-track="1"][data-step="1"]');
    expect(cell.classList.contains('active')).toBe(true);

    // Press Space
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ track: 1, step: 1, isActive: false })
    );

    // Press Enter
    callback.mockClear();
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ track: 1, step: 1, isActive: true })
    );
  });

  test('should update aria-pressed when toggled', () => {
    createGrid(container);

    const cell = container.querySelector('td[data-track="0"][data-step="1"]');
    expect(cell.getAttribute('aria-pressed')).toBe('false');

    cell.click();
    expect(cell.getAttribute('aria-pressed')).toBe('true');

    cell.click();
    expect(cell.getAttribute('aria-pressed')).toBe('false');
  });

  test('should destroy grid and remove DOM elements', () => {
    createGrid(container);
    expect(container.querySelector('table')).not.toBeNull();

    destroyGrid(container);
    expect(container.innerHTML.trim()).toBe('');
  });

  test('should throw error if container is not a valid element', () => {
    expect(() => {
      createGrid(null);
    }).toThrow('Container must be a valid HTMLElement');

    expect(() => {
      createGrid('invalid');
    }).toThrow('Container must be a valid HTMLElement');
  });

  test('destroyGrid should handle missing container gracefully', () => {
    expect(() => {
      destroyGrid(null);
    }).not.toThrow();

    expect(() => {
      destroyGrid(document.createElement('div'));
    }).not.toThrow();
  });
});