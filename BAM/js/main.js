/**
 * Main JavaScript file for website interactions and enhancements.
 * Includes: Mobile Navigation, Animations, Audio Playback (Web Audio API),
 * Filtering, Quantize feature, and other UI effects.
 */
document.addEventListener('DOMContentLoaded', () => {

    const neonRowColors = [ /* ... keep your color array ... */
        'hsl(180, 100%, 50%)', 'hsl(300, 100%, 50%)', 'hsl(120, 100%, 50%)',
        'hsl(60, 100%, 50%)', 'hsl(0, 100%, 50%)', 'hsl(30, 100%, 50%)',
        'hsl(240, 100%, 60%)', 'hsl(330, 100%, 55%)', 'hsl(90, 100%, 50%)',
        'hsl(210, 100%, 55%)', 'hsl(30, 95%, 60%)', 'hsl(150, 100%, 50%)',
        'hsl(270, 100%, 60%)', 'hsl(45, 100%, 50%)', 'hsl(3, 100%, 60%)',
        'hsl(195, 100%, 50%)', 'hsl(315, 100%, 50%)', 'hsl(75, 100%, 50%)',
        'hsl(285, 90%, 60%)', 'hsl(15, 100%, 55%)', 'hsl(255, 100%, 65%)',
        'hsl(135, 90%, 55%)', 'hsl(345, 100%, 58%)', 'hsl(170, 95%, 50%)',
        'hsl(50, 100%, 55%)'
    ];

    // =========================================================================
    // --- Web Audio API Setup ---
    // =========================================================================
    const WebAudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;

    if (WebAudioContext) {
        try {
            audioContext = new WebAudioContext();
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
            // audioContext will remain null, subsequent checks will handle this
        }
    } else {
        console.warn("Web Audio API not supported by this browser.");
    }

    // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
    let sampleData = [ /* ... your data ... */
        { src: 'audio/KP_boomkit_100bpm_A1.webm', title: 'KP Boomkit A1', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A2.webm', title: 'KP Boomkit A2', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A3.webm', title: 'KP Boomkit A3', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A1.webm',  title: 'KP Boomkit A1', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A2.webm',  title: 'KP Boomkit A2', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A3.webm',  title: 'KP Boomkit A3', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_caziokit_129bpm_A.webm', title: 'KP CazioKit A', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_B.webm', title: 'KP CazioKit B', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_C.webm', title: 'KP CazioKit C', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_D.webm', title: 'KP CazioKit D', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_E_8bar.webm', title: 'KP CazioKit E (8 bar)', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_ABkit_113bpm_A1.webm', title: 'KP ABkit A1', details: '113 BPM | ABkit', category: 'abkit' },
        { src: 'audio/KP_ABkit_113bpm_A2.webm', title: 'KP ABkit A2', details: '113 BPM | ABkit', category: 'abkit' },
        { src: 'audio/KP_ABkit_113bpm_A3.webm', title: 'KP ABkit A3', details: '113 BPM | ABkit', category: 'abkit' },
    ];

    function getSortKeys(sample) { /* ... no changes ... */
        const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
        const bpmMatch = (sample.details && typeof sample.details === 'string') ? sample.details.match(/^(\d+)\s*BPM/i) : null;
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
        const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`;
        return { kitName, bpm, variation, groupIdentifier };
    }
    sampleData.sort((a, b) => { /* ... no changes ... */
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    const samplesGrid = document.querySelector('#kp-loops .samples-grid');
    const loopPlayers = new Map(); // Moved higher, to be populated during card generation

    if (samplesGrid) {
        samplesGrid.innerHTML = '';
        let previousGroupIdentifier = null;
        let currentRowContainer = null;
        let rowIndex = 0;

        sampleData.forEach(sample => {
            const currentKeys = getSortKeys(sample);
            // ... (row creation logic - no changes) ...
            if (currentKeys.groupIdentifier !== previousGroupIdentifier || currentRowContainer === null) {
                currentRowContainer = document.createElement('div');
                currentRowContainer.classList.add('sample-row');
                const uniqueColor = neonRowColors[rowIndex % neonRowColors.length];
                currentRowContainer.style.borderTopColor = uniqueColor;
                currentRowContainer.style.setProperty('--row-border-color', uniqueColor);
                samplesGrid.appendChild(currentRowContainer);
                previousGroupIdentifier = currentKeys.groupIdentifier;
                rowIndex++;
            }

            const card = document.createElement('div');
            card.classList.add('sample-card');
            card.dataset.group = currentKeys.groupIdentifier;
            card.dataset.originalBpm = currentKeys.bpm > 0 ? currentKeys.bpm : '';

            if (sample.src) {
                card.dataset.src = sample.src;
                if (sample.category) card.dataset.category = sample.category;
                const title = document.createElement('h3');
                title.textContent = sample.title; card.appendChild(title);
                const details = document.createElement('p');
                details.textContent = sample.details || ''; card.appendChild(details);
                const playButton = document.createElement('button');
                playButton.classList.add('play-pause-btn');
                playButton.setAttribute('tabindex', '-1');
                playButton.setAttribute('aria-label', `Play/Pause ${sample.title || 'sample'}`);
                const icon = document.createElement('i');
                icon.classList.add('fas', 'fa-play');
                playButton.appendChild(icon); card.appendChild(playButton);
                const loadingIndicator = document.createElement('span');
                loadingIndicator.classList.add('loading-indicator');
                loadingIndicator.style.display = 'none'; // Initially hidden
                loadingIndicator.textContent = 'Loading...'; card.appendChild(loadingIndicator);

                // *** NEW: Populate loopPlayers map here ***
                if (audioContext) { // Only setup player if Web Audio is available
                    const originalBPM = parseInt(card.dataset.originalBpm, 10) || currentKeys.bpm || 0;
                    if (originalBPM === 0) {
                        console.warn(`Sample "${sample.src}" has no discernible BPM for quantize. Defaults to normal speed.`);
                    }
                    const playerState = {
                        isPlaying: false,
                        audioBuffer: null,      // Will be populated by preload or first play
                        audioPromise: null,     // Stores promise for loading audio
                        sourceNode: null,
                        isLoading: false,       // For click-initiated loading UI
                        loadError: null,
                        src: sample.src,
                        button: playButton,
                        indicator: loadingIndicator,
                        icon: icon,
                        originalBPM: originalBPM
                    };
                    loopPlayers.set(card, playerState);
                } else { // Web Audio not available, disable button
                    playButton.disabled = true;
                    playButton.title = "Audio playback not available.";
                    loadingIndicator.textContent = "Audio N/A";
                    loadingIndicator.style.display = 'inline';
                    card.classList.add('audio-error');
                }

            } else { // Placeholder card
                card.classList.add('placeholder');
                const title = document.createElement('h3');
                title.textContent = sample.title || 'Coming Soon...'; card.appendChild(title);
                const details = document.createElement('p');
                details.textContent = sample.details || 'More variants pending'; card.appendChild(details);
                card.setAttribute('data-tooltip', sample.details || 'Loop not yet available');
            }
            currentRowContainer.appendChild(card);
        });
    } else {
        console.error("Could not find the '.samples-grid' element to populate samples.");
    }
    // --- END of Dynamic Sample Card Generation ---


    // ... (Mobile Nav, Placeholder marking, Animations, Intersection Observer, Hero, Filters, Flicker, Smooth Scroll - NO CHANGES TO THESE SECTIONS)


    // =========================================================================
    // --- Web Audio API Looping Logic & Quantize Feature ---
    // =========================================================================
    // loopPlayers map is already defined and populated above

    let quantizeEnabled = false;
    let globalTargetBPM = 120;

    const quantizeToggle = document.getElementById('quantize-toggle');
    const bpmInput = document.getElementById('bpm-input');

    if (bpmInput) {
        globalTargetBPM = parseInt(bpmInput.value, 10) || 120;
    }
    if (quantizeToggle) {
        quantizeEnabled = quantizeToggle.checked;
    }

    /**
     * Fetches and decodes audio data, managing a promise to prevent redundant operations.
     * @param {object} playerState - The state object for the player.
     * @returns {Promise<AudioBuffer>} - A promise that resolves with the AudioBuffer.
     */
    async function fetchAndDecodeAudio(playerState) {
        if (!audioContext) return Promise.reject(new Error("AudioContext not available."));
        if (playerState.audioPromise) {
            // console.log(`Awaiting existing load operation for ${playerState.src}`);
            return playerState.audioPromise; // Return existing promise
        }

        const loadPromise = (async () => {
            try {
                // console.log(`Fetching/Decoding: ${playerState.src}`);
                const response = await fetch(playerState.src);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} for ${playerState.src}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                playerState.audioBuffer = buffer;
                playerState.loadError = null;
                // console.log(`Successfully loaded/decoded: ${playerState.src}`);
                return buffer;
            } catch (error) {
                console.error(`Error loading/decoding ${playerState.src}:`, error);
                playerState.loadError = error;
                playerState.audioBuffer = null;
                playerState.audioPromise = null; // Clear promise on error to allow retry
                throw error;
            }
        })();
        playerState.audioPromise = loadPromise;
        return loadPromise;
    }

    /**
     * Initiates preloading for a single sample.
     * @param {object} playerState - The state object for the player.
     */
    async function preloadSample(playerState) {
        if (playerState.audioBuffer || playerState.audioPromise || !playerState.src) {
            return; // Already buffered, loading initiated, or no source
        }
        try {
            // console.log(`Preloading: ${playerState.src}`);
            await fetchAndDecodeAudio(playerState); // Populates audioBuffer on success
            // console.log(`Successfully preloaded: ${playerState.src}`);
        } catch (error) {
            // Error is logged by fetchAndDecodeAudio. playerState.loadError is set.
            // console.warn(`Preload failed for ${playerState.src}. Error stored in playerState.`);
        }
    }

    /**
     * Initiates preloading for all audio samples.
     */
    async function preloadAllSamples() {
        if (!audioContext) {
            console.warn("AudioContext not available. Skipping preload of samples.");
            return;
        }

        const preloadPromises = [];
        loopPlayers.forEach((playerState) => { // Card context not strictly needed here
            if (playerState.src && !playerState.audioBuffer && !playerState.audioPromise) {
                preloadPromises.push(preloadSample(playerState));
            }
        });

        if (preloadPromises.length > 0) {
            console.log(`Starting preload for ${preloadPromises.length} audio samples...`);
            // You could show a global "Buffering all samples..." UI element here

            await Promise.allSettled(preloadPromises);

            console.log("Preloading of all reachable samples complete.");
            // You could hide the global "Buffering all samples..." UI element here

            // Update indicators for any samples that failed to preload
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
                    } else {
                         // Not preloaded, no error yet - might be an issue or just wasn't processed.
                         // Or audioPromise is set but not yet resolved (shouldn't happen after allSettled).
                         // Generally, leave indicator hidden if no specific state.
                         // playerState.indicator.style.display = 'none';
                    }
                }
            });
        } else {
            console.log("No audio samples to preload or all already processed/pending.");
        }
    }

    // Call preloadAllSamples after cards and loopPlayers are set up
    if (audioContext && loopPlayers.size > 0) {
        preloadAllSamples();
    } else if (!audioContext) {
        console.warn("Audio features disabled as Web Audio API is not available or AudioContext failed to initialize.");
    }


    // Setup click listeners for sample cards
    loopPlayers.forEach((playerState, card) => { // loopPlayers only contains cards with audio src
        card.addEventListener('click', async () => {
            if (!audioContext) {
                alert("Audio playback is not available. Web Audio API might not be supported or failed to initialize.");
                return;
            }
            // currentCardState is playerState from the closure
            if (playerState.isLoading || playerState.loadError && !playerState.audioBuffer) { // Check loadError only if no buffer yet
                if (playerState.loadError) {
                    alert(`Could not play. Error: ${playerState.loadError.message}. Try reloading or check console.`);
                } else if (playerState.isLoading) {
                    console.log("Still loading, please wait.");
                }
                return;
            }

            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                } catch (e) {
                    console.error("Error resuming AudioContext:", e);
                    alert("Could not activate audio playback. Please interact with the page again.");
                    return;
                }
            }

            if (playerState.isPlaying) {
                stopLoop(card);
            } else {
                stopAllLoops(card);
                await playLoop(card);
            }
        });
    });


    function updateRateForAllCurrentlyPlayingLoops() { /* ... no changes ... */
        if (!audioContext || audioContext.state !== 'running') { return; }
        loopPlayers.forEach((playerState, card) => {
            if (playerState.isPlaying && playerState.sourceNode) {
                let newRate = 1.0;
                let reason = "normal speed";
                if (quantizeEnabled && playerState.originalBPM && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                    newRate = globalTargetBPM / playerState.originalBPM;
                    reason = `quantized to ${newRate.toFixed(2)}x (Target: ${globalTargetBPM} BPM, Original: ${playerState.originalBPM} BPM)`;
                } else if (quantizeEnabled) {
                    if (!playerState.originalBPM || playerState.originalBPM <= 0) {
                        reason = "normal speed (original BPM unknown/invalid for quantize)";
                    } else if (!globalTargetBPM || globalTargetBPM <= 0) {
                        reason = "normal speed (global target BPM invalid for quantize)";
                    }
                } else { reason = "normal speed (quantize disabled)"; }
                if (playerState.sourceNode.playbackRate.value !== newRate) {
                    playerState.sourceNode.playbackRate.value = newRate;
                }
            }
        });
    }

    if (quantizeToggle && bpmInput) { /* ... no changes to event listeners ... */
        quantizeToggle.addEventListener('change', () => {
            quantizeEnabled = quantizeToggle.checked;
            updateRateForAllCurrentlyPlayingLoops();
        });
        bpmInput.addEventListener('input', () => {
            const newBPM = parseInt(bpmInput.value, 10);
            const minBPM = parseInt(bpmInput.min, 10) || 30;
            const maxBPM = parseInt(bpmInput.max, 10) || 300;
            if (!isNaN(newBPM) && newBPM >= minBPM && newBPM <= maxBPM) {
                globalTargetBPM = newBPM;
                if (quantizeEnabled) { updateRateForAllCurrentlyPlayingLoops(); }
            } else if (bpmInput.value === "") { /* ... */ }
            else if (!isNaN(newBPM) && (newBPM < minBPM || newBPM > maxBPM)) { /* ... */ }
        });
    } else { console.warn("Quantize UI elements not found. Quantize feature disabled."); }


    async function playLoop(card) {
        const playerState = loopPlayers.get(card);
        if (!playerState || playerState.isPlaying || !audioContext || audioContext.state !== 'running') {
            // If it's a load error that PREVENTED getting an audioBuffer, it's caught by click handler before playLoop
            return;
        }

        playerState.isLoading = true; // For click-initiated load
        if (playerState.button) playerState.button.disabled = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        updateButtonUI(card, playerState, false); // Show play icon while loading
        card.classList.add('loading');
        card.classList.remove('audio-error'); // Attempt to clear previous error state on play attempt

        try {
            if (!playerState.audioBuffer) {
                // console.log(`PlayLoop: audioBuffer not found for ${playerState.src}, attempting load.`);
                await fetchAndDecodeAudio(playerState); // This will use/create/await audioPromise
                if (!playerState.audioBuffer) { // Should be set if fetchAndDecodeAudio resolved successfully
                    throw playerState.loadError || new Error("Audio buffer unavailable after load attempt.");
                }
                // console.log(`PlayLoop: audioBuffer acquired for ${playerState.src}`);
            }

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;

            if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                sourceNode.playbackRate.value = globalTargetBPM / playerState.originalBPM;
            } else {
                sourceNode.playbackRate.value = 1.0;
                if (quantizeEnabled && (!playerState.originalBPM || playerState.originalBPM <= 0)) {
                     // console.warn(`Quantize enabled but original BPM for ${playerState.src} is 0 or unknown. Playing at normal speed.`);
                }
            }

            sourceNode.connect(audioContext.destination);
            sourceNode.onended = () => {
                if (playerState.sourceNode === sourceNode) {
                     playerState.isPlaying = false;
                     playerState.sourceNode = null;
                     updateButtonUI(card, playerState, false);
                     card.classList.remove('playing');
                }
            };

            sourceNode.start(0);
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            updateButtonUI(card, playerState, true);
            card.classList.add('playing');
            playerState.loadError = null; // Clear any previous load error on successful play

        } catch (error) {
            console.error(`Error playing ${playerState.src}:`, error);
            playerState.loadError = error; // Ensure loadError is set from the catch
            playerState.isPlaying = false; playerState.audioBuffer = null; playerState.sourceNode = null; playerState.audioPromise = null; // Reset on critical error
            updateButtonUI(card, playerState, false);
            alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);
            card.classList.add('audio-error'); // Mark card with error
        } finally {
            playerState.isLoading = false;
            card.classList.remove('loading');
            if (playerState.indicator) {
                // Hide indicator unless there's a persistent load error shown by it
                if (playerState.loadError && playerState.indicator.textContent === 'Load Error') {
                    // Keep 'Load Error' visible
                } else {
                    playerState.indicator.style.display = 'none';
                }
            }
            if (playerState.button) playerState.button.disabled = false; // Always re-enable unless specific fatal error handling
            if (playerState.loadError && playerState.button) {
                 // Keep button enabled to allow retry, but update title if not already set by preload
                 if (!playerState.button.title.includes("Audio failed to load")) {
                    playerState.button.title = `Error: ${playerState.loadError.message}. Click to retry.`;
                 }
            }
        }
    }

    function stopLoop(card) { /* ... no changes ... */
        const playerState = loopPlayers.get(card);
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0);
                 // onended will fire and update state.
            } catch (e) {
                 console.warn(`Error stopping node for ${playerState.src}:`, e.message);
                 if (playerState.sourceNode) { playerState.sourceNode.onended = null; playerState.sourceNode = null; } // Hard reset
                 playerState.isPlaying = false;
                 updateButtonUI(card, playerState, false);
                 card.classList.remove('playing');
            }
        } else if (playerState && playerState.isPlaying) {
             playerState.isPlaying = false; playerState.sourceNode = null;
             updateButtonUI(card, playerState, false);
             card.classList.remove('playing');
        }
    }

    function stopAllLoops(exceptCard = null) { /* ... no changes ... */
        loopPlayers.forEach((state, card) => {
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card);
            }
        });
    }

    function updateButtonUI(card, playerState, isPlaying) { /* ... no changes ... */
        if (!card || !playerState || !playerState.button) { return; }
        const button = playerState.button;
        const icon = playerState.icon;
        const fullTitle = card.querySelector('h3')?.textContent.trim() || playerState.src.split('/').pop();
        if (icon) {
             icon.classList.toggle('fa-play', !isPlaying);
             icon.classList.toggle('fa-pause', isPlaying);
        } else { button.textContent = isPlaying ? 'Pause' : 'Play'; }
        const action = isPlaying ? 'Pause' : 'Play';
        button.setAttribute('aria-label', `${action} ${fullTitle}`);
        card.classList.toggle('playing', isPlaying);
    }
    // --- END of Web Audio API Logic ---

}); // === END of DOMContentLoaded ===