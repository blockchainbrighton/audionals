/**
 * audioEngine.js
 * Manages Web Audio API playback, looping, quantize, solo features,
 * and updates related UI elements.
 */

let audioContext = null;
let loopPlayers = new Map(); // Will be populated by initAudioEngine

// --- Configuration ---
let quantizeEnabled = false;
let globalTargetBPM = 120;
let isSoloActive = false;
let soloedCard = null; // DOM element of the soloed card

// --- UI Selectors (passed during init) ---
let quantizeToggleEl = null;
let bpmInputEl = null;

// --- Core Audio Functions ---

async function fetchAndDecodeAudio(playerState) {
    if (!audioContext) return Promise.reject(new Error("AudioContext not available."));
    if (playerState.audioPromise) {
        // Already fetching/decoding, return the existing promise
        return playerState.audioPromise;
    }

    console.log(`fetchAndDecodeAudio: Starting fetch/decode for ${playerState.src}`);
    const loadPromise = (async () => {
        try {
            const response = await fetch(playerState.src);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for ${playerState.src}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            // Use the shared AudioContext instance
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            playerState.audioBuffer = buffer;
            playerState.loadError = null;
            console.log(`fetchAndDecodeAudio: Successfully loaded/decoded ${playerState.src}`);
            return buffer;
        } catch (error) {
            console.error(`fetchAndDecodeAudio: Error for ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.audioBuffer = null; // Ensure buffer is null on error
            playerState.audioPromise = null; // Reset promise on error so retry is possible
            throw error; // Re-throw to be caught by callers
        } finally {
            // Doesn't reset audioPromise here, only on error. Success keeps it cached.
        }
    })();
    playerState.audioPromise = loadPromise;
    return loadPromise;
}


async function preloadSample(playerState) {
    if (playerState.audioBuffer || playerState.audioPromise || !playerState.src) {
        // console.log(`preloadSample: Skipping ${playerState.src} - already buffered, loading, or no src.`);
        return;
    }
    // console.log(`preloadSample: Initiating for ${playerState.src}`);
    try {
        await fetchAndDecodeAudio(playerState);
        // console.log(`preloadSample: Successfully preloaded ${playerState.src}`);
    } catch (error) {
        console.warn(`preloadSample: Preload failed for ${playerState.src}. Error stored.`);
        // Error is stored in playerState by fetchAndDecodeAudio
    }
}

async function preloadAllSamples() {
    if (!audioContext) {
        console.warn("preloadAllSamples: AudioContext not available. Skipping.");
        return;
    }
     if (audioContext.state !== 'running') {
         console.warn(`preloadAllSamples: AudioContext not running (${audioContext.state}). Preload might fail or be delayed. Waiting for context to resume.`);
         // We can still try, decodeAudioData might work even if suspended,
         // but playback won't start until resumed.
     }
    if (loopPlayers.size === 0) {
        console.log("preloadAllSamples: No loop players to preload.");
        return;
    }

    const preloadPromises = [];
    loopPlayers.forEach((playerState) => {
        if (playerState.src && !playerState.audioBuffer && !playerState.audioPromise) {
            // Pass the playerState itself
            preloadPromises.push(preloadSample(playerState));
        }
    });

    if (preloadPromises.length > 0) {
        console.log(`preloadAllSamples: Starting preload for ${preloadPromises.length} audio samples. AudioContext state: ${audioContext?.state}`);
        await Promise.allSettled(preloadPromises);
        console.log("preloadAllSamples: Preloading of all reachable samples complete.");

        // Update UI based on preload results
        loopPlayers.forEach((playerState, card) => {
            if (playerState.indicator && !playerState.isLoading) { // Only update if not actively loading via click
                if (playerState.audioBuffer) { // Successfully preloaded
                    playerState.indicator.style.display = 'none';
                    if (card.classList.contains('audio-error')) card.classList.remove('audio-error');
                } else if (playerState.loadError) { // Preload failed
                    playerState.indicator.textContent = 'Load Error';
                    playerState.indicator.style.display = 'inline';
                    card.classList.add('audio-error');
                    if (playerState.button) {
                        playerState.button.title = `Audio failed to load: ${playerState.loadError.message}. Click to retry.`;
                    }
                }
            }
        });
    } else {
        console.log("preloadAllSamples: No new audio samples to preload (all might be buffered or already pending load).");
    }
}

function updateButtonUI(card, playerState, isPlayingOverride = null) {
    if (!card || !playerState || !playerState.button) {
        console.warn("updateButtonUI: Missing card, playerState, or button reference.");
        return;
    }

    const isActuallyPlaying = isPlayingOverride !== null ? isPlayingOverride : playerState.isPlaying;
    const button = playerState.button;
    const icon = playerState.icon;
    // Try to get a meaningful title even if h3 is missing
    const cardTitleElement = card.querySelector('h3');
    const fullTitle = cardTitleElement ? cardTitleElement.textContent.trim() : (playerState.src ? playerState.src.split('/').pop() : 'Audio Sample');


    if (icon) {
        icon.classList.toggle('fa-play', !isActuallyPlaying);
        icon.classList.toggle('fa-pause', isActuallyPlaying);
    } else {
        // Fallback if icon element is missing
        button.textContent = isActuallyPlaying ? 'Pause' : 'Play';
    }

    const action = isActuallyPlaying ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${action} ${fullTitle}`);

    // Update card classes based on state
    card.classList.toggle('playing', isActuallyPlaying);
    card.classList.toggle('loading', playerState.isLoading);
    card.classList.toggle('audio-error', !!playerState.loadError && !playerState.audioBuffer); // Show error only if buffer is truly missing
    card.classList.toggle('soloed', isSoloActive && soloedCard === card);
    card.classList.toggle('muted-by-solo', playerState.isMutedDueToSolo);

     // Update indicator visibility and text
     if (playerState.indicator) {
         if (playerState.isLoading) {
             playerState.indicator.textContent = 'Loading...';
             playerState.indicator.style.display = 'inline';
         } else if (playerState.loadError && !playerState.audioBuffer) {
             playerState.indicator.textContent = 'Load Error';
             playerState.indicator.style.display = 'inline';
         } else {
             playerState.indicator.style.display = 'none';
         }
     }

     // Ensure button is not disabled unless actively loading or permanent error
     if (button) {
        button.disabled = playerState.isLoading;
        // Maybe keep disabled if loadError and no buffer? Depends on desired retry behavior.
        // button.disabled = playerState.isLoading || (!!playerState.loadError && !playerState.audioBuffer);
     }
}

async function playLoop(card) {
    const playerState = loopPlayers.get(card);
    if (!playerState) {
        console.error("playLoop: Could not find playerState for card:", card);
        return;
    }
    if (playerState.isPlaying) {
        console.warn(`playLoop: Already playing ${playerState.src}. Aborting.`);
        return;
    }
    if (!audioContext) {
        alert("Audio system not available.");
        console.error("playLoop: AudioContext is not available.");
        return;
    }
    if (audioContext.state !== 'running') {
        console.warn(`playLoop: AudioContext not running (state: ${audioContext.state}). Attempting to resume...`);
        try {
            await audioContext.resume();
            console.log(`playLoop: AudioContext resumed. State: ${audioContext.state}`);
            if (audioContext.state !== 'running') {
                alert("Could not start audio. Please interact with the page again.");
                return;
            }
        } catch (e) {
            console.error("playLoop: Error resuming AudioContext:", e);
            alert("Could not activate audio playback.");
            return;
        }
    }
    // Re-check after potential resume
    if (audioContext.state !== 'running') {
        console.error("playLoop: AudioContext is still not running after resume attempt.");
        alert("Audio system failed to start.");
        return;
    }


    playerState.isLoading = true;
    playerState.loadError = null; // Clear previous errors on new attempt
    updateButtonUI(card, playerState); // Show loading state

    try {
        if (!playerState.audioBuffer) {
            console.log(`playLoop: Buffer NOT present for ${playerState.src}. Awaiting fetch/decode.`);
            // Fetch and decode audio data if not already buffered
            await fetchAndDecodeAudio(playerState);
            if (!playerState.audioBuffer) {
                // fetchAndDecodeAudio should have set loadError if it failed
                 console.error(`playLoop: FATAL - Audio buffer still null after fetchAndDecodeAudio for ${playerState.src}`, playerState.loadError);
                throw playerState.loadError || new Error("Audio buffer unavailable after load attempt.");
            }
            console.log(`playLoop: Buffer acquired ON DEMAND for ${playerState.src}.`);
        } else {
            console.log(`playLoop: Buffer was ALREADY PRESENT for ${playerState.src}.`);
        }

        // --- Create Audio Nodes ---
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = playerState.audioBuffer;
        sourceNode.loop = true;

        // Calculate playback rate for quantize
        let playbackRate = 1.0;
        if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
            playbackRate = globalTargetBPM / playerState.originalBPM;
        }
        sourceNode.playbackRate.value = playbackRate;

        // Create Gain node for volume control (and solo mute)
        const gainNode = audioContext.createGain();
        playerState.gainNode = gainNode; // Store reference

        // Set initial volume based on solo state
        if (isSoloActive && soloedCard !== card) {
            gainNode.gain.value = 0; // Start muted if another track is soloed
            playerState.isMutedDueToSolo = true;
            console.log(`PLAYLOOP (SOLO): ${playerState.src} starting muted as another is soloed.`);
        } else {
            gainNode.gain.value = 1; // Default to full volume
            playerState.isMutedDueToSolo = false;
        }

        // Connect nodes: Source -> Gain -> Destination
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // --- Handle buffer ending ---
        sourceNode.onended = () => {
            // Ensure this cleanup runs only for the intended node instance
             if (playerState.sourceNode === sourceNode) {
                console.log(`ONENDED: ${playerState.src}`);
                const wasPlaying = playerState.isPlaying; // Capture state before reset
                const wasSoloedTrack = isSoloActive && soloedCard === card;

                // --- Reset Player State (common cleanup) ---
                playerState.isPlaying = false;
                playerState.sourceNode = null; // Allow GC
                 if (playerState.gainNode) { // Disconnect gain node
                    try { playerState.gainNode.disconnect(); } catch(e) {/* ignore if already disconnected */}
                    playerState.gainNode = null;
                 }
                const wasMutedBySolo = playerState.isMutedDueToSolo;
                playerState.isMutedDueToSolo = false; // Reset flag

                // --- Handle Solo Deactivation and UI Updates ---
                if (wasPlaying && wasSoloedTrack) {
                    console.log(`ONENDED (SOLO): Soloed track ${playerState.src} ended/stopped. Deactivating solo.`);
                    // IMPORTANT: Deactivate solo *before* updating this card's UI,
                    // so other cards get unmuted correctly first.
                    deactivateSolo();
                    // Now update this card's UI (after solo state is globally updated)
                    updateButtonUI(card, playerState, false);
                } else {
                    // If not the soloed track, or solo wasn't active, just update this card's UI.
                    updateButtonUI(card, playerState, false);
                }
            } else {
                 // console.log(`ONENDED received for ${playerState.src}, but sourceNode mismatch. Ignoring.`);
            }
        };

        // --- Start Playback ---
        sourceNode.start(0);
        playerState.sourceNode = sourceNode; // Store reference to the playing node
        playerState.isPlaying = true;
        console.log(`playLoop: Started playback for ${playerState.src} at rate ${playbackRate.toFixed(2)}`);

    } catch (error) {
        console.error(`playLoop: Error playing ${playerState.src}:`, error);
        playerState.loadError = error;
        playerState.isPlaying = false;
        // Don't nullify audioBuffer here - it might be valid but playback failed for other reasons.
        // Nullify the promise to allow retry if the error was during fetch/decode.
        if (!playerState.audioBuffer) playerState.audioPromise = null;
        playerState.sourceNode = null; // Clean up potential partial setup
         if (playerState.gainNode) {
            try { playerState.gainNode.disconnect(); } catch(e) {/* ignore */}
             playerState.gainNode = null;
         }
        playerState.isMutedDueToSolo = false;
        alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);

    } finally {
        playerState.isLoading = false;
        // Update UI regardless of success or failure to reflect final state
        updateButtonUI(card, playerState);
    }
}

function stopLoop(card) {
    const playerState = loopPlayers.get(card);
    if (playerState && playerState.isPlaying && playerState.sourceNode) {
        try {
            console.log(`stopLoop: Attempting to stop ${playerState.src}`);
             // Setting loop to false before stopping can prevent issues in some edge cases,
             // though generally not strictly necessary if onended handles cleanup.
             playerState.sourceNode.loop = false;
             playerState.sourceNode.stop(0);
            // Let the 'onended' event handle the state cleanup and UI update.
            // Explicitly setting isPlaying = false here can cause race conditions
            // if onended fires slightly later.
             console.log(`stopLoop: Stop command issued for ${playerState.src}. Waiting for onended.`);

        } catch (e) {
            // This catch block is for errors during the .stop() call itself.
            console.warn(`stopLoop: Error calling node.stop() for ${playerState.src}:`, e.message);
            // If stop() fails, the 'onended' might not fire reliably.
            // Force cleanup here as a fallback.

            const wasSoloedAndThisCard = isSoloActive && soloedCard === card;

            // --- Forced State Reset ---
            playerState.isPlaying = false;
            if (playerState.sourceNode) {
                playerState.sourceNode.onended = null; // Prevent potential double cleanup
                try { playerState.sourceNode.disconnect(); } catch(e) {/* ignore */}
                playerState.sourceNode = null;
            }
             if (playerState.gainNode) {
                try { playerState.gainNode.disconnect(); } catch(e) {/* ignore */}
                playerState.gainNode = null;
             }
            playerState.isMutedDueToSolo = false;

            // --- Solo and UI Handling after Forced Reset ---
            if (wasSoloedAndThisCard) {
                console.warn(`stopLoop (SOLO): Forcefully deactivating solo for ${playerState.src} due to stop error.`);
                deactivateSolo(); // This will update other UIs
                updateButtonUI(card, playerState, false); // Update this card after solo deactivated
            } else {
                updateButtonUI(card, playerState, false); // Just update this card
            }
        }
    } else if (playerState && playerState.isPlaying) {
        // State inconsistency: isPlaying=true but no sourceNode. Reset state.
        console.warn(`stopLoop: Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode. Resetting.`);
        playerState.isPlaying = false;
        playerState.sourceNode = null;
         if (playerState.gainNode) { try { playerState.gainNode.disconnect(); } catch(e) {/* ignore */} playerState.gainNode = null; }
        playerState.isMutedDueToSolo = false;
        updateButtonUI(card, playerState, false); // Update UI to reflect reset state
    }
    // If !playerState.isPlaying, do nothing.
}


function stopAllLoops(exceptCard = null) {
    console.log("Stopping all loops", exceptCard ? `except ${loopPlayers.get(exceptCard)?.src}` : '');
    loopPlayers.forEach((state, card) => {
        if (card !== exceptCard && state.isPlaying) {
            stopLoop(card);
        }
    });
}


// --- SOLO Functions ---
function activateSolo(cardToSolo) {
    const soloPlayerState = loopPlayers.get(cardToSolo);
    if (!audioContext || !soloPlayerState || !soloPlayerState.isPlaying || !soloPlayerState.gainNode) {
        console.warn("SOLO: Cannot activate - prerequisite missing (context, playing state, gainNode).");
        return;
    }
    if (isSoloActive && soloedCard === cardToSolo) {
        console.log("SOLO: Already soloed on this card.");
        return; // Already soloed
    }

    console.log(`SOLO: Activating for ${soloPlayerState.src}`);
    isSoloActive = true;
    soloedCard = cardToSolo;

    // Ensure the soloed track is at full volume (ramp for smoothness)
    // Using setValueAtTime followed by linearRamp avoids clicks if the value was already 0
    soloPlayerState.gainNode.gain.setValueAtTime(soloPlayerState.gainNode.gain.value, audioContext.currentTime);
    soloPlayerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
    soloPlayerState.isMutedDueToSolo = false; // Explicitly mark it as not muted by solo

    // Mute other playing tracks
    loopPlayers.forEach((otherPlayerState, otherCard) => {
        if (otherCard !== cardToSolo) {
            if (otherPlayerState.isPlaying && otherPlayerState.gainNode) {
                otherPlayerState.gainNode.gain.setValueAtTime(otherPlayerState.gainNode.gain.value, audioContext.currentTime);
                otherPlayerState.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.015);
                otherPlayerState.isMutedDueToSolo = true;
                console.log(`SOLO: Muting ${otherPlayerState.src}`);
            } else {
                 // Ensure flag is false if not playing or no gain node
                 otherPlayerState.isMutedDueToSolo = false;
            }
             // Update UI for muted/unmuted state (removing soloed class if present)
            updateButtonUI(otherCard, otherPlayerState);
        }
    });

    // Update UI specifically for the newly soloed card
    updateButtonUI(cardToSolo, soloPlayerState);
}

