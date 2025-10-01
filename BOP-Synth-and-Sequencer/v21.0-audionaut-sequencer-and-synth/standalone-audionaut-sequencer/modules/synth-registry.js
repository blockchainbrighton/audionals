import { SYNTH_MANIFEST_PATH } from './sequencer-config.js';

const registryState = {
    manifestUrl: new URL(SYNTH_MANIFEST_PATH, import.meta.url),
    manifestLoaded: false,
    entries: [],
    definitions: new Map(),
    uiModulesLoaded: new Map()
};

async function ensureManifestLoaded() {
    if (registryState.manifestLoaded) {
        return registryState.entries;
    }
    const response = await fetch(registryState.manifestUrl);
    if (!response.ok) {
        throw new Error(`Failed to load synth manifest: HTTP ${response.status}`);
    }
    registryState.entries = await response.json();
    registryState.manifestLoaded = true;
    return registryState.entries;
}

function resolveModuleUrl(relativePath) {
    return new URL(relativePath, registryState.manifestUrl);
}

export async function listAvailableSynths() {
    const entries = await ensureManifestLoaded();
    return entries.map(entry => ({
        id: entry.id,
        name: entry.name || entry.id,
        description: entry.description || ''
    }));
}

async function loadLogicConstructor(entry) {
    const moduleUrl = resolveModuleUrl(entry.logicModule);
    const module = await import(moduleUrl);
    if (entry.logicExport) {
        if (!module[entry.logicExport]) {
            throw new Error(`Synth logic module missing export "${entry.logicExport}" for synth ${entry.id}`);
        }
        return module[entry.logicExport];
    }
    if (module.default) {
        return module.default;
    }
    throw new Error(`Synth logic module for ${entry.id} has no usable export.`);
}

async function ensureUiModuleLoaded(entry) {
    if (!entry.uiModule) {
        return;
    }
    if (registryState.uiModulesLoaded.has(entry.uiModule)) {
        return;
    }
    const moduleUrl = resolveModuleUrl(entry.uiModule);
    await import(moduleUrl);
    registryState.uiModulesLoaded.set(entry.uiModule, true);
}

function capturePatch(logic, entry) {
    if (!logic) return null;
    if (entry.captureMethod && typeof logic[entry.captureMethod] === 'function') {
        return logic[entry.captureMethod]();
    }
    if (typeof logic.getFullState === 'function') {
        return logic.getFullState();
    }
    console.warn(`[synth-registry] Synth ${entry.id} does not expose a capture method. Returning null.`);
    return null;
}

function applyPatch(logic, patch, entry) {
    if (!logic || !patch) {
        return;
    }
    if (entry.applyMethod && typeof logic[entry.applyMethod] === 'function') {
        logic[entry.applyMethod](patch);
        return;
    }
    if (typeof logic.loadFullState === 'function') {
        logic.loadFullState(patch);
        return;
    }
    console.warn(`[synth-registry] Synth ${entry.id} does not expose an apply method. Patch ignored.`);
}

function resolveOutputNode(logic, entry) {
    if (!logic) return null;
    if (entry.outputMethod && typeof logic[entry.outputMethod] === 'function') {
        return logic[entry.outputMethod]();
    }
    if (logic.modules?.synthEngine?.getOutputNode) {
        return logic.modules.synthEngine.getOutputNode();
    }
    if (typeof logic.getOutputNode === 'function') {
        return logic.getOutputNode();
    }
    console.warn(`[synth-registry] Synth ${entry.id} does not expose an audio output node.`);
    return null;
}

export async function getSynthDefinition(synthId) {
    if (!synthId) {
        throw new Error('No synthId provided to getSynthDefinition');
    }
    await ensureManifestLoaded();
    if (registryState.definitions.has(synthId)) {
        return registryState.definitions.get(synthId);
    }
    const entry = registryState.entries.find(item => item.id === synthId);
    if (!entry) {
        throw new Error(`Synth with id "${synthId}" not found in manifest.`);
    }

    const LogicCtor = await loadLogicConstructor(entry);

    const definition = {
        id: entry.id,
        name: entry.name || entry.id,
        description: entry.description || '',
        async createLogic(Tone) {
            return new LogicCtor(Tone);
        },
        async createUIElement(logic) {
            await ensureUiModuleLoaded(entry);
            if (!entry.elementTag) {
                return null;
            }
            const element = document.createElement(entry.elementTag);
            if (typeof element.connect === 'function') {
                element.connect(logic);
            }
            if (typeof logic.connectUI === 'function' && element.uiController) {
                logic.connectUI(element.uiController);
            }
            return element;
        },
        capturePatch(logic) {
            return capturePatch(logic, entry);
        },
        applyPatch(logic, patch) {
            applyPatch(logic, patch, entry);
        },
        getOutputNode(logic) {
            return resolveOutputNode(logic, entry);
        }
    };

    registryState.definitions.set(synthId, definition);
    return definition;
}
