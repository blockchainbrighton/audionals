// sequencerGrid.js
/**
 * @module sequencerGrid
 * DOM-agnostic sequencer grid renderer and interaction handler.
 * Creates a grid of cells (tracks × steps) and attaches click/toggle behavior.
 * Emits `GRID/STEP_TOGGLED` events on user interaction.
 * Does not manage state — reads from and updates via global AppState.
 *
 * Dependencies:
 * - stateManager (getState, dispatch)
 * - eventBus (emit)
 */

import { getState } from './stateManager.js';
import { emit } from './eventBus.js';

/**
 * Creates the sequencer grid UI inside a given container element.
 * Each cell represents a step in a track. Clicking toggles activation.
 *
 * @param {HTMLElement} container - The DOM element to render the grid into
 * @returns {void}
 *
 * @example
 * const gridContainer = document.getElementById('grid');
 * createGrid(gridContainer);
 */
function createGrid(container) {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('Container must be a valid HTMLElement');
  }

  const state = getState();
  const { tracks, stepsPerTrack, patternData } = state.grid;

  // Clear container
  container.innerHTML = '';

  // Create grid table
  const table = document.createElement('table');
  table.classList.add('sequencer-grid');
  table.setAttribute('aria-label', 'Step Sequencer Grid');

  const tbody = document.createElement('tbody');

  // Create rows (one per track)
  for (let track = 0; track < tracks; track++) {
    const row = document.createElement('tr');
    row.dataset.track = track;

    // Create cells (one per step)
    for (let step = 0; step < stepsPerTrack; step++) {
      const cell = document.createElement('td');
      cell.dataset.track = track;
      cell.dataset.step = step;
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-pressed', !!patternData[track]?.[step]);
      cell.setAttribute('aria-label', `Track ${track + 1}, Step ${step + 1}`);

      // Set active class if step is on
      if (patternData[track]?.[step]) {
        cell.classList.add('active');
      }

      // Click handler
      cell.addEventListener('click', handleCellClick);

      // Keyboard support
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick(e);
        }
      });

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Handles click events on grid cells.
 * Toggles the step state and emits GRID/STEP_TOGGLED event.
 *
 * @param {MouseEvent|KeyboardEvent} event - The DOM event
 * @private
 */
function handleCellClick(event) {
  const cell = event.target;
  const track = parseInt(cell.dataset.track, 10);
  const step = parseInt(cell.dataset.step, 10);

  // Get current state
  const isActive = !!getState().grid.patternData[track]?.[step];

  // Toggle state
  const nextActive = !isActive;

  // Update UI immediately
  if (nextActive) {
    cell.classList.add('active');
  } else {
    cell.classList.remove('active');
  }
  cell.setAttribute('aria-pressed', nextActive);

  // Emit event for state update
  emit('GRID/STEP_TOGGLED', { track, step, isActive: nextActive });
}

/**
 * Destroys the sequencer grid by removing all DOM elements and event listeners.
 * Removes the grid from the container.
 *
 * @param {HTMLElement} container - The container that holds the grid
 * @returns {void}
 *
 * @example
 * destroyGrid(gridContainer);
 */
function destroyGrid(container) {
  if (!container || !(container instanceof HTMLElement)) {
    return;
  }

  // Remove all event listeners by replacing inner HTML
  // This is simpler than detaching each listener
  const table = container.querySelector('table.sequencer-grid');
  if (table) {
    table.querySelectorAll('td').forEach((cell) => {
      cell.removeEventListener('click', handleCellClick);
      cell.removeEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick(e);
        }
      });
    });
  }

  container.innerHTML = '';
}

export { createGrid, destroyGrid };