/**
 * Main JavaScript file for website interactions and enhancements.
 * Includes: Mobile Navigation, Animations, Audio Playback (Web Audio API),
 * Filtering, and other UI effects.
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

    // --- 2. Sorting Logic ---
    function getSortKeys(sample) { /* ... no changes ... */
        const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
        const bpmMatch = sample.details.match(/^(\d+)\s*BPM/i);
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
        const groupIdentifier = `${kitName}-${bpm}`;
        return { kitName, bpm, variation, groupIdentifier };
     }
    sampleData.sort((a, b) => { /* ... no changes ... */
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    // --- 3. Get the Grid Container ---
    const samplesGrid = document.querySelector('#kp-loops .samples-grid');

    if (samplesGrid) {
        samplesGrid.innerHTML = '';
        let previousGroupIdentifier = null;
        let currentRowContainer = null;
        let rowIndex = 0;

        // --- 4. Generate HTML with Grouped Rows ---
        sampleData.forEach(sample => {
            const currentKeys = getSortKeys(sample);
            const currentGroupIdentifier = currentKeys.groupIdentifier;

            // Create new row container if needed
            if (currentGroupIdentifier !== previousGroupIdentifier || currentRowContainer === null) {
                currentRowContainer = document.createElement('div');
                currentRowContainer.classList.add('sample-row');
                const uniqueColor = neonRowColors[rowIndex % neonRowColors.length];

                // Apply color to the row's top border (as before)
                currentRowContainer.style.borderTopColor = uniqueColor;

                // **** ADD THIS LINE: Set the CSS custom property for the row ****
                currentRowContainer.style.setProperty('--row-border-color', uniqueColor);

                samplesGrid.appendChild(currentRowContainer);
                previousGroupIdentifier = currentGroupIdentifier;
                rowIndex++;
            }

            // --- Create the sample card (no changes needed in card creation logic) ---
            const card = document.createElement('div');
            card.classList.add('sample-card');
            card.dataset.group = currentGroupIdentifier;
            // ... (rest of card creation: title, details, button, indicator, src etc.) ...
            // ... as it was in the previous step ...
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
            currentRowContainer.appendChild(card); // Append card to row

        }); // End of sampleData.forEach

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
            // Toggle between hamburger and close icons if they exist
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        };
        navToggle.addEventListener('click', toggleNav);

        // Close mobile nav when a link is clicked
        nav.querySelectorAll('a').forEach(link =>
            link.addEventListener('click', () => {
                // Only toggle if the nav is currently active (visible)
                if (nav.classList.contains('active')) {
                    toggleNav(); // Use the toggle function to also handle icon state
                }
            })
        );
    }

    // --- Placeholder marking ---
    // This section might be less necessary now if placeholders are generated above,
    // but keeping it won't hurt if you have other non-sample placeholders.
    document.querySelectorAll('.sample-card:not([data-src])').forEach(item => {
        // Check if it doesn't already have the placeholder class from dynamic generation
        if (!item.classList.contains('placeholder')) {
            item.classList.add('placeholder');
        }
        if (!item.hasAttribute('data-tooltip')) {
             item.setAttribute('data-tooltip', 'Coming Soon');
        }
        // Optionally disable buttons if they somehow exist in placeholder cards
        item.querySelectorAll('button').forEach(el => el.disabled = true);
    });

    // --- Animate on scroll (Simple fallback) ---
    // This fallback might conflict slightly with the Intersection Observer if both try to set styles.
    // Consider removing it if the Observer works reliably, or refine the conditions.
    const animateOnScroll = () => {
        const elementsToAnimate = document.querySelectorAll('.fade-in, .slide-up');
        elementsToAnimate.forEach(el => {
            // Only apply if Intersection Observer hasn't already set the animation state
            if (el.style.animationPlayState !== 'running' && el.style.animationPlayState !== 'paused') {
                if (el.getBoundingClientRect().top < window.innerHeight - 50) {
                     // Check if opacity is not already 1 to avoid redundant style changes
                     if (el.style.opacity !== '1') {
                         el.style.opacity = '1';
                         el.style.transform = 'translateY(0)';
                         // Add a class to mark it as animated by the fallback, maybe?
                         // el.classList.add('animated-by-scroll');
                     }
                 }
            }
        });
    };
    // Run once on load for elements initially in view
    animateOnScroll();
    // Run on scroll events (can be performance intensive)
    // Consider debouncing/throttling this listener if performance issues arise
    window.addEventListener('scroll', animateOnScroll);

    // --- Intersection Observer for Performance-Optimized Animations ---
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const targetElement = entry.target;
                const styles = window.getComputedStyle(targetElement);

                // Handle elements with CSS Animations defined
                if (styles.animationName && styles.animationName !== 'none') {
                     targetElement.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
                }
                // Handle elements meant for simple fade/slide in via JS (triggered by Observer)
                else if (entry.isIntersecting) {
                    // Check if it's not already visible (opacity check)
                    if (targetElement.style.opacity !== '1') {
                        targetElement.style.opacity = '1';
                        targetElement.style.transform = 'translateY(0)';
                    }
                     // Optionally unobserve after first intersection to prevent re-animation
                     // observer.unobserve(targetElement);
                }
                // If you want elements to fade/slide out when they leave the viewport:
                // else {
                //     if (styles.animationName && styles.animationName !== 'none') {
                //         // Let CSS handle exit animation if defined via animation-play-state paused
                //     } else {
                //         // Manually reverse the simple fade/slide for non-CSS animations
                //         targetElement.style.opacity = '0';
                //         if (targetElement.classList.contains('slide-up')) {
                //             targetElement.style.transform = 'translateY(20px)'; // Reset slide
                //         }
                //     }
                // }
            });
        }, { threshold: 0.1 }); // Trigger when 10% is visible

        document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
             const styles = window.getComputedStyle(el);
             // Check if element has CSS animation defined
             if (styles.animationName && styles.animationName !== 'none') {
                 // Pause CSS animations initially if IntersectionObserver is used
                 el.style.animationPlayState = 'paused';
             } else {
                 // If no CSS animation, set initial state for JS-driven animation
                 el.style.opacity = '0';
                 if (el.classList.contains('slide-up')) {
                    el.style.transform = 'translateY(20px)';
                 }
             }
             observer.observe(el); // Observe all designated elements
        });
    } else {
        // Fallback already handled by the scroll listener if IntersectionObserver isn't supported
        console.log("Intersection Observer not supported, using scroll fallback for animations.");
    }


    // --- Hero Typewriter Effect ---
    const heroTextElement = document.querySelector('.hero-text h1');
    if (heroTextElement) {
        const originalText = heroTextElement.textContent || ""; // Ensure it's a string
        heroTextElement.textContent = ''; // Clear initial text
        let charIndex = 0;
        const typingSpeed = 80; // Adjusted speed (milliseconds per character)

        const typeWriterEffect = () => {
            if (charIndex < originalText.length) {
                heroTextElement.textContent += originalText.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriterEffect, typingSpeed);
            }
        };
        // Start after a short delay to allow other elements to render
        setTimeout(typeWriterEffect, 300);
    }

    // --- Category Filter for Samples ---
    // This setup needs to happen *after* the samples are generated dynamically
    const filterButtons = document.querySelectorAll('.category-filter button, .category-filter .btn'); // Assuming filter buttons exist in HTML

    // Only add listeners if filter buttons exist
    if (filterButtons.length > 0) {
         // Re-select the cards *after* they have been generated
        const sampleCardsToFilter = document.querySelectorAll('.samples-grid .sample-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Manage active state for buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const selectedCategory = button.dataset.category; // Get category from data attribute

                // Filter the dynamically generated cards
                sampleCardsToFilter.forEach(card => {
                    // Check if the card has a category (placeholders might not)
                    const cardCategory = card.dataset.category;
                    const isPlaceholder = card.classList.contains('placeholder'); // Check if it's a placeholder

                    // Logic: Show card if 'all' is selected, OR if its category matches,
                    // OR if it's a placeholder and 'all' is selected (optional: decide if placeholders are filtered)
                    // let shouldShow = (selectedCategory === 'all'); // Start with 'all' case
                    // if (!isPlaceholder && cardCategory) {
                    //     shouldShow = shouldShow || cardCategory === selectedCategory;
                    // }
                    // Simplified: Filter only non-placeholders based on category, show all if 'all' is selected.
                    // Placeholders are always shown unless you add specific logic to hide them.
                    const shouldShow = (selectedCategory === 'all' || isPlaceholder || cardCategory === selectedCategory);


                    // Adjust display based on your grid layout (e.g., 'block', 'flex', 'grid-item')
                    card.style.display = shouldShow ? '' : 'none'; // Use empty string to reset to CSS default display
                });
            });
        });
        // Optionally trigger the 'all' filter initially if an 'all' button exists
        const allButton = document.querySelector('.category-filter button[data-category="all"]');
        if (allButton) {
            allButton.click(); // Simulate a click to show all initially
        }

    } else {
        console.log("No category filter buttons found in the HTML.");
    }


    // --- Retro Computer Screen Flicker Effect ---
    // Make sure you have an element with class="computer-screen" in your HTML
    const computerScreen = document.querySelector('.computer-screen');
    if (computerScreen) {
        const flickerInterval = 5000 + Math.random() * 2000; // Randomize interval slightly
        const flickerDuration = 80 + Math.random() * 50;    // Randomize duration slightly
        setInterval(() => {
            computerScreen.classList.add('flicker'); // Add CSS class for flicker effect
            setTimeout(() => {
                computerScreen.classList.remove('flicker');
            }, flickerDuration);
        }, flickerInterval);
    }

    // --- Smooth Anchor Scrolling ---
    document.querySelectorAll('a[href^="#"]').forEach(anchorLink => {
        anchorLink.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            // Ensure it's a valid internal link and not just "#" or an external link
            if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#')) {
                try {
                    // Use CSS.escape for potentially complex selectors, though simple IDs are fine
                    const targetElement = document.querySelector(hrefAttribute);
                    if (targetElement) {
                        e.preventDefault(); // Prevent default anchor jump only if target exists

                        // Calculate scroll position (adjust offset as needed for fixed headers)
                        const headerOffset = 80; // Adjust this value based on your fixed header height
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth" // Enable smooth scrolling
                        });

                        // Close mobile nav if open after clicking a link (check nav existence)
                         if (nav?.classList.contains('active')) {
                            navToggle?.click(); // Simulate click on toggle to close and handle icon state
                         }
                    } else {
                        // Log warning but allow default behavior if target isn't found
                        console.warn(`Smooth scroll target not found for selector: ${hrefAttribute}`);
                    }
                } catch (error) {
                     // Log error but allow default behavior
                     console.error(`Error finding smooth scroll target element with selector "${hrefAttribute}":`, error);
                }
            }
        });
    });


    // =========================================================================
    // --- Web Audio API Looping Logic for Samples ---
    // =========================================================================

    // 1. Initialize Audio Context (lazily on first interaction)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;

    // 2. Store state for each loop player
    const loopPlayers = new Map();

    // 3. Select all sample cards *that have audio data source*
    const sampleCardsWithAudio = document.querySelectorAll('.sample-card[data-src]');

    // 4. Setup each loop player found
    sampleCardsWithAudio.forEach(card => { // 'card' is the dynamically generated HTMLElement
        // Find elements *within* this specific card
        const playButton = card.querySelector('.play-pause-btn');
        const loadingIndicator = card.querySelector('.loading-indicator');
        const audioSrc = card.dataset.src; // Get src from the card itself
        const buttonIcon = playButton?.querySelector('i');

        if (!playButton || !audioSrc || !loadingIndicator) {
             console.warn('Sample card skipped during audio setup: Missing required elements or data-src.', { card, audioSrc });
             card.style.opacity = '0.6';
             card.title = 'Audio setup incomplete for this sample.';
             // Ensure no click listener added if setup fails
             return; // Skip audio setup for this card
        }

        // Initialize state object for this player and store it
        const playerState = {
            isPlaying: false,
            audioBuffer: null,
            sourceNode: null,
            isLoading: false,
            loadError: null,
            src: audioSrc,
            // Store references to elements *within this card*
            button: playButton,
            indicator: loadingIndicator,
            icon: buttonIcon
        };
        loopPlayers.set(card, playerState); // Use the card element as the key

        // *** CHANGE HERE: Add click listener to the CARD itself ***
        card.addEventListener('click', async () => {
            const currentCardState = loopPlayers.get(card); // Get state using the clicked card

            // Prevent actions if state is missing, loading, or error
            if (!currentCardState || currentCardState.isLoading || currentCardState.loadError) {
                if (currentCardState?.loadError) {
                    alert(`Cannot play sample. Previous error: ${currentCardState.loadError.message}`);
                } else if (currentCardState?.isLoading) {
                     console.log('Audio is currently loading, please wait.');
                 }
                return; // Exit if card is not ready
            }

            // --- Initialize/Resume AudioContext ---
            // (Keep the existing robust AudioContext handling logic here)
            if (!audioContext) {
                try {
                    console.log("Initializing AudioContext...");
                    audioContext = new AudioContext();
                     if (audioContext.state === 'suspended') { await audioContext.resume(); console.log("AudioContext resumed on initialization."); }
                } catch (e) {
                    console.error("Web Audio API not supported or context creation failed.", e);
                     loopPlayers.forEach(state => { if(state.button) state.button.disabled = true; }); // Disable all
                    alert("Sorry, your browser doesn't support the required audio features for playback.");
                    return;
                }
            }
             if (audioContext.state === 'suspended') {
                 try {
                     await audioContext.resume(); console.log("AudioContext resumed on demand.");
                 } catch (e) {
                     console.error("Failed to resume AudioContext:", e);
                     alert("Could not resume audio playback. Please interact with the page again.");
                     return;
                 }
             }

            // --- Play/Pause Logic (uses the functions below) ---
            if (currentCardState.isPlaying) {
                stopLoop(card); // Stop this specific loop
            } else {
                stopAllLoops(card); // Stop OTHERS before starting this one
                await playLoop(card); // Play this loop
            }
        });
    }); // --- END of sampleCardsWithAudio.forEach ---


    // --- Functions for Audio Playback (stopLoop, stopAllLoops, playLoop, updateButtonUI) ---
    // Keep these functions EXACTLY as they were in the previous version.
    // They correctly use the `loopPlayers` Map and the `card` element passed to them.
    // They update the button UI even though the click listener is on the card.

    /**
     * Stops playback for a specific audio loop identified by its card element.
     * @param {HTMLElement} card The sample card element whose loop should be stopped.
     */
    function stopLoop(card) {
        const playerState = loopPlayers.get(card);
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0);
                 console.log(`Stopped: ${playerState.src}`);
            } catch (e) {
                 console.warn(`Error stopping node for ${playerState.src}:`, e.message);
                 if (playerState.sourceNode) { playerState.sourceNode.onended = null; playerState.sourceNode = null; }
                 playerState.isPlaying = false;
                 updateButtonUI(card, playerState, false);
            }
        } else if (playerState && playerState.isPlaying) {
             console.warn(`Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode. Resetting.`);
             playerState.isPlaying = false; playerState.sourceNode = null;
             updateButtonUI(card, playerState, false);
        }
         // Also add the visual playing class removal here for good measure
         card.classList.remove('playing');
    }

    /**
     * Stops all currently playing audio loops, optionally excluding one.
     * @param {HTMLElement|null} exceptCard Optional: A card element whose loop should NOT be stopped.
     */
    function stopAllLoops(exceptCard = null) {
        loopPlayers.forEach((state, card) => {
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card);
            }
        });
    }

    /**
     * Loads audio data (if not already cached) and starts seamless, looping playback
     * for the audio associated with the given card element.
     * @param {HTMLElement} card The sample card element whose loop should be played.
     */
    async function playLoop(card) {
        const playerState = loopPlayers.get(card);
        if (!playerState || playerState.isPlaying || playerState.loadError || !audioContext || audioContext.state !== 'running') {
             console.warn("Play conditions not met.", { playerState, audioContextState: audioContext?.state });
            if(playerState?.loadError) alert(`Could not play this sample due to a previous error:\n${playerState.loadError.message}`);
             return;
        }

        playerState.isLoading = true;
        if (playerState.button) playerState.button.disabled = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        updateButtonUI(card, playerState, false); // Keep UI as 'Play' during load
        card.classList.add('loading'); // Add visual loading state to card

        try {
            if (!playerState.audioBuffer) {
                console.log(`Loading: ${playerState.src}`);
                const response = await fetch(playerState.src);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                console.log(`Decoding: ${playerState.src}`);
                playerState.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                playerState.loadError = null; // Clear error on success
            }
            if (!playerState.audioBuffer) throw new Error(`AudioBuffer null after load`);

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;
            sourceNode.connect(audioContext.destination);

            sourceNode.onended = () => {
                if (playerState.sourceNode === sourceNode) {
                     console.log(`Node ended: ${playerState.src}`);
                     playerState.isPlaying = false;
                     playerState.sourceNode = null;
                     updateButtonUI(card, playerState, false);
                     card.classList.remove('playing'); // Ensure visual state cleared
                } else {
                     console.log(`Orphaned Node ended: ${playerState.src}`);
                }
            };

            sourceNode.start(0);
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            console.log(`Playing: ${playerState.src}`);
            updateButtonUI(card, playerState, true);
            card.classList.add('playing'); // Add visual playing state to card

        } catch (error) {
            console.error(`Error playing ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.isPlaying = false; playerState.audioBuffer = null; playerState.sourceNode = null;
            updateButtonUI(card, playerState, false);
            alert(`Could not load/play "${playerState.src.split('/').pop()}". Error: ${error.message}`);
            card.classList.remove('playing'); // Ensure visual state cleared

        } finally {
            playerState.isLoading = false;
            card.classList.remove('loading'); // Remove visual loading state
            if (playerState.indicator) playerState.indicator.style.display = 'none';
             // Re-enable interaction (via card listener) ONLY if no load error
            if (playerState.loadError) {
                 console.warn(`Interaction disabled for ${playerState.src} due to load error.`);
                 // Maybe add a visual error state to the card?
                 card.classList.add('error');
                 if (playerState.button) playerState.button.disabled = true; // Keep explicit button disabled
            } else {
                if (playerState.button) playerState.button.disabled = false; // Re-enable explicit button visually
                card.classList.remove('error'); // Clear error state if any
            }
        }
    }

    /**
     * Updates the visual state (icon/text) and ARIA label of the button *within* the card.
     * @param {HTMLElement} card The sample card element being updated.
     * @param {object} playerState The state object for the player associated with the card.
     * @param {boolean} isPlaying The target state (true for playing/pause icon, false for stopped/play icon).
     */
    function updateButtonUI(card, playerState, isPlaying) {
        if (!card || !playerState || !playerState.button) {
            // console.warn("updateButtonUI called with invalid arguments", { card, playerState }); // Can be noisy
            return;
        }
        const button = playerState.button;
        const icon = playerState.icon;
        const fullTitle = card.querySelector('h3')?.textContent.trim() || playerState.src.split('/').pop(); // Use the full title

        if (icon) {
             // Add/remove classes for play/pause icon state
             icon.classList.toggle('fa-play', !isPlaying);
             icon.classList.toggle('fa-pause', isPlaying);
        } else {
            button.textContent = isPlaying ? 'Pause' : 'Play'; // Fallback text
        }
        // Update ARIA label based on full title
        const action = isPlaying ? 'Pause' : 'Play';
        button.setAttribute('aria-label', `${action} ${fullTitle}`);

        // Update overall card state class for styling (optional but good)
        card.classList.toggle('playing', isPlaying);
    }
    // --- END of Web Audio API Logic ---


}); // === END of DOMContentLoaded ===