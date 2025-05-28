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


        { src: 'audio/KP_SwingKit_68bpm_A1.webm', title: 'KP SwingKit A1', details: '68 BPM | Swing', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_A2.webm', title: 'KP SwingKit A2', details: '68 BPM | Swing', category: 'swing' },

        { src: 'audio/KP_SwingKit_68bpm_PianoPerc.webm', title: 'KP SwingKit PianoPerc', details: '68 BPM | Percussion', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_SleepSYNTH.webm', title: 'KP SwingKit SleepSYNTH', details: '68 BPM | Synth', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_WitnessBASS.webm', title: 'KP SwingKit WitnessBASS', details: '68 BPM | Bass', category: 'swing' },

        // === Loops from screenshot ===
        { src: 'audio/KP_TAPkit_135bpm_B2.webm', title: 'KP TAPkit B2', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_B1.webm', title: 'KP TAPkit B1', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_A3.webm', title: 'KP TAPkit A3', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_A2.webm', title: 'KP TAPkit A2', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_A1.webm', title: 'KP TAPkit A1', details: '135 BPM | TAPkit', category: 'tapkit' },

        { src: 'audio/KP_VANkit_127_A4.webm', title: 'KP VANkit A4', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A3.webm', title: 'KP VANkit A3', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A2.webm', title: 'KP VANkit A2', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A1.webm', title: 'KP VANkit A1', details: '127 BPM | VANkit', category: 'vankit' },

        // === New ATHENSkit loops from screenshot ===
        { src: 'audio/KP_ATHENSkit_124_A1.webm', title: 'KP ATHENSkit A1', details: '124 BPM | ATHENSkit', category: 'athenskit' },
        { src: 'audio/KP_ATHENSkit_124_A2.webm', title: 'KP ATHENSkit A2', details: '124 BPM | ATHENSkit', category: 'athenskit' },
        { src: 'audio/KP_ATHENSkit_124_A3.webm', title: 'KP ATHENSkit A3', details: '124 BPM | ATHENSkit', category: 'athenskit' }
        
    ];

    let wargasmSamples = [
        // === Wargasm Samples to Play ===
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
    ];


    

     // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
    const loopPlayers = new Map(); // Shared map for all audio players

    // --- Sorting Logic Function ---
    function getSortKeys(sample) {
        const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
        const bpmMatch = (sample.details && typeof sample.details === 'string') ? sample.details.match(/^(\d+)\s*BPM/i) : null;
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
        const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`;
        return { kitName, bpm, variation, groupIdentifier };
    }

    // Sort KP Loops
    sampleData.sort((a, b) => {
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Sort Wargasm Samples
    wargasmSamples.sort((a, b) => {
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    // --- Function to Populate a Grid with Samples ---
    function populateSamplesInGrid(dataArray, gridElement, loopPlayersMap, audioCtx, neonColorsArray, getSortKeysFunc) {
        if (!gridElement) {
            console.error("Target grid element not found for populating samples.");
            return 0;
        }
        gridElement.innerHTML = ''; // Clear previous content
        let previousGroupIdentifier = null;
        let currentRowContainer = null;
        let rowIndex = 0; // For neon colors, specific to this grid, starts at 0 for each call
        let playersAddedThisCall = 0;

        dataArray.forEach(sample => {
            const currentKeys = getSortKeysFunc(sample);

            if (currentKeys.groupIdentifier !== previousGroupIdentifier || currentRowContainer === null) {
                currentRowContainer = document.createElement('div');
                currentRowContainer.classList.add('sample-row');
                const uniqueColor = neonColorsArray[rowIndex % neonColorsArray.length];
                currentRowContainer.style.borderTopColor = uniqueColor;
                currentRowContainer.style.setProperty('--row-border-color', uniqueColor);
                gridElement.appendChild(currentRowContainer);
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

                if (audioCtx) {
                    const originalBPM = parseInt(card.dataset.originalBpm, 10) || currentKeys.bpm || 0;
                    if (originalBPM === 0 && sample.src) {
                        console.warn(`Sample "${sample.src}" has no discernible BPM for quantize. Defaults to normal speed.`);
                    }
                    const playerState = {
                        isPlaying: false, audioBuffer: null, audioPromise: null, sourceNode: null,
                        gainNode: null,
                        isMutedDueToSolo: false,
                        isLoading: false, loadError: null, src: sample.src, button: playButton,
                        indicator: loadingIndicator, icon: icon, originalBPM: originalBPM
                    };
                    loopPlayersMap.set(card, playerState);
                    playersAddedThisCall++;
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
        console.log(`Populated ${playersAddedThisCall} players in grid targeted by: ${gridElement.parentElement.parentElement.id}`);
        return playersAddedThisCall;
    }

    // Get grid DOM elements
    const kpLoopsGridElement = document.querySelector('#kp-loops .samples-grid');
    const wargasmRemixGridElement = document.querySelector('#wargasm-remix .samples-grid');

    // Populate KP Loops grid
    if (kpLoopsGridElement) {
        populateSamplesInGrid(sampleData, kpLoopsGridElement, loopPlayers, audioContext, neonRowColors, getSortKeys);
    } else {
        console.error("KP Loops grid element (#kp-loops .samples-grid) not found.");
    }

    // Populate Wargasm Remix grid
    if (wargasmRemixGridElement) {
        populateSamplesInGrid(wargasmSamples, wargasmRemixGridElement, loopPlayers, audioContext, neonRowColors, getSortKeys);
    } else {
        console.error("Wargasm Remix grid element (#wargasm-remix .samples-grid) not found.");
    }
    
    console.log(`Total generated audio players across all grids: ${loopPlayers.size}.`);
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
    // IMPORTANT: Modify this to only target the KP Loops section if desired
    const filterButtons = document.querySelectorAll('.category-filter button, .category-filter .btn');
    if (filterButtons.length > 0) {
        // To make filter apply ONLY to KP Loops:
        const sampleCardsToFilter = document.querySelectorAll('#kp-loops .samples-grid .sample-card');
        // If you want filter to apply to both (and Wargasm 'funkit' loops would be hidden unless 'All' or 'funkit' filter is active):
        // const sampleCardsToFilter = document.querySelectorAll('.samples-grid .sample-card'); 
        
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

    // ADDED: Global Solo State
    let isSoloActive = false;
    let soloedCard = null; // Will store the DOM element of the card that is soloed


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
loopPlayers.forEach((playerState, card) => {
    card.addEventListener('click', async (event) => {
        if (!audioContext) {
            alert("Audio playback is not available. Web Audio API might not be supported or failed to initialize.");
            return;
        }

        // Define click types based on modifier keys
        const isAltShiftClick = event.altKey && event.shiftKey && !event.ctrlKey; // SOLO CLICK
        const isShiftOnlyClick = event.shiftKey && !event.altKey && !event.ctrlKey; // ADD TO MIX (Play without stopping others)
        const isNormalClick = !event.shiftKey && !event.altKey && !event.ctrlKey;   // PLAY EXCLUSIVELY (Stop others)
        // We're ignoring event.ctrlKey for now unless you want to reintroduce another combo

        console.log(`CLICK EVENT: ${playerState.src}. Alt: ${event.altKey}, Shift: ${event.shiftKey}, Ctrl: ${event.ctrlKey}. SoloActive: ${isSoloActive}. PlayerIsPlaying: ${playerState.isPlaying}`);

        if (playerState.isLoading) {
            console.log("PlayLoop EVENT: Still loading (isLoading true), please wait.");
            return;
        }
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
        // Ensure context is running after potential resume attempt
        if (audioContext.state !== 'running') {
             console.warn("PlayLoop EVENT: AudioContext not running even after resume attempt. Aborting.");
             alert("Audio system is not ready. Please try interacting with the page again or reload.");
             return;
        }


        // --- Handle SOLO click (Alt + Shift + Click) ---
        if (isAltShiftClick) {
            console.log("SOLO ACTION (Alt+Shift-Click) on card:", card.dataset.src);
            if (!isSoloActive) { // No solo currently active
                if (playerState.isPlaying) {
                    activateSolo(card, playerState);
                } else {
                    // If you want Alt+Shift+Click on a non-playing track to also play it and then solo:
                    await playLoop(card); // Attempt to play it
                    if (playerState.isPlaying) { // Check if playing successfully started
                        activateSolo(card, playerState);
                    } else {
                         console.log("SOLO: Alt+Shift-Clicked a non-playing track, but it failed to start. Cannot solo.");
                    }
                }
            } else { // Solo IS active
                if (soloedCard === card) { // Clicked the currently soloed card again (with Alt+Shift)
                    deactivateSolo();
                    // The track continues its previous state (playing or stopped)
                } else { // Clicked a different card (with Alt+Shift) while solo is active
                    deactivateSolo(); // Un-solo the previous one
                    if (playerState.isPlaying) {
                        activateSolo(card, playerState); // Solo the new one if it's already playing
                    } else {
                        // If you want Alt+Shift+Click on a non-playing track (while another is soloed)
                        // to play it and then solo:
                        await playLoop(card); // Attempt to play it
                        if (playerState.isPlaying) { // Check if playing successfully started
                            activateSolo(card, playerState);
                        } else {
                            console.log("SOLO: Alt+Shift-Clicked a different non-playing track while solo active, but it failed to start. Cannot solo new track.");
                        }
                    }
                }
            }
            return; // Solo action handled, exit the event listener
        }

        // --- If any other click type (Normal or Shift-Only) occurs and a solo is active on a DIFFERENT card, deactivate solo first ---
        // This ensures that playing a new track (either exclusively or adding to mix) clears any existing solo from *another* track.
        if ((isNormalClick || isShiftOnlyClick) && isSoloActive && soloedCard !== card) {
            console.log("Normal/Shift-Only Click while solo active on ANOTHER card. Deactivating solo first.");
            deactivateSolo();
        }
        // If solo was active on THIS card, and this is a normal/shift-only click,
        // it implies stopping it (if playing). The `onended` handler (triggered by stopLoop)
        // or the direct call to `deactivateSolo` in `stopLoop` for the soloed card will handle solo deactivation.

        // --- Proceed with Normal Click or Shift-Only Click logic ---
        if (playerState.isPlaying) {
            // If THIS card is playing, any click (Normal or Shift-Only, since Alt+Shift was handled) will stop it.
            // If it was the soloed card, its onended (via stopLoop) should deactivate solo.
            stopLoop(card);
        } else {
            // If THIS card is NOT playing, we want to start it.
            if (isNormalClick) {
                // Normal click stops all other NON-MUTED loops.
                // If solo was active and just deactivated, all loops are now audible and subject to stopping.
                stopAllLoops(card); // Stop other loops before playing this one
            }
            // For Shift-Only click, we don't stop others.
            // For Normal click, others have now been stopped.
            await playLoop(card); // Play the current card's loop
                                  // playLoop will respect solo state if this card IS the soloedCard
                                  // or if another card is soloed (it will start muted).
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


    async function playLoop(card) {
        const playerState = loopPlayers.get(card);
        // Initial check...
        if (!playerState || playerState.isPlaying || !audioContext || audioContext.state !== 'running') {
            if (audioContext && audioContext.state !== 'running') console.warn(`playLoop: AudioContext not running (state: ${audioContext.state}). Aborting play for ${playerState?.src}.`);
            else if (!playerState) console.warn(`playLoop: No playerState for card. Aborting.`);
            else if (playerState.isPlaying) console.warn(`playLoop: Already playing ${playerState.src}. Aborting.`);
            return;
        }
    
        playerState.isLoading = true;
        if (playerState.button) playerState.button.disabled = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        // updateButtonUI(card, playerState, false); // Show play icon -- UI update will happen later or if error
        card.classList.add('loading');
        card.classList.remove('audio-error');
    
        try {
            if (!playerState.audioBuffer) {
                // ... (fetchAndDecodeAudio logic from your original code) ...
                console.log(`playLoop: Buffer NOT present for ${playerState.src}. Will await fetchAndDecodeAudio.`);
                await fetchAndDecodeAudio(playerState);
                if (!playerState.audioBuffer) {
                    console.error(`playLoop: FATAL - Audio buffer still null after fetchAndDecodeAudio for ${playerState.src}`, playerState.loadError);
                    throw playerState.loadError || new Error("Audio buffer unavailable after load attempt.");
                }
                console.log(`playLoop: Buffer acquired ON DEMAND for ${playerState.src}.`);
            } else {
                console.log(`playLoop: Buffer was ALREADY PRESENT for ${playerState.src}.`);
            }
    
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;
    
            if (quantizeEnabled && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                sourceNode.playbackRate.value = globalTargetBPM / playerState.originalBPM;
            } else {
                sourceNode.playbackRate.value = 1.0;
            }
    
            // MODIFIED: GainNode setup
            const gainNode = audioContext.createGain();
            playerState.gainNode = gainNode; // Store it
    
            if (isSoloActive && soloedCard !== card) {
                gainNode.gain.value = 0; // Start muted if another track is soloed
                playerState.isMutedDueToSolo = true;
                console.log(`PLAYLOOP (SOLO): ${playerState.src} starting muted as another is soloed.`);
            } else {
                gainNode.gain.value = 1; // Default to full volume
                playerState.isMutedDueToSolo = false;
            }
            // If this card *is* the one being soloed, activateSolo will handle setting its gain to 1 correctly.
    
            sourceNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
    
            sourceNode.onended = () => {
                // Check if this specific sourceNode instance is the one that ended
                if (playerState.sourceNode === sourceNode) {
                    console.log(`ONENDED: ${playerState.src}`);
                    const wasPlaying = playerState.isPlaying; // Capture before reset
                    const wasSoloedTrack = isSoloActive && soloedCard === card;
    
                    playerState.isPlaying = false;
                    playerState.sourceNode = null;
                    // updateButtonUI(card, playerState, false); // UI update will happen after solo check
                    // card.classList.remove('playing'); // UI update will happen after solo check
    
                    if (playerState.gainNode) {
                        playerState.gainNode.disconnect();
                        playerState.gainNode = null;
                    }
                    const wasMutedBySolo = playerState.isMutedDueToSolo;
                    playerState.isMutedDueToSolo = false;
    
                    // If the track that ended was the soloed one, deactivate solo mode.
                    if (wasPlaying && wasSoloedTrack) {
                        console.log(`ONENDED (SOLO): Soloed track ${playerState.src} ended. Deactivating solo.`);
                        deactivateSolo(); // This will also update UIs
                    } else {
                        // If not the soloed track or solo wasn't active, just update this card's UI
                        updateButtonUI(card, playerState, false);
                        card.classList.remove('playing', 'muted-by-solo', 'soloed');
                    }
                }
            };
    
            sourceNode.start(0);
            console.log(`playLoop: Started playback for ${playerState.src}`);
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            updateButtonUI(card, playerState, true); // Update UI now that it's playing
            card.classList.add('playing');
            playerState.loadError = null;
    
        } catch (error) {
            console.error(`playLoop: Error playing ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.isPlaying = false;
            playerState.audioBuffer = null;
            playerState.audioPromise = null;
            playerState.sourceNode = null;
            if (playerState.gainNode) {
                playerState.gainNode.disconnect();
                playerState.gainNode = null;
            }
            playerState.isMutedDueToSolo = false;
            updateButtonUI(card, playerState, false);
            alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);
            card.classList.add('audio-error');
        } finally {
            playerState.isLoading = false;
            card.classList.remove('loading');
            if (playerState.indicator) {
                if (playerState.loadError && playerState.indicator.textContent === 'Load Error') {
                    // Keep 'Load Error' visible
                } else {
                    playerState.indicator.style.display = 'none';
                }
            }
            if (playerState.button) playerState.button.disabled = false;
            // ... (rest of finally block)
        }
    }

    function stopLoop(card) {
        const playerState = loopPlayers.get(card);
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                console.log(`stopLoop: Attempting to stop ${playerState.src}`);
                playerState.sourceNode.stop(0);
                // onended will fire, which should update state including solo and gain node.
            } catch (e) {
                console.warn(`stopLoop: Error stopping node for ${playerState.src}:`, e.message);
                // Force reset state if stop fails badly AND onended doesn't fire
                if (playerState.sourceNode) { playerState.sourceNode.onended = null; /* avoid double handling */ }
    
                const wasSoloedAndThisCard = isSoloActive && soloedCard === card;
    
                playerState.isPlaying = false;
                playerState.sourceNode = null;
                if (playerState.gainNode) {
                    playerState.gainNode.disconnect();
                    playerState.gainNode = null;
                }
                playerState.isMutedDueToSolo = false;
                updateButtonUI(card, playerState, false);
                card.classList.remove('playing', 'soloed', 'muted-by-solo');
    
                if (wasSoloedAndThisCard) {
                    console.warn(`stopLoop (SOLO): Forcefully deactivating solo for ${playerState.src} due to stop error.`);
                    deactivateSolo(); // This will update other UIs
                }
            }
        } else if (playerState && playerState.isPlaying) {
            console.warn(`stopLoop: Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode. Resetting.`);
            playerState.isPlaying = false; playerState.sourceNode = null;
            if (playerState.gainNode) { playerState.gainNode.disconnect(); playerState.gainNode = null; }
            playerState.isMutedDueToSolo = false;
            updateButtonUI(card, playerState, false);
            card.classList.remove('playing', 'soloed', 'muted-by-solo');
        }
    }

    function stopAllLoops(exceptCard = null) {
        loopPlayers.forEach((state, card) => {
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card);
            }
        });
    }

    // --- SOLO Functions ---
