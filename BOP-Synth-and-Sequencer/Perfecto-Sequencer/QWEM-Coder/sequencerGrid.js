// sequencerGrid.js

/**
 * @file DOM-agnostic sequencer grid renderer and event handler.
 * Creates a grid UI and handles user interactions.
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

// Module-level variables to maintain grid state
let gridContainer = null;
let onClickHandler = null;

/**
 * Creates a sequencer grid in the given container element.
 * @param {HTMLElement} container - The container element to render the grid in.
 */
export function createGrid(container) {
  if (!container) {
    throw new Error('Container element is required');
  }

  gridContainer = container;
  const state = getState();
  const { grid } = state;

  // Clear container
  container.innerHTML = '';

  // Create grid structure
  const gridElement = document.createElement('div');
  gridElement.className = 'sequencer-grid';
  gridElement.style.display = 'grid';
  gridElement.style.gridTemplateColumns = `repeat(${grid.stepsPerTrack}, 1fr)`;
  gridElement.style.gap = '2px';

  // Create step buttons for each track
  for (let track = 0; track < grid.tracks; track++) {
    for (let step = 0; step < grid.stepsPerTrack; step++) {
      const button = document.createElement('button');
      button.className = 'grid-step';
      button.dataset.track = track;
      button.dataset.step = step;
      
      const trackKey = `track-${track}`;
      const isActive = !!(grid.patternData[trackKey] && grid.patternData[trackKey][step]);
      
      updateStepButton(button, isActive);
      
      gridElement.appendChild(button);
    }
  }

  container.appendChild(gridElement);

  // Attach event listener
  onClickHandler = handleGridClick;
  gridElement.addEventListener('click', onClickHandler);
}

/**
 * Destroys the grid and cleans up event listeners.
 */
export function destroyGrid() {
  if (gridContainer && onClickHandler) {
    const gridElement = gridContainer.querySelector('.sequencer-grid');
    if (gridElement) {
      gridElement.removeEventListener('click', onClickHandler);
    }
    gridContainer.innerHTML = '';
  }
  gridContainer = null;
  onClickHandler = null;
}

/**
 * Updates the visual state of a step button.
 * @param {HTMLButtonElement} button - The button to update.
 * @param {boolean} isActive - Whether the step is active.
 */
function updateStepButton(button, isActive) {
  button.setAttribute('aria-pressed', isActive);
  if (isActive) {
    button.classList.add('active');
  } else {
    button.classList.remove('active');
  }
}

/**
 * Handles click events on the grid.
 * @param {Event} event - The click event.
 */
function handleGridClick(event) {
  if (event.target.classList.contains('grid-step')) {
    const track = parseInt(event.target.dataset.track, 10);
    const step = parseInt(event.target.dataset.step, 10);
    const isActive = event.target.classList.contains('active');
    
    // Toggle visual state
    updateStepButton(event.target, !isActive);
    
    // Emit event for other modules
    emit('GRID/STEP_TOGGLED', {
      track,
      step,
      isActive: !isActive
    });
    
    // Dispatch action to update state
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: {
        track,
        step,
        isActive: !isActive
      }
    });
  }
}