// audio-processing/audioContextManager.js
import { showError } from '../uiUpdater.js'; // Adjust path as needed

let audioContextInstance = null;
let mainGainNodeInstance = null;

export function setupAudioContext(initialVolume = 1) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
        const errorMsg = 'AudioContext not supported by this browser.';
        showError(errorMsg);
        throw new Error(errorMsg);
    }
    // Ensure any existing context is properly closed before creating a new one
    if (audioContextInstance && audioContextInstance.state !== 'closed') {
        audioContextInstance.close().catch(e => console.warn("Error closing previous AudioContext:", e));
    }

    audioContextInstance = new Ctx();
    mainGainNodeInstance = audioContextInstance.createGain();
    mainGainNodeInstance.gain.setValueAtTime(initialVolume, audioContextInstance.currentTime);
    mainGainNodeInstance.connect(audioContextInstance.destination);
    
    return { audioContext: audioContextInstance, mainGainNode: mainGainNodeInstance };
}

export function getAudioContext() {
    return audioContextInstance;
}

export function getMainGainNode() {
    return mainGainNodeInstance;
}

export async function ensureAudioContextActive() {
    if (!audioContextInstance) {
        showError('Audio system not ready.');
        return false;
    }
    if (audioContextInstance.state === 'suspended') {
        try {
            await audioContextInstance.resume();
        } catch (e) {
            showError('Could not resume audio.');
            console.error('Could not resume audio:', e);
            return false;
        }
    }
    return true;
}

export function getAudioContextState() {
    return audioContextInstance?.state || 'unavailable';
}

export function closeAudioContext() {
    if (audioContextInstance && audioContextInstance.state !== 'closed') {
        audioContextInstance.close().catch(e => console.warn("Error closing AudioContext:", e));
    }
    audioContextInstance = null;
    mainGainNodeInstance = null;
}