function activateSolo(cardToSolo, soloPlayerState) {
    if (!audioContext || !soloPlayerState.isPlaying || !soloPlayerState.gainNode) {
        console.warn("SOLO: Cannot activate - soloPlayerState not playing, no gainNode, or audioContext missing.");
        return;
    }

    console.log(`SOLO: Activating for ${soloPlayerState.src}`);
    isSoloActive = true;
    soloedCard = cardToSolo;

    // Ensure the soloed track is at full volume (use ramp for smoothness)
    // It should already be at 1 if it was just started, but this is a safeguard
    // and handles cases where it might have been muted for other reasons.
    soloPlayerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015); // Small ramp
    soloPlayerState.isMutedDueToSolo = false; // Explicitly mark it as not muted by solo logic

    // Mute other playing tracks
    loopPlayers.forEach((otherPlayerState, otherCard) => {
        if (otherCard !== cardToSolo && otherPlayerState.isPlaying && otherPlayerState.gainNode) {
            otherPlayerState.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.015);
            otherPlayerState.isMutedDueToSolo = true;
            console.log(`SOLO: Muting ${otherPlayerState.src}`);
            otherCard.classList.add('muted-by-solo');
        } else if (otherCard === cardToSolo) {
            // Ensure the soloed card itself is not marked as muted by solo
            otherCard.classList.remove('muted-by-solo');
        }
        // The UI for the soloed card will be updated below.
        // UI for other cards will be updated by their next updateButtonUI call, or if needed, explicitly here.
        // For now, we assume updateButtonUI will be called if their state changes (e.g. they stop).
    });

    cardToSolo.classList.add('soloed');
    updateButtonUI(cardToSolo, soloPlayerState, soloPlayerState.isPlaying); // Update UI specifically for the newly soloed card
}

