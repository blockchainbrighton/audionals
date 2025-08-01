// __tests__/sequencerGrid.test.js
/**
 * Unit tests for sequencerGrid.js
 * @file sequencerGrid.test.js
 */

import { createGrid, destroyGrid } from '../sequencerGrid.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

describe('sequencerGrid', () => {
  beforeEach(() => {
    // Mock DOM environment
    document.body.innerHTML = '<div id="container"></div>';
  });

  test('createGrid renders correct number of tracks and steps', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 3,
        stepsPerTrack: 4,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const grid = createGrid(container);

    expect(container.querySelectorAll('table tr')).toHaveLength(4); // 1 header + 3 tracks
    expect(container.querySelectorAll('table tr')[1].querySelectorAll('td')).toHaveLength(5); // 1 label + 4 steps

    grid.destroy();
    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('createGrid uses default track/step labels when none provided', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 2,
        stepsPerTrack: 2,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    createGrid(container);

    const firstTrackLabel = container.querySelector('tr:nth-child(2) td:first-child').textContent;
    expect(firstTrackLabel).toBe('T1');

    const secondStepLabel = container.querySelector('tr:first-child td:nth-child(2)').textContent;
    expect(secondStepLabel).toBe('1');

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('createGrid uses custom track/step labels when provided', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 2,
        stepsPerTrack: 2,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    createGrid(container, {
      trackLabels: ['Kick', 'Snare'],
      stepLabels: ['1', '2']
    });

    const kickLabel = container.querySelector('tr:nth-child(2) td:first-child').textContent;
    expect(kickLabel).toBe('Kick');

    const snareLabel = container.querySelector('tr:nth-child(3) td:first-child').textContent;
    expect(snareLabel).toBe('Snare');

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('createGrid sets active/inactive classes based on patternData', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 2,
        patternData: { '0-0': true, '0-1': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    createGrid(container);

    const firstCell = container.querySelector('tr:nth-child(2) td:nth-child(2)');
    const secondCell = container.querySelector('tr:nth-child(2) td:nth-child(3)');

    expect(firstCell.classList.contains('active')).toBe(true);
    expect(secondCell.classList.contains('inactive')).toBe(true);

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('click on cell triggers GRID/STEP_TOGGLED action', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 1,
        patternData: { '0-0': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const grid = createGrid(container);

    const cell = container.querySelector('td[data-track="0"][data-step="0"]');
    cell.click();

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 0, step: 0, isActive: true }
    });

    grid.destroy();
    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('keyboard Enter/Space toggles cell', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 1,
        patternData: { '0-0': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const grid = createGrid(container);

    const cell = container.querySelector('td[data-track="0"][data-step="0"]');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    cell.dispatchEvent(event);

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 0, step: 0, isActive: true }
    });

    grid.destroy();
    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('destroyGrid clears container content', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 1,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const grid = createGrid(container);
    expect(container.innerHTML).not.toBe('');

    destroyGrid(container);
    expect(container.innerHTML).toBe('');

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('createGrid is idempotent: multiple calls don’t double-render', () => {
    const container = document.getElementById('container');
    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 1,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    createGrid(container);
    const initialCount = container.querySelectorAll('table tr').length;

    createGrid(container);
    const finalCount = container.querySelectorAll('table tr').length;

    expect(finalCount).toBe(initialCount);

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('emit GRID/CELL_CLICKED on interaction', () => {
    const container = document.getElementById('container');
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    const mockState = {
      grid: {
        tracks: 1,
        stepsPerTrack: 1,
        patternData: { '0-0': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const grid = createGrid(container);

    const cell = container.querySelector('td[data-track="0"][data-step="0"]');
    cell.click();

    expect(spyEmit).toHaveBeenCalledWith('GRID/CELL_CLICKED', { track: 0, step: 0, isActive: true });

    grid.destroy();
    Object.defineProperty(global, 'getState', { value: originalGetState });
  });
});