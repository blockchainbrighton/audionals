/**
 * DOMUtils - DOM manipulation utilities
 * Provides consistent DOM operations and element creation
 */
export class DOMUtils {
    /**
     * Create an element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|Node|Array} content - Element content
     * @returns {HTMLElement} Created element
     */
    static createElement(tag, attributes = {}, content = null) {
        const element = document.createElement(tag);
        
        // Set attributes
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    element.dataset[dataKey] = dataValue;
                }
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        }
        
        // Set content
        if (content !== null) {
            if (Array.isArray(content)) {
                content.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else if (child instanceof Node) {
                        element.appendChild(child);
                    }
                });
            } else if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof Node) {
                element.appendChild(content);
            }
        }
        
        return element;
    }

    /**
     * Create a control row for the UI
     * @param {string} label - Control label
     * @param {HTMLElement} control - Control element
     * @param {HTMLElement} valueDisplay - Value display element (optional)
     * @returns {HTMLElement} Control row element
     */
    static createControlRow(label, control, valueDisplay = null) {
        const row = this.createElement('div', { className: 'control-row' });
        
        const labelElement = this.createElement('span', { className: 'control-label' }, label);
        row.appendChild(labelElement);
        row.appendChild(control);
        
        if (valueDisplay) {
            row.appendChild(valueDisplay);
        }
        
        return row;
    }

    /**
     * Create a range input with number input and value display
     * @param {Object} options - Input options
     * @returns {Object} Input elements
     */
    static createRangeInput(options = {}) {
        const {
            id,
            min = 0,
            max = 1,
            step = 0.01,
            value = 0,
            unit = '',
            precision = 2
        } = options;

        const rangeInput = this.createElement('input', {
            type: 'range',
            id: id,
            min: min,
            max: max,
            step: step,
            value: value
        });

        const numberInput = this.createElement('input', {
            type: 'number',
            id: id + 'Input',
            min: min,
            max: max,
            step: step,
            value: value,
            style: { width: '65px', marginLeft: '7px' }
        });

        const valueDisplay = this.createElement('span', {
            className: 'control-value',
            id: id + 'Val'
        }, this.formatValue(value, precision, unit));

        // Sync inputs
        const updateValue = (newValue) => {
            const formattedValue = this.formatValue(newValue, precision, unit);
            rangeInput.value = newValue;
            numberInput.value = newValue;
            valueDisplay.textContent = formattedValue;
        };

        rangeInput.addEventListener('input', (e) => {
            updateValue(e.target.value);
        });

        numberInput.addEventListener('input', (e) => {
            updateValue(e.target.value);
        });

        return {
            range: rangeInput,
            number: numberInput,
            display: valueDisplay,
            updateValue
        };
    }

    /**
     * Create a toggle switch
     * @param {Object} options - Switch options
     * @returns {Object} Switch elements
     */
    static createToggleSwitch(options = {}) {
        const { id, checked = false, label = '' } = options;

        const labelElement = this.createElement('label', { className: 'enable-switch' });
        
        const checkbox = this.createElement('input', {
            type: 'checkbox',
            id: id,
            checked: checked
        });

        const slider = this.createElement('span', { className: 'slider' });
        
        labelElement.appendChild(checkbox);
        labelElement.appendChild(slider);

        if (label) {
            const labelText = this.createElement('span', { className: 'control-label' }, label);
            return {
                switch: labelElement,
                checkbox: checkbox,
                label: labelText
            };
        }

        return {
            switch: labelElement,
            checkbox: checkbox
        };
    }

    /**
     * Create a select dropdown
     * @param {Object} options - Select options
     * @returns {HTMLSelectElement} Select element
     */
    static createSelect(options = {}) {
        const { id, options: selectOptions = [], value = '' } = options;

        const select = this.createElement('select', { id: id });

        selectOptions.forEach(option => {
            const optionElement = this.createElement('option', {
                value: typeof option === 'object' ? option.value : option
            }, typeof option === 'object' ? option.label : option);

            if ((typeof option === 'object' ? option.value : option) === value) {
                optionElement.selected = true;
            }

            select.appendChild(optionElement);
        });

        return select;
    }

    /**
     * Create a collapsible panel
     * @param {Object} options - Panel options
     * @returns {Object} Panel elements
     */
    static createCollapsiblePanel(options = {}) {
        const { id, title, content, expanded = false } = options;

        const panel = this.createElement('div', {
            className: `control-group ${expanded ? 'expanded' : 'collapsed'}`,
            id: id
        });

        const header = this.createElement('h3', {
            className: 'panel-header',
            onclick: () => this.togglePanel(panel)
        }, title);

        const contentDiv = this.createElement('div', {
            className: 'panel-content',
            style: { display: expanded ? 'block' : 'none' }
        });

        if (typeof content === 'string') {
            contentDiv.innerHTML = content;
        } else if (content instanceof Node) {
            contentDiv.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    contentDiv.appendChild(child);
                }
            });
        }

        panel.appendChild(header);
        panel.appendChild(contentDiv);

        return {
            panel: panel,
            header: header,
            content: contentDiv,
            toggle: () => this.togglePanel(panel)
        };
    }

    /**
     * Toggle a collapsible panel
     * @param {HTMLElement} panel - Panel element
     */
    static togglePanel(panel) {
        const content = panel.querySelector('.panel-content');
        const isExpanded = panel.classList.contains('expanded');

        if (isExpanded) {
            panel.classList.remove('expanded');
            panel.classList.add('collapsed');
            content.style.display = 'none';
        } else {
            panel.classList.remove('collapsed');
            panel.classList.add('expanded');
            content.style.display = 'block';
        }
    }

    /**
     * Format a value for display
     * @param {number} value - Value to format
     * @param {number} precision - Decimal precision
     * @param {string} unit - Unit suffix
     * @returns {string} Formatted value
     */
    static formatValue(value, precision = 2, unit = '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value + unit;
        
        if (precision === 0) {
            return Math.round(numValue) + unit;
        }
        
        return numValue.toFixed(precision) + unit;
    }

    /**
     * Add CSS class with animation support
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name to add
     * @param {number} duration - Animation duration (ms)
     */
    static addClassAnimated(element, className, duration = 200) {
        element.classList.add(className);
        
        if (duration > 0) {
            element.style.transition = `all ${duration}ms ease`;
            setTimeout(() => {
                element.style.transition = '';
            }, duration);
        }
    }

    /**
     * Remove CSS class with animation support
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name to remove
     * @param {number} duration - Animation duration (ms)
     */
    static removeClassAnimated(element, className, duration = 200) {
        if (duration > 0) {
            element.style.transition = `all ${duration}ms ease`;
            setTimeout(() => {
                element.classList.remove(className);
                element.style.transition = '';
            }, duration);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * Find element by selector with error handling
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (optional)
     * @returns {HTMLElement|null} Found element
     */
    static findElement(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.error(`Invalid selector: ${selector}`, error);
            return null;
        }
    }

    /**
     * Find elements by selector with error handling
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (optional)
     * @returns {NodeList|Array} Found elements
     */
    static findElements(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.error(`Invalid selector: ${selector}`, error);
            return [];
        }
    }

    /**
     * Safely set element content
     * @param {HTMLElement} element - Target element
     * @param {string} content - Content to set
     * @param {boolean} isHTML - Whether content is HTML
     */
    static setContent(element, content, isHTML = false) {
        if (!element) return;
        
        if (isHTML) {
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Is visible
     */
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Smooth scroll to element
     * @param {HTMLElement} element - Target element
     * @param {Object} options - Scroll options
     */
    static scrollToElement(element, options = {}) {
        const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options;
        
        element.scrollIntoView({
            behavior,
            block,
            inline
        });
    }
}

