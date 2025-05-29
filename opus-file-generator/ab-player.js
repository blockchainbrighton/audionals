// ab-player.js

/**
 * Creates an A/B comparison player UI with looping functionality.
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
    abContainer.style.border = '1px solid #666';
    abContainer.style.padding = '15px';
    abContainer.style.backgroundColor = '#333';

    const title = document.createElement('h4');
    title.textContent = 'A/B Comparison Player';
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    abContainer.appendChild(title);

    const originalUrl = URL.createObjectURL(originalBlob);
    const convertedUrl = URL.createObjectURL(convertedBlob);

    const MIN_LOOP_DURATION = 1.0; // Minimum duration in seconds for looping to occur
    let isLoopingActive = false;   // State for our custom loop toggle

    // --- Create Audio Elements ---
    const audioOriginal = Object.assign(document.createElement('audio'), {
        src: originalUrl,
        controls: true,
        preload: 'metadata',
        style: 'width: 100%; margin-bottom: 5px;'
        // We'll manage the 'loop' property dynamically
    });
    audioOriginal.type = originalMimeType;

    const audioConverted = Object.assign(document.createElement('audio'), {
        src: convertedUrl,
        controls: true,
        preload: 'metadata',
        style: 'width: 100%;'
        // We'll manage the 'loop' property dynamically
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
    controlsDiv.style.alignItems = 'center'; // Align items vertically for better button row
    controlsDiv.style.gap = '10px';
    controlsDiv.style.marginBottom = '15px';

    const masterPlayPauseBtn = Object.assign(document.createElement('button'), {
        textContent: '▶️ Play A/B',
        className: 'button-small',
    });

    const abSwitchBtn = Object.assign(document.createElement('button'), {
        textContent: 'Listen to B (Converted)',
        className: 'button-small',
    });
    abSwitchBtn.dataset.listeningTo = 'original';

    const loopToggleBtn = Object.assign(document.createElement('button'), { // NEW Loop Button
        textContent: '🔁 Loop Off',
        className: 'button-small',
        title: `Enable looping (min duration: ${MIN_LOOP_DURATION}s)`
    });

    controlsDiv.append(masterPlayPauseBtn, abSwitchBtn, loopToggleBtn); // Added loopToggleBtn

    // --- Initial State ---
    audioOriginal.muted = false;
    audioConverted.muted = true;

    // --- Event Handlers for Master Controls ---
    masterPlayPauseBtn.onclick = () => {
        if (audioOriginal.paused && audioConverted.paused) {
            // If at the end and looping is off, reset time before playing
            if ((audioOriginal.ended || audioConverted.ended) && !isLoopingActive) {
                audioOriginal.currentTime = 0;
                audioConverted.currentTime = 0;
            }
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

    loopToggleBtn.onclick = () => { // NEW Loop Button Handler
        isLoopingActive = !isLoopingActive;
        audioOriginal.loop = isLoopingActive; // Also set native loop property
        audioConverted.loop = isLoopingActive;

        if (isLoopingActive) {
            loopToggleBtn.textContent = '🔁 Loop On';
            loopToggleBtn.style.backgroundColor = 'var(--accent-operational)'; // Indicate active state
            loopToggleBtn.style.color = '#111';
        } else {
            loopToggleBtn.textContent = '🔁 Loop Off';
            loopToggleBtn.style.backgroundColor = ''; // Reset to default style
            loopToggleBtn.style.color = '';
        }
        // If audio ended while loop was off, and now loop is on, and audio is paused at end
        if (isLoopingActive && masterPlayPauseBtn.textContent === '▶️ Play A/B' && (audioOriginal.ended || audioConverted.ended)) {
             // Optionally, you could auto-play here if desired, or just prepare for next play
             audioOriginal.currentTime = 0;
             audioConverted.currentTime = 0;
        }
    };

    // --- Sync Play/Pause/Ended States ---
    const syncPlayState = () => {
        masterPlayPauseBtn.textContent = (audioOriginal.paused && audioConverted.paused) ? '▶️ Play A/B' : '⏸️ Pause A/B';
    };

    const handlePlay = (audioElement) => {
        const otherAudio = audioElement === audioOriginal ? audioConverted : audioOriginal;
        if (otherAudio.paused) {
            // If one starts, ensure the other tries to play too, respecting current time
            if (Math.abs(audioElement.currentTime - otherAudio.currentTime) > 0.2) { // If significantly out of sync
                otherAudio.currentTime = audioElement.currentTime; // Sync before playing
            }
            otherAudio.play().catch(e => console.warn(`Sync play error for ${otherAudio === audioOriginal ? 'original' : 'converted'}:`, e));
        }
        syncPlayState();
    };

    const handlePause = (audioElement) => {
        const otherAudio = audioElement === audioOriginal ? audioConverted : audioOriginal;
        if (!otherAudio.paused) {
            otherAudio.pause();
        }
        syncPlayState();
    };

    audioOriginal.onplay = () => handlePlay(audioOriginal);
    audioConverted.onplay = () => handlePlay(audioConverted);
    audioOriginal.onpause = () => handlePause(audioOriginal);
    audioConverted.onpause = () => handlePause(audioConverted);

    const handleEnded = (endedAudio) => {
        const otherAudio = endedAudio === audioOriginal ? audioConverted : audioOriginal;

        // Ensure both are marked as paused for the UI
        if (!endedAudio.paused) endedAudio.pause();
        if (!otherAudio.paused && otherAudio.duration - otherAudio.currentTime < 0.5) { // If other is also near end
            otherAudio.pause();
        }
        
        syncPlayState(); // Update button to "Play"

        if (isLoopingActive) {
            // Check duration before looping
            const duration = endedAudio.duration; // or Math.min(audioOriginal.duration, audioConverted.duration)
            if (!isNaN(duration) && duration >= MIN_LOOP_DURATION) {
                audioOriginal.currentTime = 0;
                audioConverted.currentTime = 0;
                // Automatically play again if loop is on
                // Use a small timeout to allow browser to process 'ended' and 'pause' states
                setTimeout(() => {
                    if (masterPlayPauseBtn.textContent !== '⏸️ Pause A/B') { // Only play if master isn't already indicating pause
                        Promise.all([audioOriginal.play(), audioConverted.play()]).catch(e => {
                            console.error("Error re-playing A/B audio on loop:", e);
                        });
                    }
                }, 50); // Small delay
            } else {
                 console.log(`Looping skipped: audio duration (${duration}s) is less than MIN_LOOP_DURATION (${MIN_LOOP_DURATION}s) or NaN.`);
                 // Reset currentTime anyway so next manual play starts from beginning
                 audioOriginal.currentTime = 0;
                 audioConverted.currentTime = 0;
            }
        } else {
            // If not looping, just ensure currentTime is reset for next manual play
            audioOriginal.currentTime = 0;
            audioConverted.currentTime = 0;
        }
    };

    audioOriginal.onended = () => handleEnded(audioOriginal);
    audioConverted.onended = () => handleEnded(audioConverted);


    // --- Sync Seeking (currentTime) ---
    let isSeeking = false;

    const syncTime = (source, target) => {
        if (!isSeeking && Math.abs(source.currentTime - target.currentTime) > 0.2) { // Smaller threshold for seeking
            isSeeking = true;
            target.currentTime = source.currentTime;
            // Add a slight delay for the target to potentially buffer/react if it was paused
            setTimeout(() => {
                isSeeking = false;
                // If master play is active, ensure both are playing after seek
                if (masterPlayPauseBtn.textContent === '⏸️ Pause A/B') {
                    if (source.paused) source.play().catch(e=>console.warn("Seek-play error src", e));
                    if (target.paused) target.play().catch(e=>console.warn("Seek-play error target", e));
                }
            }, 50);
        } else if (isSeeking) {
            // If already seeking, reset flag after a short timeout if no further immediate seeks
            setTimeout(() => isSeeking = false, 100);
        }
    };
    
    // Use 'seeked' for primary sync. 'seeking' can be used too but 'seeked' is after operation completes.
    audioOriginal.addEventListener('seeked', () => syncTime(audioOriginal, audioConverted));
    audioConverted.addEventListener('seeked', () => syncTime(audioConverted, audioOriginal));
    
    // More aggressive sync on 'timeupdate' can be added but needs careful handling of 'isSeeking'
    // to avoid performance issues or race conditions, especially if both fire rapidly.
    // For now, 'seeked' is safer.

    // --- Cleanup ---
    const observer = new MutationObserver((mutationsList, obs) => {
        for (const mutation of mutationsList) {
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(node => {
                    if (node === abContainer) {
                        URL.revokeObjectURL(originalUrl);
                        URL.revokeObjectURL(convertedUrl);
                        obs.disconnect();
                    }
                });
            }
        }
    });
    abContainer.revokeUrls = () => {
        URL.revokeObjectURL(originalUrl);
        URL.revokeObjectURL(convertedUrl);
        audioOriginal.src = ''; // Release resources
        audioConverted.src = '';
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

    labelOriginal.style.opacity = '1';
    labelConverted.style.opacity = '0.6';

    return abContainer;
};