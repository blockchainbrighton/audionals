/**
 * Module: components/synth-ui-components.js
 * Purpose: Lightweight custom element wrapper around the shared BOP synth UI.
 * Exports: BopSynthUIComponent
 */

import { BopSynthUI } from '../synth/synth-ui.js';
import { createSynthTemplate, getUIElements } from '../synth/synth-layout.js';

const SHARED_TEMPLATE = (() => {
    const template = createSynthTemplate();
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../synth/synth-styles.css', import.meta.url).toString();
    template.content.prepend(stylesheet);
    return template;
})();

export class BopSynthUIComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(SHARED_TEMPLATE.content.cloneNode(true));
        this.uiController = null;
        this._logicController = null;
    }

    /**
     * Connect the custom element to an existing logic controller instance.
     * @param {BopSynthLogic} logicController
     */
    connect(logicController) {
        if (!logicController) {
            throw new Error('A valid logicController must be provided to connect().');
        }

        if (this.uiController) {
            this.uiController.destroy();
            this.uiController = null;
        }

        const uiElements = getUIElements(this.shadowRoot);
        this.uiController = new BopSynthUI(logicController, uiElements);
        this._logicController = logicController;
    }

    disconnectedCallback() {
        if (this.uiController) {
            this.uiController.destroy();
            this.uiController = null;
        }
        if (this._logicController?.disconnectUI) {
            this._logicController.disconnectUI();
        }
        this._logicController = null;
    }
}

window.customElements.define('bop-synth-ui', BopSynthUIComponent);