function deactivateSolo() {
    if (!audioContext || !isSoloActive) {
        // console.log("SOLO: Deactivate called but no solo active or no audioContext.");
        return;
    }
    console.log("SOLO: Deactivating solo.");

    const previouslySoloedCardElement = soloedCard; // Store reference before resetting global state

    isSoloActive = false;
    soloedCard = null;

    // Unmute all tracks that were muted due to solo
    loopPlayers.forEach((playerState, card) => {
        if (playerState.isMutedDueToSolo && playerState.gainNode) {
            // Only restore volume if the track is actually still playing.
             if (playerState.isPlaying) {
                playerState.gainNode.gain.setValueAtTime(playerState.gainNode.gain.value, audioContext.currentTime);
                playerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
                console.log(`SOLO: Unmuting ${playerState.src}`);
             } else {
                 // If not playing, ensure gain is 0 or its natural state (should be handled by stop/onended)
                 // but we reset the flag anyway.
             }
        }
        // Reset the flag regardless of playing state
        playerState.isMutedDueToSolo = false;

        // Update UI for all cards to remove solo/mute-related classes
        updateButtonUI(card, playerState);
    });
}

// --- Quantize Functions ---
function updateRateForAllCurrentlyPlayingLoops() {
    if (!audioContext || audioContext.state !== 'running' || !quantizeEnabled) {
        return; // Don't update if disabled or context not ready
    }
    console.log(`Quantize: Updating rates for target BPM ${globalTargetBPM}`);
    loopPlayers.forEach((playerState, card) => {
        if (playerState.isPlaying && playerState.sourceNode) {
            let newRate = 1.0;
            if (playerState.originalBPM > 0 && globalTargetBPM > 0) {
                newRate = globalTargetBPM / playerState.originalBPM;
            }
            // Only update if the rate actually changed to avoid unnecessary processing
            if (playerState.sourceNode.playbackRate.value !== newRate) {
                 // Use setValueAtTime for immediate change if needed, or just set value
                 // playerState.sourceNode.playbackRate.setValueAtTime(newRate, audioContext.currentTime);
                 playerState.sourceNode.playbackRate.value = newRate;
                 console.log(`Quantize: Set ${playerState.src} rate to ${newRate.toFixed(2)}`);
            }
        }
    });
}

