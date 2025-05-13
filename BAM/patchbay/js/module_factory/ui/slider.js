// ui/slider.js

/**
 * Creates a slider component with a label, range input, and value readout.
 *
 * @param {object} options - The configuration options for the slider.
 * @param {HTMLElement} options.parent - The parent element to append the slider to.
 * @param {string} options.labelText - The text for the slider's label.
 * @param {number} options.min - The minimum value of the slider.
 * @param {number} options.max - The maximum value of the slider.
 * @param {number} options.step - The step increment of the slider.
 * @param {number} options.value - The initial value of the slider.
 * @param {string} [options.unit=''] - The unit to display next to the value (e.g., 'ms', '%').
 * @param {function} options.onInput - Callback function triggered on input, receives the new numeric value.
 * @param {string} [options.className='slider-container'] - Optional class name for the main wrapper div.
 * @param {number} [options.decimalPlaces] - Optional number of decimal places for the readout. If undefined, displays the value as is.
 * @returns {HTMLDivElement} The main div element containing the slider components.
 */
export function createSlider({
  parent,
  labelText,
  min, max, step, value,
  unit = '',
  onInput,
  className = 'slider-container', // Default class for the wrapper
  decimalPlaces,                 // For controlled readout formatting
}) {
  // Create a unique ID for associating the label with the input
  const id = `slider-${labelText.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2)}`;

  // Main wrapper for the slider component
  const wrapper = document.createElement('div');
  wrapper.className = className; // Apply provided or default class name

  // Label
  const label = Object.assign(document.createElement('label'), {
    textContent: labelText + ':', // Add colon for common styling
    htmlFor: id,
    className: 'slider-label' // Consistent class for styling
  });

  // Input range
  const input = Object.assign(document.createElement('input'), {
    id,
    type: 'range',
    min: String(min), // HTML attributes are strings
    max: String(max),
    step: String(step),
    value: String(value),
    className: 'slider-input module-slider' // Keep 'module-slider' if used elsewhere
  });

  // Readout span
  const readout = Object.assign(document.createElement('span'), {
    className: 'slider-readout' // Consistent class for styling
  });

  // Helper function to format the readout value
  const updateReadout = (currentValue) => {
    let displayValue = parseFloat(currentValue);
    if (typeof decimalPlaces === 'number') {
      displayValue = displayValue.toFixed(decimalPlaces);
    }
    readout.textContent = `${displayValue} ${unit}`.trim();
  };

  // Set initial readout value
  updateReadout(value);

  // Event listener for input changes
  input.addEventListener('input', () => {
    const numericValue = parseFloat(input.value);
    updateReadout(input.value);
    if (onInput && typeof onInput === 'function') {
      onInput(numericValue);
    }
  });

  // Assemble the component
  wrapper.append(label, input, readout);

  // Append the whole component to the specified parent
  if (parent instanceof HTMLElement) {
    parent.append(wrapper);
  } else {
    console.warn('createSlider: Parent element is not a valid HTMLElement. Slider not appended.');
  }

  // Return the wrapper element, so the caller can manage it (e.g., for removal)
  return wrapper;
}

// The older `slider` function is now redundant and can be removed.
// If you have code relying on it, you'll need to refactor it to use `createSlider`.
// export function slider(parentEl, label, min, max, val, step, onInput) { ... } // REMOVE THIS