function deactivateSolo() {
    if (!audioContext || !isSoloActive) {
        // console.log("SOLO: Deactivate called but no solo active or no audioContext.");
        return;
    }
    console.log("SOLO: Deactivating solo.");

    const previouslySoloedCardElement = soloedCard; // Store reference before resetting

    isSoloActive = false;
    soloedCard = null;

    // Unmute all tracks that were muted due to solo, and reset UI classes
    loopPlayers.forEach((playerState, card) => {
        if (playerState.isMutedDueToSolo && playerState.gainNode) {
            // Only restore volume if the track is actually still considered playing.
            // If it was stopped while solo was active, its gainNode might be null or it shouldn't be unmuted.
            if (playerState.isPlaying) {
                playerState.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
                console.log(`SOLO: Unmuting ${playerState.src}`);
            }
            playerState.isMutedDueToSolo = false; // Reset the flag
        }
        // Clean up UI classes from all cards
        card.classList.remove('muted-by-solo');
        card.classList.remove('soloed');
        // Refresh UI for all cards to reflect the solo deactivation
        updateButtonUI(card, playerState, playerState.isPlaying);
    });

    // It's possible the previouslySoloedCardElement's UI wasn't fully updated if it stopped
    // exactly when solo was deactivated. The loop above should generally handle it,
    // but an explicit update can be a safeguard if issues are seen.
    // if (previouslySoloedCardElement) {
    //     const ps = loopPlayers.get(previouslySoloedCardElement);
    //     if (ps) updateButtonUI(previouslySoloedCardElement, ps, ps.isPlaying);
    // }
}
// --- END SOLO Functions ---

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