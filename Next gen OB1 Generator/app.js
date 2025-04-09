// app.js

// Helper function to create an element with optional attributes and children.
function createElem(type, attrs = {}, ...children) {
    const el = document.createElement(type);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'id') {
        el.id = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
    return el;
  }
  
  // Main container element
  const mainLayout = createElem('div', { class: 'main-layout' });
  
  // ---------- Column 1: Controls Area ----------
  const controlsColumn = createElem('div', { class: 'controls-column hidden' });
  
  // Title Bar
  const titleBar = createElem('div', { class: 'title-bar' },
    createElem('h1', {}, 'OB1 - Audional Art'),
    createElem('button', { id: 'info-toggle-btn', title: 'Show/Hide Keyboard Shortcuts' }, 'ℹ️')
  );
  controlsColumn.appendChild(titleBar);
  
  // Audio Metadata
  const audioMetadata = createElem('div', { class: 'audio-metadata' },
    createElem('span', { id: 'audio-meta-instrument' }, 'Steel Drum Hit'),
    document.createTextNode(' | '),
    createElem('span', { id: 'audio-meta-note' }, 'C6'),
    document.createTextNode(' | '),
    createElem('span', { id: 'audio-meta-frequency' }, '1050 Hz')
  );
  controlsColumn.appendChild(audioMetadata);
  
  // Controls Container
  const controlsContainer = createElem('div', { id: 'controls-container', class: 'controls disabled' });
  controlsContainer.appendChild(createElem('div', { id: 'error-message', class: 'error' }));
  
  const buttonGroup = createElem('div', { class: 'button-group' },
    createElem('button', { id: 'play-once-btn', disabled: true }, 'Play Once'),
    createElem('button', { id: 'loop-toggle-btn', disabled: true }, 'Play Loop: Off'),
    createElem('button', { id: 'reverse-toggle-btn', disabled: true }, 'Reverse: Off')
  );
  controlsContainer.appendChild(buttonGroup);
  
  // Control Group Template for Sliders
  const createControlGroup = (labelText, inputId, inputAttrs, valueId, valueSuffix) => {
    const group = createElem('div', { class: 'control-group' },
      createElem('label', { for: inputId }, labelText),
      createElem('input', Object.assign({ id: inputId, disabled: true }, inputAttrs)),
      createElem('span', { class: 'value-display' },
        createElem('span', { id: valueId }, inputAttrs.value),
        valueSuffix
      )
    );
    return group;
  };
  
  // Add Volume, Tempo, and Pitch control groups
  controlsContainer.appendChild(createControlGroup('Volume:', 'volume-slider', { type: 'range', min: "0.0", max: "1.5", step: "0.01", value: "1.0" }, 'volume-value', '%'));
  controlsContainer.appendChild(createControlGroup('Tempo:', 'tempo-slider', { type: 'range', min: "1", max: "400", step: "1", value: "78" }, 'tempo-value', ' BPM'));
  controlsContainer.appendChild(createControlGroup('Pitch:', 'pitch-slider', { type: 'range', min: "0.01", max: "10.0", step: "0.01", value: "1.0" }, 'pitch-value', '%'));
  
  controlsColumn.appendChild(controlsContainer);
  mainLayout.appendChild(controlsColumn);
  
  // ---------- Column 2: Image Area ----------
  const imageArea = createElem('div', { class: 'image-area' },
    createElem('img', {
      id: 'main-image',
      src: '#',
      alt: 'Audional Art OB1 Visual',
      title: 'Click to toggle tempo loop'
    })
  );
  mainLayout.appendChild(imageArea);
  
  // ---------- Column 3: Reference Area ----------
  const referenceColumn = createElem('div', { class: 'reference-column hidden' },
    createElem('div', { id: 'reference-panel', class: 'reference-panel' })
  );
  mainLayout.appendChild(referenceColumn);
  
  // Append the complete layout to the #app container
  document.getElementById('app').appendChild(mainLayout);
  
  // Further JS for interactivity and TDD setup can be added here.
  