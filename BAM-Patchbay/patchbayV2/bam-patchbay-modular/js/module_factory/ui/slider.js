// ui/slider.js
export function createSlider({
    parent,
    labelText,
    min, max, step, value,
    unit = '',
    onInput
  }) {
    const id = `sl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
    const label = Object.assign(document.createElement('label'), { textContent: labelText, htmlFor: id });
    const input = Object.assign(document.createElement('input'), {
      id, type: 'range', min, max, step, value, className: 'module-slider'
    });
    const readout = document.createElement('span');
    readout.textContent = `${value} ${unit}`.trim();
  
    input.addEventListener('input', () => {
      readout.textContent = `${input.value} ${unit}`.trim();
      onInput(parseFloat(input.value));
    });
  
    parent.append(label, input, readout);
    return input;           // let caller keep a reference if needed
  }


  // Helper function (assume this is available, e.g., in a shared utils.js or defined in each file for demo)
export function slider(parentEl, label, min, max, val, step, onInput) {
    const wrap = document.createElement('label');
    wrap.style.display = 'block'; // Basic styling
    wrap.style.marginBottom = '5px';
    wrap.textContent = `${label}: `;
    const s = Object.assign(document.createElement('input'), {
      type: 'range', min, max, step: step || (max - min) / 100, value: val
    });
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = parseFloat(val).toFixed(2); // Initial value display
    s.oninput = () => {
      const numValue = parseFloat(s.value);
      onInput(numValue);
      valueDisplay.textContent = numValue.toFixed(2);
    };
    wrap.append(s, valueDisplay);
    parentEl.append(wrap);
    return s; // Return the input element itself if direct manipulation is needed
  }
  