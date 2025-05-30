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

// --- Scheduling Constants ---
const LOOKAHEAD_TIME = 0.050; // 50ms: time for JS to execute and scheduling buffer
const SCHEDULE_AHEAD_TIME = 0.100; // 100ms: How far ahead to schedule audio events.

// --- Core Audio Functions ---

async function fetchAndDecodeAudio(playerState) {
    if (!audioContext) return Promise.reject(new Error("AudioContext not available."));
    if (playerState.audioPromise) {
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
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            playerState.audioBuffer = buffer;
            playerState.loadError = null;
            console.log(`fetchAndDecodeAudio: Successfully loaded/decoded ${playerState.src}`);
            return buffer;
        } catch (error) {
            console.error(`fetchAndDecodeAudio: Error for ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.audioBuffer = null;
            playerState.audioPromise = null;
            throw error;
        }
    })();
    playerState.audioPromise = loadPromise;
    return loadPromise;
}


async function preloadSample(playerState) {
    if (playerState.audioBuffer || playerState.audioPromise || !playerState.src) {
        return;
    }
    try {
        await fetchAndDecodeAudio(playerState);
    } catch (error) {
        console.warn(`preloadSample: Preload failed for ${playerState.src}. Error stored.`);
    }
}

async function preloadAllSamples() {
    if (!audioContext) {
        console.warn("preloadAllSamples: AudioContext not available. Skipping.");
        return;
    }
     if (audioContext.state !== 'running') {
         console.warn(`preloadAllSamples: AudioContext not running (${audioContext.state}). Preload might fail or be delayed.`);
     }
    if (loopPlayers.size === 0) {
        console.log("preloadAllSamples: No loop players to preload.");
        return;
    }

    const preloadPromises = [];
    loopPlayers.forEach((playerState) => {
        if (playerState.src && !playerState.audioBuffer && !playerState.audioPromise) {
            preloadPromises.push(preloadSample(playerState));
        }
    });

    if (preloadPromises.length > 0) {
        console.log(`preloadAllSamples: Starting preload for ${preloadPromises.length} audio samples. AudioContext state: ${audioContext?.state}`);
        await Promise.allSettled(preloadPromises);
        console.log("preloadAllSamples: Preloading of all reachable samples complete.");

        loopPlayers.forEach((playerState, card) => {
            if (playerState.indicator && !playerState.isLoading) {
                if (playerState.audioBuffer) {
                    playerState.indicator.style.display = 'none';
                    if (card.classList.contains('audio-error')) card.classList.remove('audio-error');
                } else if (playerState.loadError) {
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
        // console.warn("updateButtonUI: Missing card, playerState, or button reference.");
        return;
    }

    const isActuallyPlaying = isPlayingOverride !== null ? isPlayingOverride : playerState.isPlaying;
    const button = playerState.button;
    const icon = playerState.icon;
    const cardTitleElement = card.querySelector('h3');
    const fullTitle = cardTitleElement ? cardTitleElement.textContent.trim() : (playerState.src ? playerState.src.split('/').pop() : 'Audio Sample');

    if (icon) {
        // Handle 'isScheduled' state for visual feedback if implementing pending state
        // For now, 'fa-spinner' and 'fa-spin' are for loading, not scheduling.
        // if (playerState.isScheduled) {
        //     icon.className = 'fas fa-hourglass-half fa-spin'; // Example for scheduled
        // } else {
            icon.classList.toggle('fa-play', !isActuallyPlaying);
            icon.classList.toggle('fa-pause', isActuallyPlaying);
        // }
    } else {
        button.textContent = isActuallyPlaying ? 'Pause' : 'Play';
    }

    const action = isActuallyPlaying ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${action} ${fullTitle}`);

    card.classList.toggle('playing', isActuallyPlaying && !playerState.isScheduled); // Only add 'playing' if not just scheduled
    card.classList.toggle('scheduled', !!playerState.isScheduled); // Add a class for scheduled state
    card.classList.toggle('loading', playerState.isLoading);
    card.classList.toggle('audio-error', !!playerState.loadError && !playerState.audioBuffer);
    card.classList.toggle('soloed', isSoloActive && soloedCard === card);
    card.classList.toggle('muted-by-solo', playerState.isMutedDueToSolo);

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

     if (button) {
        button.disabled = playerState.isLoading;
     }
}

async function playLoop(card, options = {}) {
    const { isSynchronizedStart = false } = options;
    const playerState = loopPlayers.get(card);

    if (!playerState) {
        console.error("playLoop: Could not find playerState for card:", card);
        return;
    }
    // Allow starting if scheduled but not yet actually playing audibly
    if (playerState.isPlaying && !playerState.isScheduled) {
        console.warn(`playLoop: Already playing (and not just scheduled) ${playerState.src}. Aborting.`);
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
     if (audioContext.state !== 'running') {
         console.error("playLoop: AudioContext is still not running after resume attempt.");
         alert("Audio system failed to start.");
         return;
     }

    playerState.isLoading = true;
    playerState.loadError = null;
    updateButtonUI(card, playerState);

    try {
        if (!playerState.audioBuffer) {
            console.log(`playLoop: Buffer NOT present for ${playerState.src}. Awaiting fetch/decode.`);
            await fetchAndDecodeAudio(playerState);
            if (!playerState.audioBuffer) {
                 console.error(`playLoop: FATAL - Audio buffer still null for ${playerState.src}`, playerState.loadError);
                throw playerState.loadError || new Error("Audio buffer unavailable after load attempt.");
            }
            console.log(`playLoop: Buffer acquired ON DEMAND for ${playerState.src}.`);
        } else {
            console.log(`playLoop: Buffer ALREADY PRESENT for ${playerState.src}.`);
        }

        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = playerState.audioBuffer;
        sourceNode.loop = true;

        let playbackRate = 1.0;
        if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
            playbackRate = globalTargetBPM / playerState.originalBPM;
        }
        sourceNode.playbackRate.value = playbackRate;

        const gainNode = audioContext.createGain();
        playerState.gainNode = gainNode;

        if (isSoloActive && soloedCard !== card) {
            gainNode.gain.value = 0;
            playerState.isMutedDueToSolo = true;
        } else {
            gainNode.gain.value = 1;
            playerState.isMutedDueToSolo = false;
        }

        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        sourceNode.onended = () => {
             if (playerState.sourceNode === sourceNode) {
                console.log(`ONENDED: ${playerState.src}`);
                const wasPlaying = playerState.isPlaying;
                const wasSoloedTrack = isSoloActive && soloedCard === card;

                playerState.isPlaying = false;
                playerState.isScheduled = false; // Clear scheduled flag
                playerState.sourceNode = null;
                 if (playerState.gainNode) {
                    try { playerState.gainNode.disconnect(); } catch(e) {}
                    playerState.gainNode = null;
                 }
                playerState.isMutedDueToSolo = false;

                if (wasPlaying && wasSoloedTrack) {
                    deactivateSolo();
                    updateButtonUI(card, playerState, false);
                } else {
                    updateButtonUI(card, playerState, false);
                }
            }
        };

        let calculatedStartTime = audioContext.currentTime + LOOKAHEAD_TIME;
        playerState.isScheduled = false; // Reset schedule flag

        if (quantizeEnabled && isSynchronizedStart && globalTargetBPM > 0) {
            const secondsPerBeat = 60.0 / globalTargetBPM;
            const currentContextTimeWithScheduleAhead = audioContext.currentTime + SCHEDULE_AHEAD_TIME;
            const beatsSinceOrigin = currentContextTimeWithScheduleAhead / secondsPerBeat;
            const targetBeatNumber = Math.ceil(beatsSinceOrigin);
            calculatedStartTime = targetBeatNumber * secondsPerBeat;

            if (calculatedStartTime < audioContext.currentTime + LOOKAHEAD_TIME) {
                calculatedStartTime = (targetBeatNumber + 1) * secondsPerBeat;
            }
            
            // If there's a meaningful delay, mark as scheduled for UI
            if (calculatedStartTime > audioContext.currentTime + LOOKAHEAD_TIME + 0.010) { // 10ms threshold for "scheduled" state
                playerState.isScheduled = true;
                console.log(`SYNC START for ${playerState.src}: Click@${audioContext.currentTime.toFixed(3)}, Scheduled@${calculatedStartTime.toFixed(3)}`);

                // Optional: Timeout to clear scheduled state and update UI if still scheduled
                // This helps if the actual start is slightly different due to system load
                const delayUntilActualStart = (calculatedStartTime - audioContext.currentTime) * 1000;
                if(playerState.scheduledTimeoutId) clearTimeout(playerState.scheduledTimeoutId);
                playerState.scheduledTimeoutId = setTimeout(() => {
                    if(playerState.isScheduled && playerState.isPlaying) { // Check if it's still relevant
                        playerState.isScheduled = false;
                        updateButtonUI(card, playerState);
                    }
                }, Math.max(0, delayUntilActualStart + 50)); // Add 50ms buffer
            } else {
                 console.log(`SYNC START for ${playerState.src} is near-immediate. Scheduled@${calculatedStartTime.toFixed(3)}`);
            }
        }

        sourceNode.start(calculatedStartTime);
        playerState.sourceNode = sourceNode;
        playerState.isPlaying = true; // Mark as playing (or intending to play)
        playerState.scheduledStartTime = calculatedStartTime; // Store for reference
        
        if(!playerState.isScheduled) { // If not marked as scheduled, it's an immediate start
            console.log(`playLoop: Started playback for ${playerState.src} at rate ${playbackRate.toFixed(2)}, StartTime: ${calculatedStartTime.toFixed(3)}`);
        }


    } catch (error) {
        console.error(`playLoop: Error playing ${playerState.src}:`, error);
        playerState.loadError = error;
        playerState.isPlaying = false;
        playerState.isScheduled = false;
        if (!playerState.audioBuffer) playerState.audioPromise = null;
        playerState.sourceNode = null;
         if (playerState.gainNode) {
            try { playerState.gainNode.disconnect(); } catch(e) {}
             playerState.gainNode = null;
         }
        playerState.isMutedDueToSolo = false;
        alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);
    } finally {
        playerState.isLoading = false;
        updateButtonUI(card, playerState); // Update UI reflecting new state (playing, scheduled, or error)
    }
}

