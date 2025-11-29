/**
 * audioContext.js
 * Manages the creation and retrieval of the Web Audio API AudioContext.
 */

let audioContextInstance = null;

export function createAudioContext() {
    if (audioContextInstance) {
        return audioContextInstance;
    }

    const WebAudioContext = window.AudioContext || window.webkitAudioContext;

    if (WebAudioContext) {
        try {
            audioContextInstance = new WebAudioContext();
            if (audioContextInstance) {
                console.log(`AudioContext created. Initial state: ${audioContextInstance.state}`);

                // Handle state changes (e.g., interrupted context)
                 audioContextInstance.onstatechange = () => {
                     console.log(`AudioContext state changed to: ${audioContextInstance.state}`);
                 };

                // Attempt to resume if suspended (often requires user interaction)
                if (audioContextInstance.state === 'suspended') {
                    const resumeContext = async () => {
                        try {
                            await audioContextInstance.resume();
                            console.log(`AudioContext resumed successfully. State: ${audioContextInstance.state}`);
                        } catch (e) {
                            console.error("Could not resume AudioContext:", e);
                            // Optionally alert the user or provide a button to retry resuming
                        }
                        // Remove the event listener after the first interaction attempt
                        document.body.removeEventListener('click', resumeContext, { once: true });
                        document.body.removeEventListener('touchend', resumeContext, { once: true });
                        document.body.removeEventListener('keydown', resumeContext, { once: true });
                    };
                    console.warn("AudioContext is suspended. Waiting for user interaction to resume.");
                    // Listen for the first user interaction to try resuming
                    document.body.addEventListener('click', resumeContext, { once: true });
                    document.body.addEventListener('touchend', resumeContext, { once: true });
                    document.body.addEventListener('keydown', resumeContext, { once: true });
                 }

                return audioContextInstance;
            }
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
            audioContextInstance = null;
        }
    } else {
        console.warn("Web Audio API not supported by this browser.");
        audioContextInstance = null;
    }
    return null;
}

export function getAudioContext() {
    return audioContextInstance;
}