function setupQuantizeControls() {
    if (quantizeToggleEl && bpmInputEl) {
        quantizeToggleEl.addEventListener('change', () => {
            quantizeEnabled = quantizeToggleEl.checked;
            if (quantizeEnabled) {
                updateRateForAllCurrentlyPlayingLoops(); // Apply immediately if enabled
            } else {
                // Optionally reset rates to 1.0 when quantize is disabled
                loopPlayers.forEach((playerState) => {
                    if (playerState.isPlaying && playerState.sourceNode && playerState.sourceNode.playbackRate.value !== 1.0) {
                        playerState.sourceNode.playbackRate.value = 1.0;
                        console.log(`Quantize disabled: Reset ${playerState.src} rate to 1.0`);
                    }
                });
            }
            console.log("Quantize enabled:", quantizeEnabled);
        });

        bpmInputEl.addEventListener('input', () => {
            const newBPM = parseInt(bpmInputEl.value, 10);
            const minBPM = parseInt(bpmInputEl.min, 10) || 30;
            const maxBPM = parseInt(bpmInputEl.max, 10) || 300;

            if (!isNaN(newBPM) && newBPM >= minBPM && newBPM <= maxBPM) {
                globalTargetBPM = newBPM;
                console.log("Global Target BPM changed to:", globalTargetBPM);
                if (quantizeEnabled) {
                    updateRateForAllCurrentlyPlayingLoops();
                }
            } else {
                console.warn("Invalid BPM input:", bpmInputEl.value);
                 // Optionally provide feedback or reset to a valid value
                 // bpmInputEl.value = globalTargetBPM; // Revert to last valid value
            }
        });

        // Initial state from HTML
        quantizeEnabled = quantizeToggleEl.checked;
        globalTargetBPM = parseInt(bpmInputEl.value, 10) || 120;
        console.log(`Quantize initial state: enabled=${quantizeEnabled}, bpm=${globalTargetBPM}`);

    } else {
        console.warn("Quantize UI elements (toggle or BPM input) not found. Quantize feature disabled.");
        quantizeEnabled = false; // Ensure it's disabled if controls are missing
    }
}


