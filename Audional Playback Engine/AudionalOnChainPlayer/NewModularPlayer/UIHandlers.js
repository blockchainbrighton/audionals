// UIHandlers.js
import { customLog } from './audioContextUtil.js';
import { playAudio } from './audioPlayback.js';

// Define sequenceData at the top level of the module
let sequenceData;

// Setup UI Handlers simplified by using optional chaining and removing redundant checks
const setupUIHandlers = () => {
    document.getElementById('playButton')?.addEventListener('click', () => {
        // Ensure `isLooping` is appropriately managed within the `playAudio` function or via global state
        playAudio();
    });
    // document.getElementById('stopButton')?.addEventListener('click', stopAudio);

    document.getElementById('fileInput')?.addEventListener('change', async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) throw new Error('No file selected');
            sequenceData = JSON.parse(await file.text()); // Set the global sequenceData
            validateAudioData(sequenceData);
            document.getElementById('playButton').disabled = false;
        } catch (err) {
            document.getElementById('playButton').disabled = true;
            customLog(`Error processing sequence data: ${err}`, true);
        }
    });
};

// Call setupUIHandlers to ensure it's executed
setupUIHandlers();

const validateAudioData = (data) => {
    if (!data.trimSettings || !data.projectSequences?.Sequence0?.ch0?.steps || data.projectSequences.Sequence0.ch0.steps.length !== 64 || !data.projectBPM) {
        throw new Error('Invalid or missing data in JSON');
    }
};

// Export a function to get the current value of `sequenceData`
export const getSequenceData = () => sequenceData;