function stopLoop(card) {
    const playerState = loopPlayers.get(card);
    if (playerState && playerState.isPlaying && playerState.sourceNode) {
        try {
            console.log(`stopLoop: Attempting to stop ${playerState.src}`);
             playerState.sourceNode.loop = false;
             playerState.sourceNode.stop(0);
             // onended will handle cleanup.
             console.log(`stopLoop: Stop command issued for ${playerState.src}. Waiting for onended.`);
             // If it was scheduled, clear the scheduled state immediately
             if (playerState.isScheduled) {
                if(playerState.scheduledTimeoutId) clearTimeout(playerState.scheduledTimeoutId);
                playerState.isScheduled = false;
                playerState.isPlaying = false; // Since it was stopped before truly starting
                updateButtonUI(card, playerState, false); // Reflect it's no longer playing/scheduled
             }

        } catch (e) {
            console.warn(`stopLoop: Error calling node.stop() for ${playerState.src}:`, e.message);
            const wasSoloedAndThisCard = isSoloActive && soloedCard === card;
            playerState.isPlaying = false;
            playerState.isScheduled = false;
            if(playerState.scheduledTimeoutId) clearTimeout(playerState.scheduledTimeoutId);
            if (playerState.sourceNode) {
                playerState.sourceNode.onended = null;
                try { playerState.sourceNode.disconnect(); } catch(err) {}
                playerState.sourceNode = null;
            }
             if (playerState.gainNode) {
                try { playerState.gainNode.disconnect(); } catch(err) {}
                playerState.gainNode = null;
             }
            playerState.isMutedDueToSolo = false;
            if (wasSoloedAndThisCard) {
                deactivateSolo();
                updateButtonUI(card, playerState, false);
            } else {
                updateButtonUI(card, playerState, false);
            }
        }
    } else if (playerState && playerState.isPlaying) { // isPlaying but no sourceNode
        console.warn(`stopLoop: Inconsistent state for ${playerState.src}. Resetting.`);
        playerState.isPlaying = false;
        playerState.isScheduled = false;
        if(playerState.scheduledTimeoutId) clearTimeout(playerState.scheduledTimeoutId);
        playerState.sourceNode = null;
        if (playerState.gainNode) { try { playerState.gainNode.disconnect(); } catch(e) {} playerState.gainNode = null; }
        playerState.isMutedDueToSolo = false;
        updateButtonUI(card, playerState, false);
    }
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
    // Allow soloing even if it's just scheduled
    if (!audioContext || !soloPlayerState || !soloPlayerState.isPlaying || !soloPlayerState.gainNode) {
        console.warn("SOLO: Cannot activate - prerequisite missing (context, player intended to play, gainNode).");
        return;
    }
    if (isSoloActive && soloedCard === cardToSolo) {
        console.log("SOLO: Already soloed on this card.");
        return;
    }

    console.log(`SOLO: Activating for ${soloPlayerState.src}`);
    isSoloActive = true;
    soloedCard = cardToSolo;

    soloPlayerState.gainNode.gain.setValueAtTime(soloPlayerState.gainNode.gain.value, audioContext.currentTime);
    soloPlayerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
    soloPlayerState.isMutedDueToSolo = false;

    loopPlayers.forEach((otherPlayerState, otherCard) => {
        if (otherCard !== cardToSolo) {
            if (otherPlayerState.isPlaying && otherPlayerState.gainNode) { // isPlaying includes scheduled
                otherPlayerState.gainNode.gain.setValueAtTime(otherPlayerState.gainNode.gain.value, audioContext.currentTime);
                otherPlayerState.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.015);
                otherPlayerState.isMutedDueToSolo = true;
            } else {
                 otherPlayerState.isMutedDueToSolo = false;
            }
            updateButtonUI(otherCard, otherPlayerState);
        }
    });
    updateButtonUI(cardToSolo, soloPlayerState);
}

