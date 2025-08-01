// sequencerGrid.js
/**
 * DOM-agnostic step sequencer grid renderer.
 * Creates a visual grid from AppState.grid, handles UI events (click/toggle).
 * Emits events on interaction; does not manage state directly.
 *
 * @module sequencerGrid
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

/**
 * Creates a step sequencer grid UI in the given container element.
 * Renders a table with tracks as rows and steps as columns.
 * Adds click event listeners to toggle steps.
 *
 * @param {HTMLElement} container - DOM element to render grid into.
 * @param {Object} [options] - Optional config: { trackLabels, stepLabels }
 * @returns {Object} Object with destroy method to clean up.
 */
export function createGrid(container, options = {}) {
  const state = getState();
  const { tracks, stepsPerTrack, patternData } = state.grid;

  // Default labels if not provided
  const trackLabels = options.trackLabels || Array.from({ length: tracks }, (_, i) => `T${i + 1}`);
  const stepLabels = options.stepLabels || Array.from({ length: stepsPerTrack }, (_, i) => i + 1);

  // Clear container
  container.innerHTML = '';

  // Create table
  const table = document.createElement('table');
  table.className = 'sequencer-grid';

  // Header row for step numbers
  const headerRow = document.createElement('tr');
  const headerCell = document.createElement('th');
  headerCell.textContent = '';
  headerRow.appendChild(headerCell);

  stepLabels.forEach(stepLabel => {
    const th = document.createElement('th');
    th.textContent = stepLabel;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Track rows
  for (let track = 0; track < tracks; track++) {
    const tr = document.createElement('tr');

    // Track label cell
    const labelCell = document.createElement('td');
    labelCell.textContent = trackLabels[track];
    tr.appendChild(labelCell);

    // Step cells
    for (let step = 0; step < stepsPerTrack; step++) {
      const key = `${track}-${step}`;
      const isActive = !!patternData[key];

      const td = document.createElement('td');
      td.className = isActive ? 'active' : 'inactive';
      td.setAttribute('data-track', track);
      td.setAttribute('data-step', step);
      td.setAttribute('role', 'button');
      td.setAttribute('tabindex', 0);
      td.setAttribute('aria-label', `Track ${track + 1}, Step ${step + 1}, ${isActive ? 'on' : 'off'}`);

      // Click toggles step
      td.addEventListener('click', () => {
        const newActive = !isActive;
        dispatch({
          type: 'GRID/STEP_TOGGLED',
          payload: { track, step, isActive: newActive }
        });
        emit('GRID/CELL_CLICKED', { track, step, isActive: newActive });
      });

      // Keyboard support
      td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const newActive = !isActive;
          dispatch({
            type: 'GRID/STEP_TOGGLED',
            payload: { track, step, isActive: newActive }
          });
          emit('GRID/CELL_CLICKED', { track, step, isActive: newActive });
        }
      });

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  container.appendChild(table);

  // Return cleanup function
  return {
    destroy: () => {
      container.innerHTML = '';
    }
  };
}

/**
 * Destroys the grid and removes all event listeners.
 * Should be called before recreating or unmounting.
 * @param {HTMLElement} container - The same container used in createGrid.
 */
export function destroyGrid(container) {
  container.innerHTML = '';
}