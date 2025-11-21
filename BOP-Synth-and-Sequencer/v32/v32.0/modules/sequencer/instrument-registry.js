import { BopSynthLogic } from '../synth/synth-logic.js';
import { registerBopSynthUI } from '../components/synth-ui-components.js';
import { SimpleSynthLogic } from '../simple-synth/simple-synth-logic.js';
import { registerSimpleSynthUI } from '../simple-synth/simple-synth-component.js';

export const INSTRUMENT_LIBRARY = [
    {
        id: 'bop',
        label: 'BOP Synth',
        description: 'Full workstation synth with recording + piano roll.',
        createLogic: Tone => new BopSynthLogic(Tone),
        ensureUI: () => registerBopSynthUI(),
        tagName: 'bop-synth-ui',
        supportsRecording: true
    },
    {
        id: 'simple',
        label: 'Simple Synth',
        description: 'Lightweight playable synth with quick controls.',
        createLogic: Tone => new SimpleSynthLogic(Tone),
        ensureUI: () => registerSimpleSynthUI(),
        tagName: 'simple-synth-ui',
        supportsRecording: false
    }
];

export const DEFAULT_INSTRUMENT_TYPE = INSTRUMENT_LIBRARY[0].id;

export function getInstrumentDefinition(type = DEFAULT_INSTRUMENT_TYPE) {
    return INSTRUMENT_LIBRARY.find(entry => entry.id === type) || INSTRUMENT_LIBRARY[0];
}

export function listInstrumentOptions() {
    return INSTRUMENT_LIBRARY.map(({ id, label }) => ({ id, label }));
}

export function instrumentSupportsRecording(type) {
    return !!getInstrumentDefinition(type)?.supportsRecording;
}
