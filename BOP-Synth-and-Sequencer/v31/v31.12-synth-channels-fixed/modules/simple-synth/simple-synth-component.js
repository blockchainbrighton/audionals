import { SimpleSynthUI } from './simple-synth-ui.js';
import { createSimpleSynthTemplate, getSimpleSynthUIElements } from './simple-synth-layout.js';

const HTMLElementBase = (typeof HTMLElement !== 'undefined') ? HTMLElement : class {};
let sharedTemplate = null;

function resolveDocument(context) {
    if (context?.ownerDocument) return context.ownerDocument;
    if (typeof document !== 'undefined') return document;
    return null;
}

function ensureTemplate(context) {
    if (sharedTemplate) return sharedTemplate;
    const doc = resolveDocument(context);
    if (!doc) throw new Error('SimpleSynthUIComponent requires a document to render.');
    const template = createSimpleSynthTemplate(doc);
    const stylesheet = doc.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./simple-synth-styles.css', import.meta.url).toString();
    template.content.prepend(stylesheet);
    sharedTemplate = template;
    return sharedTemplate;
}

export class SimpleSynthUIComponent extends HTMLElementBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const template = ensureTemplate(this);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.uiController = null;
        this._logicController = null;
    }

    connect(logicController) {
        if (!logicController) throw new Error('SimpleSynthUIComponent.connect requires a logic instance.');
        if (this.uiController) {
            this.uiController.destroy();
            this.uiController = null;
        }
        const uiElements = getSimpleSynthUIElements(this.shadowRoot);
        this.uiController = new SimpleSynthUI(logicController, uiElements);
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

let registered = false;

export function registerSimpleSynthUI(globalScope = globalThis) {
    if (registered) return;
    const registry = globalScope?.customElements;
    if (!registry || typeof registry.define !== 'function') {
        throw new Error('Custom elements registry unavailable for <simple-synth-ui>.');
    }
    if (!registry.get('simple-synth-ui')) {
        registry.define('simple-synth-ui', SimpleSynthUIComponent);
    }
    registered = true;
}
