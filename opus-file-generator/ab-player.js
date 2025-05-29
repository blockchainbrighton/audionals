// ab-player.js

/**
 * Creates an A/B comparison player UI.
 * @param {Blob} originalBlob - The original audio blob.
 * @param {string} originalMimeType - MIME type of the original audio.
 * @param {Blob} convertedBlob - The converted audio blob (WebM/Opus).
 * @param {string} convertedMimeType - MIME type of the converted audio.
 * @returns {HTMLElement} A div container with the A/B player.
 */
const createABPlayerUI = (originalBlob, originalMimeType, convertedBlob, convertedMimeType) => {
    const abContainer = document.createElement('div');
    abContainer.className = 'ab-player-container';
    abContainer.style.marginTop = '20px';
    abContainer.style.border = '1px solid #666'; // Example style
    abContainer.style.padding = '15px';
    abContainer.style.backgroundColor = '#333'; // Darker background for this section

    const title = document.createElement('h4');
    title.textContent = 'A/B Comparison Player';
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    abContainer.appendChild(title);

    const originalUrl = URL.createObjectURL(originalBlob);
    const convertedUrl = URL.createObjectURL(convertedBlob);

    // --- Create Audio Elements ---
    const audioOriginal = Object.assign(document.createElement('audio'), {
        src: originalUrl,
        controls: true, // Show native controls for individual seeking/volume
        preload: 'metadata',
        style: 'width: 100%; margin-bottom: 5px;'
    });
    audioOriginal.type = originalMimeType;

    const audioConverted = Object.assign(document.createElement('audio'), {
        src: convertedUrl,
        controls: true,
        preload: 'metadata',
        style: 'width: 100%;'
    });
    audioConverted.type = convertedMimeType;

    // --- Labels for Players ---
    const labelOriginal = document.createElement('p');
    labelOriginal.textContent = 'A: Original Audio';
    labelOriginal.style.fontWeight = 'bold';

    const labelConverted = document.createElement('p');
    labelConverted.textContent = 'B: Converted Audio (WebM/Opus)';
    labelConverted.style.fontWeight = 'bold';


    // --- Master Controls ---
    const controlsDiv = document.createElement('div');
    controlsDiv.style.display = 'flex';
    controlsDiv.style.justifyContent = 'center';
    controlsDiv.style.gap = '10px';
    controlsDiv.style.marginBottom = '15px';

    const masterPlayPauseBtn = Object.assign(document.createElement('button'), {
        textContent: '▶️ Play A/B',
        className: 'button-small', // Or your existing button class
    });

    const abSwitchBtn = Object.assign(document.createElement('button'), {
        textContent: 'Listen to B (Converted)',
        className: 'button-small',
    });
    abSwitchBtn.dataset.listeningTo = 'original'; // Initially listening to original

    controlsDiv.append(masterPlayPauseBtn, abSwitchBtn);

    // --- Initial State ---
    audioOriginal.muted = false; // Start by listening to original
    audioConverted.muted = true;

    // --- Event Handlers for Master Controls ---
    masterPlayPauseBtn.onclick = () => {
        if (audioOriginal.paused && audioConverted.paused) {
            // Play both, but only one will be audible
            Promise.all([audioOriginal.play(), audioConverted.play()]).catch(e => {
                console.error("Error playing A/B audio:", e);
                masterPlayPauseBtn.textContent = 'Error';
            });
        } else {
            audioOriginal.pause();
            audioConverted.pause();
        }
    };

    abSwitchBtn.onclick = () => {
        if (abSwitchBtn.dataset.listeningTo === 'original') {
            audioOriginal.muted = true;
            audioConverted.muted = false;
            abSwitchBtn.textContent = 'Listen to A (Original)';
            abSwitchBtn.dataset.listeningTo = 'converted';
            labelOriginal.style.opacity = '0.6';
            labelConverted.style.opacity = '1';
        } else {
            audioOriginal.muted = false;
            audioConverted.muted = true;
            abSwitchBtn.textContent = 'Listen to B (Converted)';
            abSwitchBtn.dataset.listeningTo = 'original';
            labelOriginal.style.opacity = '1';
            labelConverted.style.opacity = '0.6';
        }
    };

    // --- Sync Play/Pause/Ended States ---
    const syncPlayState = () => {
        masterPlayPauseBtn.textContent = (audioOriginal.paused && audioConverted.paused) ? '▶️ Play A/B' : '⏸️ Pause A/B';
    };
    audioOriginal.onplay = audioConverted.onplay = () => {
        // If one starts (e.g. via native controls), ensure the other tries to play too to keep them in sync
        if (audioOriginal.paused) audioOriginal.play().catch(e => console.warn("Sync play error original:", e));
        if (audioConverted.paused) audioConverted.play().catch(e => console.warn("Sync play error converted:", e));
        syncPlayState();
    };
    audioOriginal.onpause = audioConverted.onpause = () => {
        // If one pauses, pause the other
        if (!audioOriginal.paused) audioOriginal.pause();
        if (!audioConverted.paused) audioConverted.pause();
        syncPlayState();
    };
    audioOriginal.onended = audioConverted.onended = () => {
        // If one ends, treat it as both paused for the master button
        if (!audioOriginal.paused) audioOriginal.pause();
        if (!audioConverted.paused) audioConverted.pause();
        audioOriginal.currentTime = 0; // Reset
        audioConverted.currentTime = 0; // Reset
        syncPlayState();
    };

    // --- Sync Seeking (currentTime) ---
    let isSeeking = false; // Prevent seek loops

    const syncTime = (source, target) => {
        if (!isSeeking && Math.abs(source.currentTime - target.currentTime) > 0.5) { // Threshold to avoid rapid updates
            isSeeking = true;
            target.currentTime = source.currentTime;
            setTimeout(() => isSeeking = false, 100); // Reset seeking flag
        }
    };

    audioOriginal.addEventListener('seeked', () => syncTime(audioOriginal, audioConverted));
    audioConverted.addEventListener('seeked', () => syncTime(audioConverted, audioOriginal));
    // Also sync on timeupdate for more responsive seeking, but be careful with performance
    // audioOriginal.addEventListener('timeupdate', () => syncTime(audioOriginal, audioConverted));
    // audioConverted.addEventListener('timeupdate', () => syncTime(audioConverted, audioOriginal));


    // --- Cleanup ---
    // Use MutationObserver similar to createAudioPlayer to revoke URLs when removed
    const observer = new MutationObserver((mutationsList, obs) => {
        for (const mutation of mutationsList) {
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(node => {
                    if (node === abContainer) {
                        URL.revokeObjectURL(originalUrl);
                        URL.revokeObjectURL(convertedUrl);
                        // console.log('Revoked Blob URLs for A/B player');
                        obs.disconnect();
                    }
                });
            }
        }
    });
    // Start observing after appending to parent: abContainer.startObserving = (parent) => observer.observe(parent, { childList: true });
    // Or add a manual cleanup function:
    abContainer.revokeUrls = () => {
        URL.revokeObjectURL(originalUrl);
        URL.revokeObjectURL(convertedUrl);
        observer.disconnect();
    };


    // --- Assemble UI ---
    abContainer.append(
        controlsDiv,
        labelOriginal,
        audioOriginal,
        labelConverted,
        audioConverted
    );

    // Set initial label opacity
    labelOriginal.style.opacity = '1';
    labelConverted.style.opacity = '0.6';

    return abContainer;
};