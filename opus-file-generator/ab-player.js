// ab-player.js

/**
 * Creates an A/B comparison player UI with improved synchronization and looping.
 */
const createABPlayerUI = (originalBlob, originalMimeType, convertedBlob, convertedMimeType) => {
    const abContainer = document.createElement('div');
    // ... (abContainer setup remains the same) ...
    abContainer.className = 'ab-player-container';
    abContainer.style.marginTop = '20px';
    abContainer.style.border = '1px solid #666';
    abContainer.style.padding = '15px';
    abContainer.style.backgroundColor = '#333';


    const title = document.createElement('h4');
    // ... (title setup remains the same) ...
    title.textContent = 'A/B Comparison Player';
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    abContainer.appendChild(title);


    const originalUrl = URL.createObjectURL(originalBlob);
    const convertedUrl = URL.createObjectURL(convertedBlob);

    const MIN_LOOP_DURATION = 1.0;
    let isLoopingActive = false;

    let masterAudio = null; // To designate one audio as the time source
    let slaveAudio = null;

    let manualSeekInProgress = false; // Flag for our own syncTime
    let externalSeekInProgress = false; // Flag for seeks triggered by native controls


    // --- Create Audio Elements ---
    const audioOriginal = Object.assign(document.createElement('audio'), {
        src: originalUrl,
        controls: true,
        preload: 'auto', // Changed to 'auto' for potentially better buffering for sync
        style: 'width: 100%; margin-bottom: 5px;'
    });
    audioOriginal.type = originalMimeType;

    const audioConverted = Object.assign(document.createElement('audio'), {
        src: convertedUrl,
        controls: true,
        preload: 'auto', // Changed to 'auto'
        style: 'width: 100%;'
    });
    audioConverted.type = convertedMimeType;

    // --- Labels and Master Controls (remain largely the same) ---
    const labelOriginal = document.createElement('p');
    labelOriginal.textContent = 'A: Original Audio';
    labelOriginal.style.fontWeight = 'bold';

    const labelConverted = document.createElement('p');
    labelConverted.textContent = 'B: Converted Audio (WebM/Opus)';
    labelConverted.style.fontWeight = 'bold';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'ab-player-master-controls'; // Added class for better CSS targeting
    controlsDiv.style.display = 'flex';
    controlsDiv.style.justifyContent = 'center';
    controlsDiv.style.alignItems = 'center';
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

    const loopToggleBtn = Object.assign(document.createElement('button'), {
        textContent: '🔁 Loop Off',
        className: 'button-small',
        title: `Enable looping (min duration: ${MIN_LOOP_DURATION}s)`
    });

    controlsDiv.append(masterPlayPauseBtn, abSwitchBtn, loopToggleBtn);

    // --- Initial State ---
    audioOriginal.muted = false;
    audioConverted.muted = true;
    masterAudio = audioOriginal; // Designate a default master
    slaveAudio = audioConverted;

    // --- Core Play/Pause/Seek Logic ---
    const playBoth = () => {
        // Ensure they are reasonably close in time before playing
        if (Math.abs(masterAudio.currentTime - slaveAudio.currentTime) > 0.1) {
            slaveAudio.currentTime = masterAudio.currentTime;
        }
        return Promise.all([audioOriginal.play(), audioConverted.play()]);
    };

    const pauseBoth = () => {
        audioOriginal.pause();
        audioConverted.pause();
    };

    masterPlayPauseBtn.onclick = () => {
        if (audioOriginal.paused && audioConverted.paused) {
            if ((audioOriginal.ended || audioConverted.ended) && !isLoopingActive) {
                audioOriginal.currentTime = 0;
                audioConverted.currentTime = 0;
            }
            playBoth().catch(e => {
                console.error("Error playing A/B audio:", e);
                masterPlayPauseBtn.textContent = 'Error';
            });
        } else {
            pauseBoth();
        }
    };

    abSwitchBtn.onclick = () => {
        const wasPlaying = !audioOriginal.paused; // Check before muting
        if (abSwitchBtn.dataset.listeningTo === 'original') {
            audioOriginal.muted = true;
            audioConverted.muted = false;
            masterAudio = audioConverted; // Switch master clock
            slaveAudio = audioOriginal;
            abSwitchBtn.textContent = 'Listen to A (Original)';
            abSwitchBtn.dataset.listeningTo = 'converted';
            labelOriginal.style.opacity = '0.6';
            labelConverted.style.opacity = '1';
        } else {
            audioOriginal.muted = false;
            audioConverted.muted = true;
            masterAudio = audioOriginal; // Switch master clock
            slaveAudio = audioConverted;
            abSwitchBtn.textContent = 'Listen to B (Converted)';
            abSwitchBtn.dataset.listeningTo = 'original';
            labelOriginal.style.opacity = '1';
            labelConverted.style.opacity = '0.6';
        }
        // If they were playing, ensure the new master continues driving the slave's time
        if (wasPlaying && masterAudio && slaveAudio) {
            if (Math.abs(masterAudio.currentTime - slaveAudio.currentTime) > 0.1) {
                 slaveAudio.currentTime = masterAudio.currentTime;
            }
        }
    };
    
    loopToggleBtn.onclick = () => { /* ... (loop toggle logic remains the same) ... */
        isLoopingActive = !isLoopingActive;
        audioOriginal.loop = isLoopingActive; 
        audioConverted.loop = isLoopingActive;

        if (isLoopingActive) {
            loopToggleBtn.textContent = '🔁 Loop On';
            loopToggleBtn.style.backgroundColor = 'var(--accent-operational)'; 
            loopToggleBtn.style.color = '#111';
        } else {
            loopToggleBtn.textContent = '🔁 Loop Off';
            loopToggleBtn.style.backgroundColor = ''; 
            loopToggleBtn.style.color = '';
        }
        if (isLoopingActive && masterPlayPauseBtn.textContent === '▶️ Play A/B' && (audioOriginal.ended || audioConverted.ended)) {
             audioOriginal.currentTime = 0;
             audioConverted.currentTime = 0;
        }
    };


    // --- Sync UI State ---
    const updatePlayPauseButtonUI = () => {
        // UI button should reflect if *either* is playing, or both are paused
        if (!audioOriginal.paused || !audioConverted.paused) {
            masterPlayPauseBtn.textContent = '⏸️ Pause A/B';
        } else {
            masterPlayPauseBtn.textContent = '▶️ Play A/B';
        }
    };

    // --- Event Handlers for individual audio elements ---
    [audioOriginal, audioConverted].forEach(audio => {
        audio.onplay = () => {
            // If one is played (e.g. by native controls), try to play the other.
            const other = (audio === audioOriginal) ? audioConverted : audioOriginal;
            if (other.paused) {
                if (Math.abs(audio.currentTime - other.currentTime) > 0.1) {
                    other.currentTime = audio.currentTime;
                }
                other.play().catch(e => console.warn("Sync onplay error:", e));
            }
            updatePlayPauseButtonUI();
        };

        audio.onpause = () => {
            // If one is paused (e.g. by native controls), pause the other *unless* it's at the end and looping.
            const other = (audio === audioOriginal) ? audioConverted : audioOriginal;
            if (!other.paused && !(isLoopingActive && other.ended)) {
                 other.pause();
            }
            updatePlayPauseButtonUI();
        };

        audio.onended = () => {
            const other = (audio === audioOriginal) ? audioConverted : audioOriginal;
            // If not already paused (e.g. other track ended first), pause it.
            if(!audio.paused) audio.pause();

            // If both have ended (or are very close to end) or if only one track exists for sync (hypothetically)
            if ( (audio.ended && other.ended) || 
                 (audio.ended && Math.abs(other.duration - other.currentTime) < 0.2) ||
                 (other.ended && Math.abs(audio.duration - audio.currentTime) < 0.2) ) {
                
                updatePlayPauseButtonUI(); // Should show Play button

                if (isLoopingActive) {
                    const duration = Math.min(audioOriginal.duration, audioConverted.duration);
                    if (!isNaN(duration) && duration >= MIN_LOOP_DURATION) {
                        audioOriginal.currentTime = 0;
                        audioConverted.currentTime = 0;
                        setTimeout(() => {
                            playBoth().catch(e => console.error("Error re-playing on loop:", e));
                        }, 50);
                    } else {
                        console.log(`Looping skipped: duration issue.`);
                        audioOriginal.currentTime = 0;
                        audioConverted.currentTime = 0;
                    }
                } else {
                    // Ensure times are reset even if not looping for next manual play
                    audioOriginal.currentTime = 0;
                    audioConverted.currentTime = 0;
                }
            }
        };

        audio.addEventListener('seeked', () => {
            if (externalSeekInProgress) return; // Avoid loop if seek was triggered by our sync code

            externalSeekInProgress = true;
            const other = (audio === audioOriginal) ? audioConverted : audioOriginal;
            // console.log(`${audio === audioOriginal ? 'Orig' : 'Conv'} seeked to ${audio.currentTime.toFixed(2)}. Syncing other.`);
            if (Math.abs(audio.currentTime - other.currentTime) > 0.05) { // Tighter threshold for seeked
                other.currentTime = audio.currentTime;
            }
            // If playing, ensure both continue playing
            if(!audioOriginal.paused || !audioConverted.paused){
                playBoth().catch(e => console.warn("Error playing after seeked event", e));
            }
            setTimeout(() => externalSeekInProgress = false, 50); // Reset flag
        });

        // TIME UPDATE - The core of tighter sync during playback
        audio.addEventListener('timeupdate', () => {
            if (audio !== masterAudio || audio.paused || manualSeekInProgress || externalSeekInProgress) {
                return; // Only sync from the designated master, if playing, and not during other seek operations
            }

            const targetTime = masterAudio.currentTime;
            if (Math.abs(targetTime - slaveAudio.currentTime) > 0.05) { // Threshold for adjustment
                // console.log(`Timeupdate: Master at ${targetTime.toFixed(3)}, Slave at ${slaveAudio.currentTime.toFixed(3)}. Adjusting.`);
                manualSeekInProgress = true;
                slaveAudio.currentTime = targetTime;
                // The 'seeked' event on slaveAudio might fire here.
                // We use manualSeekInProgress to prevent slaveAudio's seeked from re-triggering syncTime on master.
                setTimeout(() => manualSeekInProgress = false, 20); // Short timeout for flag
            }
        });
    });


    // --- Cleanup ---
    // ... (observer and revokeUrls remain the same) ...
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
        audioOriginal.src = ''; 
        audioConverted.src = '';
        observer.disconnect();
    };


    // --- Assemble UI ---
    // ... (append logic remains the same) ...
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