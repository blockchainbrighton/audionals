/**
 * Module: components/synth-ui-components.js
 * Purpose: Lightweight custom element wrapper around the shared BOP synth UI.
 * Exports: BopSynthUIComponent
 */

import { BopSynthUI } from '../synth/synth-ui.js';
import { createSynthTemplate, getUIElements } from '../synth/synth-layout.js';

const HTMLElementBase = (typeof HTMLElement !== 'undefined') ? HTMLElement : class {};
let sharedTemplate = null;

function resolveDocument(context) {
    if (context && typeof context.createElement === 'function') {
        return context;
    }
    if (context?.ownerDocument) {
        return resolveDocument(context.ownerDocument);
    }
    if (typeof document !== 'undefined' && document) {
        return document;
    }
    return null;
}

function ensureSharedTemplate(context) {
    if (sharedTemplate) {
        return sharedTemplate;
    }
    const doc = resolveDocument(context);
    if (!doc) {
        throw new Error('BopSynthUIComponent requires a document to create its template.');
    }
    const template = createSynthTemplate(doc);
    const stylesheet = doc.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../synth/synth-styles.css', import.meta.url).toString();
    template.content.prepend(stylesheet);
    sharedTemplate = template;
    return sharedTemplate;
}

export class BopSynthUIComponent extends HTMLElementBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const template = ensureSharedTemplate(this);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
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

let isRegistered = false;

export function registerBopSynthUI(globalScope = globalThis) {
    if (isRegistered) return;
    const registry = globalScope?.customElements;
    if (!registry || typeof registry.define !== 'function') {
        throw new Error('Custom element registry is not available to register <bop-synth-ui>.');
    }
    if (!registry.get('bop-synth-ui')) {
        registry.define('bop-synth-ui', BopSynthUIComponent);
    }
    isRegistered = true;
}
