// js/module_factory/module_dom.js

/**
 * Creates the basic DOM element for a module.
 * @param {string} id - The unique ID for the module.
 * @param {string} type - The type of the module.
 * @param {number} x - The initial x-coordinate.
 * @param {number} y - The initial y-coordinate.
 * @returns {HTMLElement} The main module div element.
 */
export function createModuleShell(id, type, x, y) {
    const mod = document.createElement('div');
    mod.className = 'module';
    mod.id = id;
    mod.style.left = x + 'px';
    mod.style.top = y + 'px';
    mod.dataset.type = type;
    return mod;
  }
  
  /**
   * Creates the header element for a module.
   * @param {string} type - The type of the module.
   * @returns {HTMLElement} The header element.
   */
  export function createModuleHeader(type) {
    const header = document.createElement('header');
    header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    return header;
  }