// --- Initialization ---
export function initAudioEngine(context, playersMap, quantizeToggleId, bpmInputId) {
    if (!context) {
        console.error("AudioEngine initialization failed: AudioContext not provided.");
        return;
    }
    audioContext = context;
    loopPlayers = playersMap;

    // Find quantize controls
    quantizeToggleEl = document.getElementById(quantizeToggleId);
    bpmInputEl = document.getElementById(bpmInputId);
    setupQuantizeControls(); // Setup listeners for quantize controls

    // --- Attach Click Listeners to Sample Cards ---
    loopPlayers.forEach((playerState, card) => {
        card.addEventListener('click', async (event) => {
            // Prevent clicks on buttons/links inside the card from triggering play/stop
            if (event.target.closest('button') !== playerState.button && event.target !== card) {
                 // console.log("Click inside card, but not on main area or button, ignoring for play/stop.");
                 return;
            }

            // Check for modifier keys for different actions
            const isAltShiftClick = event.altKey && event.shiftKey && !event.ctrlKey; // SOLO CLICK
            const isShiftOnlyClick = event.shiftKey && !event.altKey && !event.ctrlKey; // ADD TO MIX (Play without stopping others)
            const isNormalClick = !event.shiftKey && !event.altKey && !event.ctrlKey;   // PLAY EXCLUSIVELY (Stop others)

            console.log(`CLICK EVENT: ${playerState.src}. Alt: ${event.altKey}, Shift: ${event.shiftKey}, Ctrl: ${event.ctrlKey}. SoloActive: ${isSoloActive}. PlayerIsPlaying: ${playerState.isPlaying}`);

            if (playerState.isLoading) {
                console.log("PlayLoop EVENT: Still loading, please wait.");
                return;
            }
            // Allow retry on load error
            // if (playerState.loadError && !playerState.audioBuffer) {
            //     alert(`Cannot play. Previous load error: ${playerState.loadError.message}. Retrying load...`);
            //     // Playloop will handle the retry implicitly
            // }

            // Ensure AudioContext is running (might have been suspended)
            if (audioContext.state === 'suspended') {
                console.log("PlayLoop EVENT: AudioContext is suspended, attempting to resume.");
                try {
                    await audioContext.resume();
                    console.log(`PlayLoop EVENT: AudioContext resumed. New state: ${audioContext.state}`);
                     if (audioContext.state !== 'running') {
                         alert("Could not start audio. Please interact with the page again.");
                         return;
                     }
                } catch (e) {
                    console.error("PlayLoop EVENT: Error resuming AudioContext:", e);
                    alert("Could not activate audio playback. Please interact with the page again.");
                    return;
                }
            }
             if (audioContext.state !== 'running') {
                 console.warn("PlayLoop EVENT: AudioContext not running even after resume attempt. Aborting.");
                 alert("Audio system is not ready. Please try interacting with the page again or reload.");
                 return;
             }


            // --- Handle SOLO click (Alt + Shift + Click) ---
            if (isAltShiftClick) {
                console.log("SOLO ACTION (Alt+Shift-Click) on card:", card.dataset.src);
                 if (isSoloActive && soloedCard === card) {
                     // Clicked the currently soloed card again -> deactivate solo
                    console.log("SOLO: Deactivating via Alt+Shift-Click on soloed card.");
                    deactivateSolo();
                 } else if (isSoloActive && soloedCard !== card) {
                    // Solo is active, but clicked a *different* card -> switch solo
                    console.log("SOLO: Switching solo via Alt+Shift-Click.");
                    // Deactivate first (unmutes others), then activate on the new one
                    // Note: deactivateSolo() is called implicitly if the new card starts playing
                    //       while another is soloed. Let's rethink this.
                    // Let's try direct activation, which should handle muting others.
                    if (!playerState.isPlaying) await playLoop(card); // Try to start it first if not playing
                    if(playerState.isPlaying) activateSolo(card); // Activate solo if playing

                 } else { // No solo currently active -> activate solo
                    console.log("SOLO: Activating solo via Alt+Shift-Click.");
                    if (!playerState.isPlaying) await playLoop(card); // Try to start it first if not playing
                    if(playerState.isPlaying) activateSolo(card); // Activate solo if playing
                 }
                return; // Solo action handled
            }


             // --- If any other click type (Normal or Shift-Only) occurs and a solo is active on a DIFFERENT card ---
             // This automatically deactivates the existing solo when interacting with another track.
             if ((isNormalClick || isShiftOnlyClick) && isSoloActive && soloedCard !== card) {
                console.log("Normal/Shift-Only Click while solo active on ANOTHER card. Deactivating solo first.");
                deactivateSolo();
             }
             // If solo was active on THIS card, clicking it again (normal/shift) will stop it.
             // The stopLoop -> onended handler will call deactivateSolo automatically.


            // --- Proceed with Normal Click or Shift-Only Click logic ---
            if (playerState.isPlaying) {
                // If THIS card is playing, any click (Normal or Shift-Only) stops it.
                // If it was the soloed card, its onended handler will deactivate solo.
                 console.log(`Stop requested via click for ${playerState.src}`);
                stopLoop(card);
            } else {
                // If THIS card is NOT playing, start it.
                if (isNormalClick) {
                    // Normal click stops all other loops first.
                     console.log(`Exclusive play requested for ${playerState.src}`);
                     stopAllLoops(card); // Stop others before playing this one
                } else if (isShiftOnlyClick) {
                    // Shift-Only click adds to the mix (doesn't stop others).
                     console.log(`Adding ${playerState.src} to mix via Shift-Click.`);
                }
                 // Now play the current card's loop
                await playLoop(card);
                // Note: playLoop itself handles starting muted if solo is active on another track.
            }
        });
    });

    // --- Start Preloading ---
    preloadAllSamples(); // Start preloading after engine is initialized
    console.log("AudioEngine initialized.");
}