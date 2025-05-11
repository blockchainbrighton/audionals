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
  