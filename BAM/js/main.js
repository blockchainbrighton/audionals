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

    // --- Sorting Logic ---
    function getSortKeys(sample) {
        const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
        // Ensure details is a string before trying to match, or default to no match
        const bpmMatch = (sample.details && typeof sample.details === 'string') ? sample.details.match(/^(\d+)\s*BPM/i) : null;
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0; // Default to 0 if BPM not found
        const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`; // Handle case where BPM might be 0
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

    if (samplesGrid) {
        samplesGrid.innerHTML = '';
        let previousGroupIdentifier = null;
        let currentRowContainer = null;
        let rowIndex = 0;

        sampleData.forEach(sample => {
            const currentKeys = getSortKeys(sample);
            const currentGroupIdentifier = currentKeys.groupIdentifier;

            if (currentGroupIdentifier !== previousGroupIdentifier || currentRowContainer === null) {
                currentRowContainer = document.createElement('div');
                currentRowContainer.classList.add('sample-row');
                const uniqueColor = neonRowColors[rowIndex % neonRowColors.length];
                currentRowContainer.style.borderTopColor = uniqueColor;
                currentRowContainer.style.setProperty('--row-border-color', uniqueColor);
                samplesGrid.appendChild(currentRowContainer);
                previousGroupIdentifier = currentGroupIdentifier;
                rowIndex++;
            }

            const card = document.createElement('div');
            card.classList.add('sample-card');
            card.dataset.group = currentGroupIdentifier;

            card.dataset.originalBpm = currentKeys.bpm > 0 ? currentKeys.bpm : ''; // Store original BPM

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
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = 'Loading...'; card.appendChild(loadingIndicator);
            } else {
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



    // --- Mobile Nav Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav');

    if (navToggle && nav) {
        const icon = navToggle.querySelector('i'); // Assumes Font Awesome icon
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
    animateOnScroll();
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
        setTimeout(typeWriterEffect, 300);
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
            allButton.click();
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
                         if (nav?.classList.contains('active')) {
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

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    const loopPlayers = new Map();

    let quantizeEnabled = false;
    let globalTargetBPM = 120;

    const quantizeToggle = document.getElementById('quantize-toggle');
    const bpmInput = document.getElementById('bpm-input');

    if (bpmInput) {
        globalTargetBPM = parseInt(bpmInput.value, 10) || 120;
        // Initialize toggle state based on its 'checked' attribute in HTML if needed
        // quantizeEnabled = quantizeToggle ? quantizeToggle.checked : false;
    }
    // If quantizeToggle is present and checked by default in HTML, update quantizeEnabled
    if (quantizeToggle) {
        quantizeEnabled = quantizeToggle.checked;
    }


    const sampleCardsWithAudio = document.querySelectorAll('.sample-card[data-src]');

    sampleCardsWithAudio.forEach(card => {
        const playButton = card.querySelector('.play-pause-btn');
        const loadingIndicator = card.querySelector('.loading-indicator');
        const audioSrc = card.dataset.src;
        const buttonIcon = playButton?.querySelector('i');

        const { bpm: originalBPMFromFile } = getSortKeys({ title: card.querySelector('h3')?.textContent || '', details: card.querySelector('p')?.textContent || '' });
        const originalBPM = parseInt(card.dataset.originalBpm, 10) || originalBPMFromFile || 0;
        if (originalBPM === 0 && audioSrc) {
            console.warn(`Sample "${audioSrc}" has no discernible BPM. Quantize feature will default it to normal speed.`);
        }

        if (!playButton || !audioSrc || !loadingIndicator) {
             console.warn('Sample card skipped during audio setup: Missing required elements or data-src.', { card, audioSrc });
             card.style.opacity = '0.6';
             card.title = 'Audio setup incomplete for this sample.';
             return;
        }

        const playerState = {
            isPlaying: false,
            audioBuffer: null,
            sourceNode: null,
            isLoading: false,
            loadError: null,
            src: audioSrc,
            button: playButton,
            indicator: loadingIndicator,
            icon: buttonIcon,
            originalBPM: originalBPM
        };
        loopPlayers.set(card, playerState);

        card.addEventListener('click', async () => {
            const currentCardState = loopPlayers.get(card);

            if (!currentCardState || currentCardState.isLoading || currentCardState.loadError) {
                if(currentCardState?.loadError) alert(`Could not play. Error: ${currentCardState.loadError.message}`);
                else if (currentCardState?.isLoading) console.log("Still loading, please wait.");
                else console.log("Player state not found for this card.");
                return;
            }
            if (!audioContext) {
                try {
                    audioContext = new AudioContext();
                     if (audioContext.state === 'suspended') { await audioContext.resume(); }
                } catch (e) { console.error("Error creating AudioContext:", e); alert("Web Audio API is not supported by your browser."); return; }
            }
             if (audioContext.state === 'suspended') {
                 try { await audioContext.resume(); } catch (e) { console.error("Error resuming AudioContext:", e); alert("Could not resume audio playback."); return; }
             }

            if (currentCardState.isPlaying) {
                stopLoop(card);
            } else {
                stopAllLoops(card); // Stop other loops before playing a new one
                await playLoop(card);
            }
        });
    });


    /**
     * NEW FUNCTION: Updates the playback rate for all currently playing loops
     * based on quantize settings.
     */
    function updateRateForAllCurrentlyPlayingLoops() {
        if (!audioContext || audioContext.state !== 'running') {
            // console.log("AudioContext not active, cannot update playback rates.");
            return;
        }

        loopPlayers.forEach((playerState, card) => { // card is available if needed for context/logging
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
                } else { // quantizeEnabled is false
                     reason = "normal speed (quantize disabled)";
                }

                if (playerState.sourceNode.playbackRate.value !== newRate) {
                    playerState.sourceNode.playbackRate.value = newRate;
                    console.log(`Playback Rate Update: ${playerState.src} to ${reason}`);
                }
            }
        });
    }


    // Event Listeners for Quantize Controls
    if (quantizeToggle && bpmInput) {
        quantizeToggle.addEventListener('change', () => {
            quantizeEnabled = quantizeToggle.checked;
            console.log('Quantize Toggled:', quantizeEnabled);
            updateRateForAllCurrentlyPlayingLoops(); // Now defined
        });

        bpmInput.addEventListener('input', () => {
            const newBPM = parseInt(bpmInput.value, 10);
            const minBPM = parseInt(bpmInput.min, 10) || 30; // Default min if not set
            const maxBPM = parseInt(bpmInput.max, 10) || 300; // Default max if not set

            if (!isNaN(newBPM) && newBPM >= minBPM && newBPM <= maxBPM) {
                globalTargetBPM = newBPM;
                console.log('Global Target BPM Changed:', globalTargetBPM);
                if (quantizeEnabled) {
                    updateRateForAllCurrentlyPlayingLoops(); // Now defined
                }
            } else if (bpmInput.value === "") {
                console.log('BPM input cleared. Retaining last valid BPM or default.');
                // Optionally, you might want to set globalTargetBPM to a default or do nothing.
                // If you want to clear it and have loops revert to 1.0 if quantize is on:
                // globalTargetBPM = 0; // This would cause them to play at 1.0 due to the check in updateRate...
                // if (quantizeEnabled) { updateRateForAllCurrentlyPlayingLoops(); }
            }
            // You might want to add a visual indication if the input is out of range but not empty
            else if (!isNaN(newBPM) && (newBPM < minBPM || newBPM > maxBPM)) {
                console.warn(`BPM input ${newBPM} is out of range (${minBPM}-${maxBPM}).`);
                // Optionally, clamp the value or provide feedback to the user.
            }
        });
    } else {
        console.warn("Quantize UI elements (toggle or BPM input) not found. Quantize feature disabled.");
    }


    // MODIFIED: `playLoop` to include playbackRate adjustment
    async function playLoop(card) {
        const playerState = loopPlayers.get(card);
        if (!playerState || playerState.isPlaying || playerState.loadError || !audioContext || audioContext.state !== 'running') {
            if(playerState?.loadError) alert(`Could not play. Error: ${playerState.loadError.message}`);
            return;
        }

        playerState.isLoading = true;
        if (playerState.button) playerState.button.disabled = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        updateButtonUI(card, playerState, false); // Show play icon while loading
        card.classList.add('loading');

        try {
            if (!playerState.audioBuffer) {
                const response = await fetch(playerState.src);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                playerState.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                playerState.loadError = null;
            }
            if (!playerState.audioBuffer) throw new Error(`AudioBuffer null after load`);

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;

            if (quantizeEnabled && playerState.originalBPM && playerState.originalBPM > 0 && globalTargetBPM > 0) {
                sourceNode.playbackRate.value = globalTargetBPM / playerState.originalBPM;
                console.log(`Quantized Play: ${playerState.src} @ ${sourceNode.playbackRate.value.toFixed(2)}x (Target: ${globalTargetBPM} BPM, Original: ${playerState.originalBPM} BPM)`);
            } else {
                sourceNode.playbackRate.value = 1.0;
                if (quantizeEnabled && (!playerState.originalBPM || playerState.originalBPM <= 0)) {
                     console.warn(`Quantize enabled but original BPM for ${playerState.src} is 0 or unknown. Playing at normal speed.`);
                } else if (quantizeEnabled && (!globalTargetBPM || globalTargetBPM <= 0)) {
                    console.warn(`Quantize enabled but global target BPM for ${playerState.src} is invalid. Playing at normal speed.`);
                }
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
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            updateButtonUI(card, playerState, true);
            card.classList.add('playing');

        } catch (error) {
            console.error(`Error playing ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.isPlaying = false; playerState.audioBuffer = null; playerState.sourceNode = null;
            updateButtonUI(card, playerState, false);
            alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);
            card.classList.remove('playing');
        } finally {
            playerState.isLoading = false;
            card.classList.remove('loading');
            if (playerState.indicator) playerState.indicator.style.display = 'none';
            if (playerState.loadError) {
                 card.classList.add('error');
                 if (playerState.button) playerState.button.disabled = true; // Keep disabled on error
            } else {
                if (playerState.button) playerState.button.disabled = false;
                card.classList.remove('error');
            }
        }
    }

    function stopLoop(card) {
        const playerState = loopPlayers.get(card);
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0);
                 // onended will fire, which should update state. Explicitly setting here too for safety.
                 playerState.isPlaying = false; 
                 // playerState.sourceNode = null; // Done by onended
                 updateButtonUI(card, playerState, false);
                 card.classList.remove('playing');
                 console.log(`Stopped: ${playerState.src}`);
            } catch (e) {
                 console.warn(`Error stopping node for ${playerState.src}:`, e.message);
                 // Force reset state if stop fails badly
                 if (playerState.sourceNode) { playerState.sourceNode.onended = null; playerState.sourceNode = null; }
                 playerState.isPlaying = false;
                 updateButtonUI(card, playerState, false);
                 card.classList.remove('playing');
            }
        } else if (playerState && playerState.isPlaying) {
             // This case indicates an inconsistent state, likely sourceNode was already cleared or never set properly
             console.warn(`Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode. Resetting.`);
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

}); // === END of DOMContentLoaded ===