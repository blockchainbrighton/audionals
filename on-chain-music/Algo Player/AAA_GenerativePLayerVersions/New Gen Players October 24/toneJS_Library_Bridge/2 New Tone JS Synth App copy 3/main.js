// main.js

import { SynthController } from './synthController.js';
import { Arpeggiator } from './arpeggiator.js';
// Removed: import { Scales } from './scales.js';

document.addEventListener('tonejsLoaded', () => {
    // Instantiate SynthController
    const synthController = new SynthController();

    // Instantiate Arpeggiator with reference to SynthController
    const arpeggiator = new Arpeggiator(synthController);

    // Removed: const scales = new Scales(synthController);

    // Link Arpeggiator to SynthController
    synthController.arpeggiator = arpeggiator;
});