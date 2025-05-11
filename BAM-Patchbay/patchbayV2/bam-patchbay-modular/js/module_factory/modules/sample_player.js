// js/module_factory/modules/sample_player.js
import { audioCtx } from '../../audio_context.js';

/**
 * Creates a Sample Player module.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @param {string} moduleId - The ID of the module for logging.
 * @returns {object} Module data including audioNode, play method, etc.
 */
export function createSamplePlayerModule(parentElement, moduleId) { // Added moduleId
    let audioBuffer = null;
    const outputNode = audioCtx.createGain();

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.style.display = 'block';

    const waveformCanvas = document.createElement('canvas');
    waveformCanvas.width = 150;
    waveformCanvas.height = 40;
    waveformCanvas.style.border = '1px solid #555';
    parentElement.appendChild(waveformCanvas);

    function drawWaveform() {
        if (!audioBuffer || !waveformCanvas) return;
        const canvasCtx = waveformCanvas.getContext('2d');
        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.strokeStyle = '#fff';
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, amp);

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            canvasCtx.lineTo(i, (1 + min) * amp);
            canvasCtx.lineTo(i, (1 + max) * amp);
        }
        canvasCtx.stroke();
    }

    async function loadAudioBufferFromFile(file) {
        console.log(`SamplePlayer (ID: ${moduleId}): Loading audio from file:`, file.name);
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = async (e) => {
                try {
                    const decodedBuffer = await audioCtx.decodeAudioData(e.target.result);
                    audioBuffer = decodedBuffer;
                    console.log(`SamplePlayer (ID: ${moduleId}): Audio decoded successfully. Duration: ${audioBuffer.duration}s`);
                    drawWaveform();
                    resolve(audioBuffer);
                } catch (err) {
                    console.error(`SamplePlayer (ID: ${moduleId}): Error decoding audio data:`, err);
                    audioBuffer = null; // Ensure buffer is null on error
                    reject(err);
                }
            };
            fileReader.onerror = (err) => {
                console.error(`SamplePlayer (ID: ${moduleId}): FileReader error:`, err);
                audioBuffer = null;
                reject(err);
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadAudioBufferFromFile(e.target.files[0])
                .catch(err => alert(`Failed to load audio file for module ${moduleId}. See console for details.`));
        }
    });
    parentElement.appendChild(fileInput);

    function play() {
        console.log(`--- INSIDE SamplePlayer (ID: ${moduleId}) play() ---`); // VERY FIRST LINE

        if (!audioBuffer) {
            console.warn(`SamplePlayer (ID: ${moduleId}): Play called, but no audioBuffer loaded.`);
            return;
        }

        if (audioCtx.state === 'suspended') {
            console.warn(`SamplePlayer (ID: ${moduleId}): AudioContext is suspended. Attempting to resume...`);
            // It's important that resume() is often triggered by a direct user gesture.
            // A trigger from the sequencer might not be direct enough for some browsers
            // if the initial play of the sequencer wasn't the *very first* user interaction
            // that could have resumed the context.
            audioCtx.resume().then(() => {
                console.log(`SamplePlayer (ID: ${moduleId}): AudioContext resumed.`);
                // Consider re-calling play or letting the next trigger try again.
                // For now, we'll proceed assuming it might resume in time for source.start().
            }).catch(err => {
                console.error(`SamplePlayer (ID: ${moduleId}): Error resuming AudioContext:`, err);
                // If resume fails, playback will likely fail.
            });
            // Even if suspended, we try to set up the source. It might fail at source.start()
            // or play silently if context doesn't resume.
        }

        console.log(`SamplePlayer (ID: ${moduleId}): play() proceeding. Buffer duration: ${audioBuffer.duration}s`);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputNode);
        console.log(`SamplePlayer (ID: ${moduleId}): AudioBufferSourceNode created and connected to outputNode.`);
        try {
            source.start(0);
            console.log(`SamplePlayer (ID: ${moduleId}): source.start(0) called.`);
        } catch (e) {
            console.error(`SamplePlayer (ID: ${moduleId}): Error calling source.start(0):`, e);
            // This can happen if the context is still suspended or another issue occurs.
            source.disconnect(); // Clean up if start fails
            return;
        }


        waveformCanvas.style.borderColor = 'lime';
        source.onended = () => {
            console.log(`SamplePlayer (ID: ${moduleId}): Sample finished playing or source stopped.`);
            waveformCanvas.style.borderColor = '#555';
            // It's good practice to disconnect the source node once it's finished playing.
            // Check if it's still connected before disconnecting.
            try {
                 outputNode.disconnect(source); // Disconnect specific source from gain
            } catch(e) {
                // If already disconnected or error, just log
                // console.warn(`SamplePlayer (ID: ${moduleId}): Minor issue disconnecting source onended:`, e);
            }
            // Or, more simply, if the source is only ever connected to outputNode:
            // source.disconnect(); // This disconnects all outputs of the source.
        };
    }

    return {
        id: moduleId, // Store id for logging
        type: 'samplePlayer', // Explicitly set type
        audioNode: outputNode,
        play: play,
        loadAudioBuffer: loadAudioBufferFromFile,
        element: parentElement
    };
}