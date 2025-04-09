// layoutBuilder.js

/**
 * Creates a DOM element with specified tag, options, and children.
 * @param {string} tag - The HTML tag name.
 * @param {object} [options={}] - Attributes and properties (id, className, textContent, etc.).
 * @param {(HTMLElement|string)[]} [children=[]] - Child elements or text nodes to append.
 * @returns {HTMLElement} The created element.
 */
function createElement(tag, options = {}, children = []) {
    const element = document.createElement(tag);

    // Apply attributes and properties
    Object.keys(options).forEach(key => {
        if (key === 'className') {
            element.className = options[key];
        } else if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'disabled' && options[key]) {
            element.disabled = true;
        } else if (key === 'attributes') { // Handle data-* or other special attributes
             Object.entries(options[key]).forEach(([attrName, attrValue]) => {
                element.setAttribute(attrName, attrValue);
             });
        }
         else {
            element.setAttribute(key, options[key]);
        }
    });

    // Append children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Builds the main application layout and appends it to the target container.
 * Moves the existing audio metadata into the correct column.
 * @param {string|HTMLElement} targetSelectorOrElement - The CSS selector or DOM element to append the layout to.
 */
export function buildLayout(targetSelectorOrElement) {
    const targetElement = typeof targetSelectorOrElement === 'string'
        ? document.querySelector(targetSelectorOrElement)
        : targetSelectorOrElement;

    if (!targetElement) {
        console.error('Layout Builder: Target element not found.');
        return;
    }

    // --- Find Existing Elements ---
    // IMPORTANT: Find the metadata div *before* clearing the target's content
    // Assuming it's directly within the target or globally searchable.
    // Let's assume it's inside the targetElement for robustness.
    const audioMetadataDiv = targetElement.querySelector('.audio-metadata');
    if (!audioMetadataDiv) {
        console.warn('Layout Builder: .audio-metadata element not found in the target container. It will not be included in the layout.');
    }

    // Clear the target container before building (optional, depends if target should ONLY contain this layout)
    // targetElement.innerHTML = ''; // Use with caution if other static elements exist there

    // --- Create Column 1: Controls ---
    const controlsColumn = createElement('div', { className: 'controls-column hidden' }, [
        createElement('div', { className: 'title-bar' }, [
            createElement('h1', { textContent: 'OB1 - Audional Art' }),
            createElement('button', { id: 'info-toggle-btn', title: 'Show/Hide Keyboard Shortcuts', textContent: 'ℹ️' })
        ]),
        // Placeholder for where metadata will be inserted
        createElement('div', { className: 'metadata-placeholder' }), // Temporary placeholder
        createElement('div', { id: 'controls-container', className: 'controls disabled' }, [
            createElement('div', { id: 'error-message', className: 'error' }),
            createElement('div', { className: 'button-group' }, [
                createElement('button', { id: 'play-once-btn', disabled: true, textContent: 'Play Once' }),
                createElement('button', { id: 'loop-toggle-btn', disabled: true, textContent: 'Play Loop: Off' }),
                createElement('button', { id: 'reverse-toggle-btn', disabled: true, textContent: 'Reverse: Off' })
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'volume-slider', textContent: 'Volume:' }),
                createElement('input', { type: 'range', id: 'volume-slider', min: '0.0', max: '1.5', step: '0.01', value: '1.0', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'volume-value', textContent: '100' }), '%'
                ])
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'tempo-slider', textContent: 'Tempo:' }),
                createElement('input', { type: 'range', id: 'tempo-slider', min: '1', max: '400', step: '1', value: '78', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'tempo-value', textContent: '78' }), ' BPM'
                ])
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'pitch-slider', textContent: 'Pitch:' }),
                createElement('input', { type: 'range', id: 'pitch-slider', min: '0.01', max: '10.0', step: '0.01', value: '1.0', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'pitch-value', textContent: '100' }), '%'
                ])
            ])
        ])
    ]);

    // --- Create Column 2: Image ---
    const imageArea = createElement('div', { className: 'image-area' }, [
        createElement('img', { id: 'main-image', src: '#', alt: 'Audional Art OB1 Visual', title: 'Click to toggle tempo loop' })
    ]);

    // --- Create Column 3: Reference ---
    const referenceColumn = createElement('div', { className: 'reference-column hidden' }, [
        createElement('div', { id: 'reference-panel', className: 'reference-panel' }) // Content populated later by JS
    ]);

    // --- Assemble Main Layout ---
    const mainLayout = createElement('div', { className: 'main-layout' }, [
        controlsColumn,
        imageArea,
        referenceColumn
    ]);

     // --- Move Existing Metadata ---
    if (audioMetadataDiv) {
        const placeholder = controlsColumn.querySelector('.metadata-placeholder');
        if (placeholder) {
            // Replace placeholder with the actual metadata div
            placeholder.parentNode.replaceChild(audioMetadataDiv, placeholder);
        } else {
            // Fallback: Append if placeholder wasn't found (shouldn't happen)
            controlsColumn.insertBefore(audioMetadataDiv, controlsColumn.children[1]); // Insert after title-bar
        }
    }

    // --- Append to Target ---
    targetElement.appendChild(mainLayout);

    console.log("Layout built successfully.");
}