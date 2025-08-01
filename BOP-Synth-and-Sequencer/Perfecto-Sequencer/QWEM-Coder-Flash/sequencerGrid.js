/**
 * @typedef {Object} SequencerGrid
 * @property {Function} createGrid - Create and render the sequencer grid
 * @property {Function} destroyGrid - Remove the sequencer grid from DOM
 */

/**
 * Sequencer grid module - DOM-agnostic renderer
 * @param {Function} getState - Function to get current app state
 * @param {Function} dispatch - Function to dispatch actions
 * @param {Function} emit - Function to emit events
 * @returns {SequencerGrid}
 */
export function sequencerGrid(getState, dispatch, emit) {
    let containerElement = null;
    let gridElements = new Map();
    let isInitialized = false;
  
    /**
     * Create the sequencer grid structure in the DOM
     * @param {HTMLElement} container - Container element to render grid in
     * @returns {void}
     */
    function createGrid(container) {
      if (isInitialized) {
        destroyGrid();
      }
  
      containerElement = container;
      containerElement.innerHTML = '';
      
      const state = getState();
      const { tracks, stepsPerTrack } = state.grid;
      
      // Create grid container
      const gridContainer = document.createElement('div');
      gridContainer.className = 'sequencer-grid';
      
      // Create header row for step numbers
      const headerRow = document.createElement('div');
      headerRow.className = 'grid-header-row';
      
      // Create step number headers
      for (let step = 0; step < stepsPerTrack; step++) {
        const stepEl = document.createElement('div');
        stepEl.className = 'grid-step-header';
        stepEl.textContent = step + 1;
        headerRow.appendChild(stepEl);
      }
      
      gridContainer.appendChild(headerRow);
      
      // Create track rows
      for (let track = 0; track < tracks; track++) {
        const trackRow = document.createElement('div');
        trackRow.className = 'grid-track-row';
        trackRow.dataset.track = track;
        
        // Create step cells for this track
        for (let step = 0; step < stepsPerTrack; step++) {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.dataset.track = track;
          cell.dataset.step = step;
          
          // Determine if cell should be active
          const isActive = state.grid.patternData[track] && 
                           state.grid.patternData[track][step];
          if (isActive) {
            cell.classList.add('active');
          }
          
          // Add click handler
          cell.addEventListener('click', () => {
            const isActive = !cell.classList.contains('active');
            cell.classList.toggle('active');
            
            // Dispatch action to update state
            dispatch({
              type: 'GRID/STEP_TOGGLED',
              payload: { track, step, isActive }
            });
            
            // Emit event for UI updates
            emit('GRID/STEP_TOGGLED', { track, step, isActive });
          });
          
          trackRow.appendChild(cell);
          gridElements.set(`${track}-${step}`, cell);
        }
        
        gridContainer.appendChild(trackRow);
      }
      
      containerElement.appendChild(gridContainer);
      isInitialized = true;
    }
  
    /**
     * Remove the sequencer grid from the DOM
     * @returns {void}
     */
    function destroyGrid() {
      if (containerElement) {
        containerElement.innerHTML = '';
        containerElement = null;
        gridElements.clear();
        isInitialized = false;
      }
    }
  
    /**
     * Update grid display based on current state
     * @returns {void}
     */
    function updateGrid() {
      if (!isInitialized) return;
      
      const state = getState();
      const { tracks, stepsPerTrack } = state.grid;
      
      // Update each cell based on current state
      for (let track = 0; track < tracks; track++) {
        for (let step = 0; step < stepsPerTrack; step++) {
          const cell = gridElements.get(`${track}-${step}`);
          if (cell) {
            const isActive = state.grid.patternData[track] && 
                            state.grid.patternData[track][step];
            
            if (isActive) {
              cell.classList.add('active');
            } else {
              cell.classList.remove('active');
            }
          }
        }
      }
    }
  
    // Export public API
    return {
      createGrid,
      destroyGrid,
      updateGrid
    };
  }