/**
 * Main JavaScript file for website interactions and enhancements.
 * Includes: Mobile Navigation, Animations, Audio Playback (Web Audio API),
 * Filtering, Quantize feature, and other UI effects.
 */
document.addEventListener('DOMContentLoaded', () => {

    console.log("DOMContentLoaded event fired.");

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
            if (audioContext) {
                console.log(`AudioContext created. Initial state: ${audioContext.state}`);
            }
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
        }
    } else {
        console.warn("Web Audio API not supported by this browser.");
    }

    // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
    let sampleData = [
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
    
        // === New Samples ===
        { src: 'audio/KP_FunKit_101bpm_A1.webm', title: 'KP FunKit A1', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_A2.webm', title: 'KP FunKit A2', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_B1.webm', title: 'KP FunKit B1', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_B2.webm', title: 'KP FunKit B2', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass1.webm', title: 'KP FunKit Bass1', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass2.webm', title: 'KP FunKit Bass2', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass3.webm', title: 'KP FunKit Bass3', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass4.webm', title: 'KP FunKit Bass4', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_arp1.webm', title: 'KP FunKit Arp1', details: '101 BPM | Arp', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_arp2.webm', title: 'KP FunKit Arp2', details: '101 BPM | Arp', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_pulse1.webm', title: 'KP FunKit Pulse1', details: '101 BPM | Pulse', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_pulse2.webm', title: 'KP FunKit Pulse2', details: '101 BPM | Pulse', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_synth1.webm', title: 'KP FunKit Synth1', details: '101 BPM | Synth', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_synth2.webm', title: 'KP FunKit Synth2', details: '101 BPM | Synth', category: 'funkit' },
    
        { src: 'audio/KP_SwingKit_68bpm_A1.webm', title: 'KP SwingKit A1', details: '68 BPM | Swing', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_A2.webm', title: 'KP SwingKit A2', details: '68 BPM | Swing', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_PianoPerc.webm', title: 'KP SwingKit PianoPerc', details: '68 BPM | Percussion', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_SleepSYNTH.webm', title: 'KP SwingKit SleepSYNTH', details: '68 BPM | Synth', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_WitnessBASS.webm', title: 'KP SwingKit WitnessBASS', details: '68 BPM | Bass', category: 'swing' },
    ];
    

    // --- Sorting Logic ---
    function getSortKeys(sample) {
        const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
        const bpmMatch = (sample.details && typeof sample.details === 'string') ? sample.details.match(/^(\d+)\s*BPM/i) : null;
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
        const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`;
        return { kitName, bpm, variation, groupIdentifier };
    }
    sampleData.sort((a, b) => {
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    const samplesGrid = document.querySelector('#kp-loops .samples-grid');
    const loopPlayers = new Map();

    if (samplesGrid) {
        samplesGrid.innerHTML = '';
        let previousGroupIdentifier = null;
        let currentRowContainer = null;
        let rowIndex = 0;

        sampleData.forEach(sample => {
            const currentKeys = getSortKeys(sample);

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
                const titleEl = document.createElement('h3');
                titleEl.textContent = sample.title; card.appendChild(titleEl);
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
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = 'Loading...'; card.appendChild(loadingIndicator);

                if (audioContext) {
                    const originalBPM = parseInt(card.dataset.originalBpm, 10) || currentKeys.bpm || 0;
                    if (originalBPM === 0 && sample.src) {
                        console.warn(`Sample "${sample.src}" has no discernible BPM for quantize. Defaults to normal speed.`);
                    }
                    const playerState = {
                        isPlaying: false, audioBuffer: null, audioPromise: null, sourceNode: null,
                        isLoading: false, loadError: null, src: sample.src, button: playButton,
                        indicator: loadingIndicator, icon: icon, originalBPM: originalBPM
                    };
                    loopPlayers.set(card, playerState);
                } else {
                    playButton.disabled = true; playButton.title = "Audio playback not available.";
                    loadingIndicator.textContent = "Audio N/A"; loadingIndicator.style.display = 'inline';
                    card.classList.add('audio-error');
                }

            } else { // Placeholder card
                card.classList.add('placeholder');
                const titleEl = document.createElement('h3');
                titleEl.textContent = sample.title || 'Coming Soon...'; card.appendChild(titleEl);
                const details = document.createElement('p');
                details.textContent = sample.details || 'More variants pending'; card.appendChild(details);
                card.setAttribute('data-tooltip', sample.details || 'Loop not yet available');
            }
            currentRowContainer.appendChild(card);
        });
        console.log(`Generated ${loopPlayers.size} audio players (cards with audio src).`);
    } else {
        console.error("Could not find the '.samples-grid' element to populate samples.");
    }
    // --- END of Dynamic Sample Card Generation ---


    // --- Mobile Nav Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav');

    if (navToggle && nav) {
        const icon = navToggle.querySelector('i');
        const toggleNav = () => {
            nav.classList.toggle('active');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        };
        navToggle.addEventListener('click', toggleNav);
        nav.querySelectorAll('a').forEach(link =>
            link.addEventListener('click', () => {
                if (nav.classList.contains('active')) {
                    toggleNav();
                }
            })
        );
    }

    // --- Placeholder marking ---
    document.querySelectorAll('.sample-card:not([data-src])').forEach(item => {
        if (!item.classList.contains('placeholder')) {
            item.classList.add('placeholder');
        }
        if (!item.hasAttribute('data-tooltip')) {
             item.setAttribute('data-tooltip', 'Coming Soon');
        }
        item.querySelectorAll('button').forEach(el => el.disabled = true);
    });

    // --- Animate on scroll (Simple fallback) ---
    const animateOnScroll = () => {
        const elementsToAnimate = document.querySelectorAll('.fade-in, .slide-up');
        elementsToAnimate.forEach(el => {
            if (el.style.animationPlayState !== 'running' && el.style.animationPlayState !== 'paused') {
                if (el.getBoundingClientRect().top < window.innerHeight - 50) {
                     if (el.style.opacity !== '1') {
                         el.style.opacity = '1';
                         el.style.transform = 'translateY(0)';
                     }
                 }
            }
        });
    };
    animateOnScroll(); // Initial check
    window.addEventListener('scroll', animateOnScroll);

    // --- Intersection Observer for Performance-Optimized Animations ---
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const targetElement = entry.target;
                const styles = window.getComputedStyle(targetElement);
                if (styles.animationName && styles.animationName !== 'none') {
                     targetElement.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
                }
                else if (entry.isIntersecting) {
                    if (targetElement.style.opacity !== '1') {
                        targetElement.style.opacity = '1';
                        targetElement.style.transform = 'translateY(0)';
                    }
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
             const styles = window.getComputedStyle(el);
             if (styles.animationName && styles.animationName !== 'none') {
                 el.style.animationPlayState = 'paused';
             } else {
                 el.style.opacity = '0';
                 if (el.classList.contains('slide-up')) {
                    el.style.transform = 'translateY(20px)';
                 }
             }
             observer.observe(el);
        });
    } else {
        console.log("Intersection Observer not supported, using scroll fallback for animations.");
    }


    // --- Hero Typewriter Effect ---
    const heroTextElement = document.querySelector('.hero-text h1');
    if (heroTextElement) {
        const originalText = heroTextElement.textContent || "";
        heroTextElement.textContent = '';
        let charIndex = 0;
        const typingSpeed = 80;

        const typeWriterEffect = () => {
            if (charIndex < originalText.length) {
                heroTextElement.textContent += originalText.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriterEffect, typingSpeed);
            }
        };
        setTimeout(typeWriterEffect, 300); // Delay before starting
    }

    // --- Category Filter for Samples ---
    const filterButtons = document.querySelectorAll('.category-filter button, .category-filter .btn');
    if (filterButtons.length > 0) {
        const sampleCardsToFilter = document.querySelectorAll('.samples-grid .sample-card');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const selectedCategory = button.dataset.category;
                sampleCardsToFilter.forEach(card => {
                    const cardCategory = card.dataset.category;
                    const isPlaceholder = card.classList.contains('placeholder');
                    const shouldShow = (selectedCategory === 'all' || isPlaceholder || cardCategory === selectedCategory);
                    card.style.display = shouldShow ? '' : 'none';
                });
            });
        });
        const allButton = document.querySelector('.category-filter button[data-category="all"]');
        if (allButton) {
            allButton.click(); // Activate "all" filter by default
        }
    } else {
        console.log("No category filter buttons found in the HTML.");
    }


    // --- Retro Computer Screen Flicker Effect ---
    const computerScreen = document.querySelector('.computer-screen');
    if (computerScreen) {
        const flickerInterval = 5000 + Math.random() * 2000;
        const flickerDuration = 80 + Math.random() * 50;
        setInterval(() => {
            computerScreen.classList.add('flicker');
            setTimeout(() => {
                computerScreen.classList.remove('flicker');
            }, flickerDuration);
        }, flickerInterval);
    }

    // --- Smooth Anchor Scrolling ---
    document.querySelectorAll('a[href^="#"]').forEach(anchorLink => {
        anchorLink.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#')) {
                try {
                    const targetElement = document.querySelector(hrefAttribute);
                    if (targetElement) {
                        e.preventDefault();
                        const headerOffset = 80;
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                         if (nav?.classList.contains('active')) { // Optional: Close mobile nav if open
                            navToggle?.click();
                         }
                    } else {
                        console.warn(`Smooth scroll target not found for selector: ${hrefAttribute}`);
                    }
                } catch (error) {
                     console.error(`Error finding smooth scroll target element with selector "${hrefAttribute}":`, error);
                }
            }
        });
    });


    // =========================================================================
    // --- Web Audio API Looping Logic & Quantize Feature ---
    // =========================================================================
    let quantizeEnabled = false;
    let globalTargetBPM = 120;
    const quantizeToggle = document.getElementById('quantize-toggle');
    const bpmInput = document.getElementById('bpm-input');

    if (bpmInput) globalTargetBPM = parseInt(bpmInput.value, 10) || 120;
    if (quantizeToggle) quantizeEnabled = quantizeToggle.checked;

    async function fetchAndDecodeAudio(playerState) {
        if (!audioContext) return Promise.reject(new Error("AudioContext not available."));
        if (playerState.audioPromise) {
            // console.log(`fetchAndDecodeAudio: Awaiting existing load operation for ${playerState.src}`);
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
                playerState.audioPromise = null; // Clear promise on error to allow retry
                throw error;
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
        console.log(`preloadSample: Initiating for ${playerState.src}`);
        try {
            await fetchAndDecodeAudio(playerState);
            console.log(`preloadSample: Successfully preloaded ${playerState.src}`);
        } catch (error) {
            console.warn(`preloadSample: Preload failed for ${playerState.src}. Error stored.`);
        }
    }

    async function preloadAllSamples() {
        if (!audioContext) {
            console.warn("preloadAllSamples: AudioContext not available. Skipping.");
            return;
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
            console.log(`preloadAllSamples: Starting preload for ${preloadPromises.length} audio samples. AudioContext state: ${audioContext.state}`);
            await Promise.allSettled(preloadPromises);
            console.log("preloadAllSamples: Preloading of all reachable samples complete.");

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
            console.log("preloadAllSamples: No new audio samples to preload (all might be buffered or already pending a load initiated elsewhere).");
        }
    }

    // Call preloadAllSamples after cards and loopPlayers are set up
    if (audioContext && loopPlayers.size > 0) {
        preloadAllSamples();
    } else if (!audioContext) {
        console.warn("Audio features disabled as Web Audio API is not available or AudioContext failed to initialize. Preload skipped.");
    } else {
        console.log("No loop players found to preload (loopPlayers map is empty).");
    }


    // Setup click listeners for sample cards
    loopPlayers.forEach((playerState, card) => { // loopPlayers only contains cards with audio src
        card.addEventListener('click', async () => {
            if (!audioContext) {
                alert("Audio playback is not available. Web Audio API might not be supported or failed to initialize.");
                return;
            }
            console.log(`PlayLoop EVENT: Clicked ${playerState.src}. Buffer present: ${!!playerState.audioBuffer}, Promise exists: ${!!playerState.audioPromise}, Load Error: ${playerState.loadError?.message || 'none'}`);

            if (playerState.isLoading) {
                console.log("PlayLoop EVENT: Still loading (isLoading true), please wait.");
                return;
            }
            // If there's a load error AND no buffer yet, show an alert and stop.
            // If there's a load error but a buffer somehow exists (unlikely), it might still try to play.
            if (playerState.loadError && !playerState.audioBuffer) {
                 alert(`Could not play. Error: ${playerState.loadError.message}. Try reloading or check console.`);
                 return;
            }

            if (audioContext.state === 'suspended') {
                console.log("PlayLoop EVENT: AudioContext is suspended, attempting to resume.");
                try {
                    await audioContext.resume();
                    console.log(`PlayLoop EVENT: AudioContext resumed. New state: ${audioContext.state}`);
                } catch (e) {
                    console.error("PlayLoop EVENT: Error resuming AudioContext:", e);
                    alert("Could not activate audio playback. Please interact with the page again.");
                    return;
                }
            }

            if (playerState.isPlaying) {
                stopLoop(card);
            } else {
                stopAllLoops(card); // Stop other loops before playing a new one
                await playLoop(card); // playLoop is the function that actually plays or loads if needed
            }
        });
    });


    function updateRateForAllCurrentlyPlayingLoops() {
        if (!audioContext || audioContext.state !== 'running') {
            return;
        }
        loopPlayers.forEach((playerState) => {
            if (playerState.isPlaying && playerState.sourceNode) {
                let newRate = 1.0;
                if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                    newRate = globalTargetBPM / playerState.originalBPM;
                }
                if (playerState.sourceNode.playbackRate.value !== newRate) {
                    playerState.sourceNode.playbackRate.value = newRate;
                }
            }
        });
    }

    // Event Listeners for Quantize Controls
    if (quantizeToggle && bpmInput) {
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
                if (quantizeEnabled) {
                    updateRateForAllCurrentlyPlayingLoops();
                }
            }
        });
    } else {
        console.warn("Quantize UI elements (toggle or BPM input) not found. Quantize feature disabled.");
    }


    async function playLoop(card) { // This is the core function called by the event listener
        const playerState = loopPlayers.get(card);
        // Initial check, though event listener above has more detailed preliminary checks
        if (!playerState || playerState.isPlaying || !audioContext || audioContext.state !== 'running') {
            if (audioContext && audioContext.state !== 'running') console.warn(`playLoop: AudioContext not running (state: ${audioContext.state}). Aborting play for ${playerState?.src}.`);
            else if (!playerState) console.warn(`playLoop: No playerState for card. Aborting.`);
            else if (playerState.isPlaying) console.warn(`playLoop: Already playing ${playerState.src}. Aborting.`);
            return;
        }

        playerState.isLoading = true; // For click-initiated load or re-check
        if (playerState.button) playerState.button.disabled = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        updateButtonUI(card, playerState, false); // Show play icon while (potentially) loading
        card.classList.add('loading');
        card.classList.remove('audio-error'); // Attempt to clear previous error state on play attempt

        try {
            if (!playerState.audioBuffer) {
                console.log(`playLoop: Buffer NOT present for ${playerState.src}. Will await fetchAndDecodeAudio.`);
                await fetchAndDecodeAudio(playerState); // This will use/create/await audioPromise
                if (!playerState.audioBuffer) { // Should be set if fetchAndDecodeAudio resolved successfully
                    console.error(`playLoop: FATAL - Audio buffer still null after fetchAndDecodeAudio for ${playerState.src}`, playerState.loadError);
                    throw playerState.loadError || new Error("Audio buffer unavailable after load attempt.");
                }
                console.log(`playLoop: Buffer acquired ON DEMAND for ${playerState.src}.`);
            } else {
                console.log(`playLoop: Buffer was ALREADY PRESENT for ${playerState.src}. Using preloaded buffer.`);
            }

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;

            if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                sourceNode.playbackRate.value = globalTargetBPM / playerState.originalBPM;
            } else {
                sourceNode.playbackRate.value = 1.0;
            }

            sourceNode.connect(audioContext.destination);
            sourceNode.onended = () => {
                // Check if this specific sourceNode instance is the one that ended
                if (playerState.sourceNode === sourceNode) {
                     playerState.isPlaying = false;
                     playerState.sourceNode = null; // Clear the ended node
                     updateButtonUI(card, playerState, false);
                     card.classList.remove('playing');
                }
            };

            sourceNode.start(0);
            console.log(`playLoop: Started playback for ${playerState.src}`);
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            updateButtonUI(card, playerState, true);
            card.classList.add('playing');
            playerState.loadError = null; // Clear any previous load error on successful play

        } catch (error) {
            console.error(`playLoop: Error playing ${playerState.src}:`, error);
            playerState.loadError = error; // Ensure loadError is set from the catch
            playerState.isPlaying = false;
            // Critical error: Reset buffer and promise to allow a full retry if user clicks again
            playerState.audioBuffer = null;
            playerState.audioPromise = null;
            playerState.sourceNode = null;
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
            if (playerState.button) playerState.button.disabled = false;
            if (playerState.loadError && playerState.button) {
                 if (!playerState.button.title.includes("Audio failed to load")) {
                    playerState.button.title = `Error: ${playerState.loadError.message}. Click to retry.`;
                 }
            }
        }
    }

    function stopLoop(card) {
        const playerState = loopPlayers.get(card);
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0);
                 // onended will fire, which should update state.
                 // Explicitly setting here too for immediate UI responsiveness can be an option,
                 // but usually onended is sufficient.
                 // playerState.isPlaying = false;
                 // updateButtonUI(card, playerState, false);
                 // card.classList.remove('playing');
                 console.log(`stopLoop: Stopped: ${playerState.src}`);
            } catch (e) {
                 console.warn(`stopLoop: Error stopping node for ${playerState.src}:`, e.message);
                 // Force reset state if stop fails badly
                 if (playerState.sourceNode) { playerState.sourceNode.onended = null; playerState.sourceNode = null; }
                 playerState.isPlaying = false;
                 updateButtonUI(card, playerState, false);
                 card.classList.remove('playing');
            }
        } else if (playerState && playerState.isPlaying) {
             // This case indicates an inconsistent state
             console.warn(`stopLoop: Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode. Resetting.`);
             playerState.isPlaying = false; playerState.sourceNode = null;
             updateButtonUI(card, playerState, false);
             card.classList.remove('playing');
        }
    }

    function stopAllLoops(exceptCard = null) {
        loopPlayers.forEach((state, card) => {
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card);
            }
        });
    }

    function updateButtonUI(card, playerState, isPlaying) {
        if (!card || !playerState || !playerState.button) {
            return;
        }
        const button = playerState.button;
        const icon = playerState.icon;
        const fullTitle = card.querySelector('h3')?.textContent.trim() || playerState.src.split('/').pop();

        if (icon) {
             icon.classList.toggle('fa-play', !isPlaying);
             icon.classList.toggle('fa-pause', isPlaying);
        } else {
            button.textContent = isPlaying ? 'Pause' : 'Play';
        }
        const action = isPlaying ? 'Pause' : 'Play';
        button.setAttribute('aria-label', `${action} ${fullTitle}`);
        card.classList.toggle('playing', isPlaying);
    }
    // --- END of Web Audio API Logic ---

    console.log("End of DOMContentLoaded script execution.");
}); // === END of DOMContentLoaded ===