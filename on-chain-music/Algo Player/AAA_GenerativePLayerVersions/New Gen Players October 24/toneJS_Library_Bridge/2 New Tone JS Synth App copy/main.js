// main.js

import { SynthController } from './synthController.js';
import { Arpeggiator } from './arpeggiator.js';

// Only proceed once the DOM and Tone.js are fully loaded
document.addEventListener('tonejsLoaded', () => {
    const synthController = new SynthController();
    const arpeggiator = new Arpeggiator(synthController);
    synthController.arpeggiator = arpeggiator;

    console.log('SynthController and Arpeggiator initialized.');
});