function deactivateSolo() {
    if (!audioContext || !isSoloActive) {
        return;
    }
    console.log("SOLO: Deactivating solo.");
    isSoloActive = false;
    soloedCard = null;

    loopPlayers.forEach((playerState, card) => {
        if (playerState.isMutedDueToSolo && playerState.gainNode) {
             if (playerState.isPlaying) { // isPlaying includes scheduled
                playerState.gainNode.gain.setValueAtTime(playerState.gainNode.gain.value, audioContext.currentTime);
                playerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
             }
        }
        playerState.isMutedDueToSolo = false;
        updateButtonUI(card, playerState);
    });
}

// --- Quantize Functions ---
function updateRateForAllCurrentlyPlayingLoops() {
    if (!audioContext || audioContext.state !== 'running' || !quantizeEnabled) {
        return;
    }
    console.log(`Quantize: Updating rates for target BPM ${globalTargetBPM}`);
    loopPlayers.forEach((playerState) => {
        if (playerState.isPlaying && playerState.sourceNode) { // Check sourceNode as rate applies to it
            let newRate = 1.0;
            if (playerState.originalBPM > 0 && globalTargetBPM > 0) {
                newRate = globalTargetBPM / playerState.originalBPM;
            }
            if (playerState.sourceNode.playbackRate.value !== newRate) {
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
            console.log("Quantize enabled:", quantizeEnabled);
            updateRateForAllCurrentlyPlayingLoops(); // Update rates for playing loops
            if (!quantizeEnabled) { // If turning off, reset rates to 1.0
                loopPlayers.forEach((playerState) => {
                    if (playerState.isPlaying && playerState.sourceNode && playerState.sourceNode.playbackRate.value !== 1.0) {
                        playerState.sourceNode.playbackRate.value = 1.0;
                        console.log(`Quantize disabled: Reset ${playerState.src} rate to 1.0`);
                    }
                });
            }
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
                // console.warn("Invalid BPM input:", bpmInputEl.value);
            }
        });
        quantizeEnabled = quantizeToggleEl.checked;
        globalTargetBPM = parseInt(bpmInputEl.value, 10) || 120;
        console.log(`Quantize initial state: enabled=${quantizeEnabled}, bpm=${globalTargetBPM}`);
    } else {
        console.warn("Quantize UI elements not found. Quantize feature disabled.");
        quantizeEnabled = false;
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

    quantizeToggleEl = document.getElementById(quantizeToggleId);
    bpmInputEl = document.getElementById(bpmInputId);
    setupQuantizeControls();

    loopPlayers.forEach((playerState, card) => {
        // Initialize playerState with isScheduled and scheduledTimeoutId
        playerState.isScheduled = false;
        playerState.scheduledTimeoutId = null;

        card.addEventListener('click', async (event) => {
            if (event.target.closest('button') !== playerState.button && event.target !== card) {
                 return;
            }

            const isAltShiftClick = event.altKey && event.shiftKey && !event.ctrlKey;
            const isShiftOnlyClick = event.shiftKey && !event.altKey && !event.ctrlKey;
            const isNormalClick = !event.shiftKey && !event.altKey && !event.ctrlKey;

            // console.log(`CLICK EVENT: ${playerState.src}. Alt: ${event.altKey}, Shift: ${event.shiftKey}, Ctrl: ${event.ctrlKey}. SoloActive: ${isSoloActive}. PlayerIsPlaying: ${playerState.isPlaying}`);

            if (playerState.isLoading) {
                console.log("AudioEngine EVENT: Still loading, please wait.");
                return;
            }

            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                     if (audioContext.state !== 'running') {
                         alert("Could not start audio. Please interact with the page."); return;
                     }
                } catch (e) {
                    alert("Could not activate audio playback. Please interact with the page."); return;
                }
            }
             if (audioContext.state !== 'running') {
                 alert("Audio system is not ready. Please try again or reload."); return;
             }

            if (isAltShiftClick) {
                 if (isSoloActive && soloedCard === card) {
                    deactivateSolo();
                 } else { // Activate or switch solo
                    if (!playerState.isPlaying) { // If not playing (or scheduled), start it first
                        await playLoop(card); // Standard start, not synced for solo activation itself
                    }
                    // playLoop sets isPlaying, so check after await
                    if(playerState.isPlaying) activateSolo(card);
                 }
                return;
            }

             if ((isNormalClick || isShiftOnlyClick) && isSoloActive && soloedCard !== card) {
                deactivateSolo();
             }

            if (playerState.isPlaying) { // This includes if it's scheduled
                stopLoop(card);
            } else {
                const playOptions = {};
                if (isNormalClick) {
                     stopAllLoops(card);
                } else if (isShiftOnlyClick) {
                    if (quantizeEnabled) {
                        playOptions.isSynchronizedStart = true;
                    }
                }
                await playLoop(card, playOptions);
            }
        });
    });

    preloadAllSamples();
    console.log("AudioEngine initialized.");
}