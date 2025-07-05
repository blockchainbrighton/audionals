// DOM Utility Functions
class DOMUtils {
    /**
     * Get element by ID with error handling
     */
    static getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Get elements by class name
     */
    static getElementsByClassName(className) {
        return Array.from(document.getElementsByClassName(className));
    }

    /**
     * Get elements by selector
     */
    static querySelectorAll(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    /**
     * Create element with attributes and content
     */
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (content) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof HTMLElement) {
                element.appendChild(content);
            }
        }

        return element;
    }

    /**
     * Add event listener with error handling
     */
    static addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot add event listener to null element');
            return;
        }
        
        element.addEventListener(event, handler, options);
    }

    /**
     * Remove event listener
     */
    static removeEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot remove event listener from null element');
            return;
        }
        
        element.removeEventListener(event, handler, options);
    }

    /**
     * Add class to element
     */
    static addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    }

    /**
     * Remove class from element
     */
    static removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    }

    /**
     * Toggle class on element
     */
    static toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    }

    /**
     * Check if element has class
     */
    static hasClass(element, className) {
        return element && className && element.classList.contains(className);
    }

    /**
     * Set element style
     */
    static setStyle(element, property, value) {
        if (element && property) {
            element.style[property] = value;
        }
    }

    /**
     * Set multiple styles
     */
    static setStyles(element, styles) {
        if (element && styles) {
            Object.entries(styles).forEach(([property, value]) => {
                element.style[property] = value;
            });
        }
    }

    /**
     * Get element position relative to viewport
     */
    static getElementPosition(element) {
        if (!element) return { x: 0, y: 0 };
        
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Get mouse position relative to element
     */
    static getMousePosition(event, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Show/hide element
     */
    static show(element) {
        if (element) {
            element.style.display = '';
            this.removeClass(element, 'hidden');
        }
    }

    static hide(element) {
        if (element) {
            element.style.display = 'none';
            this.addClass(element, 'hidden');
        }
    }

    /**
     * Clear element content
     */
    static clearContent(element) {
        if (element) {
            element.innerHTML = '';
        }
    }

    /**
     * Animate element
     */
    static animate(element, className, duration = 300) {
        if (!element || !className) return;

        this.addClass(element, className);
        
        setTimeout(() => {
            this.removeClass(element, className);
        }, duration);
    }

    /**
     * Check if element is visible in viewport
     */
    static isInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

