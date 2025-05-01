/**
 * Main JavaScript file for website interactions and enhancements.
 * Includes: Mobile Navigation, Animations, Audio Playback (Web Audio API),
 * Filtering, and other UI effects.
 */
document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
// =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================

    // --- 1. Define the Sample Data ---
    // #######################################################################
    // ###  MANUALLY UPDATE THIS LIST WHEN AUDIO FILES CHANGE IN audio/ FOLDER ###
    // #######################################################################
    let sampleData = [ // Use 'let' because we will sort it in place
        // Data based on the provided file list
        // Titles, Details, Categories are inferred from filenames

        // Boom Bap Kits
        { src: 'audio/KP_boomkit_100bpm_A1.webm', title: 'KP Boomkit A1', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A2.webm', title: 'KP Boomkit A2', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A3.webm', title: 'KP Boomkit A3', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A1.webm',  title: 'KP Boomkit A1', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A2.webm',  title: 'KP Boomkit A2', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A3.webm',  title: 'KP Boomkit A3', details: '98 BPM | Boom Bap', category: 'boom-bap' },

        // Cazio Kits
        { src: 'audio/KP_caziokit_129bpm_A.webm', title: 'KP CazioKit A', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_B.webm', title: 'KP CazioKit B', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_C.webm', title: 'KP CazioKit C', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        // Correcting typo in filename: .webm.webm -> .webm
        { src: 'audio/KP_caziokit_129bpm_D.webm', title: 'KP CazioKit D', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_E_8bar.webm', title: 'KP CazioKit E (8 bar)', details: '129 BPM | Breakbeat', category: 'breakbeat' },

        // --- ADD ANY OTHER SAMPLES FROM THE FULL LIBRARY HERE FOLLOWING THE SAME STRUCTURE ---
    ];

    // --- 2. Sorting Logic ---
    function getSortKeys(sample) {
        const titleMatch = sample.title.match(/^(KP\s+\w+)\s*(.*)$/);
        const bpmMatch = sample.details.match(/^(\d+)\s*BPM/);
        const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
        const variation = titleMatch ? titleMatch[2].trim() : '';
        const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
        // Create a unique identifier for the group (Kit Name + BPM)
        const groupIdentifier = `${kitName}-${bpm}`;
        return { kitName, bpm, variation, groupIdentifier };
    }

    // Sort the sampleData array primarily by group, then variation
    sampleData.sort((a, b) => {
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);

        // 1. Compare Group Identifier (KitName-BPM)
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) {
            return groupCompare;
        }

        // 2. Compare Variation within the same group
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });

    // --- 3. Get the Grid Container ---
    const samplesGrid = document.querySelector('#kp-loops .samples-grid');

    if (samplesGrid) {
        samplesGrid.innerHTML = ''; // Clear existing content
        let previousGroupIdentifier = null; // Keep track of the last group

        // --- 4. Generate HTML with Group Breaks ---
        sampleData.forEach(sample => {
            const currentKeys = getSortKeys(sample);
            const currentGroupIdentifier = currentKeys.groupIdentifier;

            // Check if the group has changed and it's not the very first item
            if (currentGroupIdentifier !== previousGroupIdentifier && previousGroupIdentifier !== null) {
                // Insert a break element to force a new row in flexbox
                const breakElement = document.createElement('div');
                breakElement.classList.add('group-break');
                samplesGrid.appendChild(breakElement);
            }

            // --- Create the sample card (same logic as before) ---
            const card = document.createElement('div');
            card.classList.add('sample-card');

            if (sample.src) {
                card.dataset.src = sample.src;
                if (sample.category) card.dataset.category = sample.category;

                const title = document.createElement('h3');
                title.textContent = sample.title || 'Untitled Sample';
                card.appendChild(title);

                const details = document.createElement('p');
                details.textContent = sample.details || '';
                card.appendChild(details);

                const playButton = document.createElement('button');
                playButton.classList.add('play-pause-btn');
                playButton.setAttribute('aria-label', `Play ${sample.title || 'sample'}`);
                const icon = document.createElement('i');
                icon.classList.add('fas', 'fa-play');
                playButton.appendChild(icon);
                card.appendChild(playButton);

                const loadingIndicator = document.createElement('span');
                loadingIndicator.classList.add('loading-indicator');
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = 'Loading...';
                card.appendChild(loadingIndicator);
            } else {
                // Handle placeholders if needed
                card.classList.add('placeholder');
                 card.setAttribute('data-tooltip', sample.details || 'Coming Soon');
                const title = document.createElement('h3');
                title.textContent = sample.title || 'Coming Soon...';
                 card.appendChild(title);
                const details = document.createElement('p');
                details.textContent = sample.details || 'More loops incoming!';
                 card.appendChild(details);
            }
            // --- Append the card ---
            samplesGrid.appendChild(card);

            // Update the previous group identifier for the next iteration
            previousGroupIdentifier = currentGroupIdentifier;
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
    // This MUST run AFTER the dynamic sample generation code above
    // =========================================================================

    // 1. Initialize Audio Context (lazily on first interaction)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null; // Initialize later

    // 2. Store state for each loop player (using Map for better element association)
    const loopPlayers = new Map(); // Map: sampleCardElement -> playerStateObject

    // 3. Select all sample cards that have audio data source (generated dynamically)
    // Ensure this selector runs AFTER the cards are added to the DOM
    const sampleCardsWithAudio = document.querySelectorAll('.sample-card[data-src]');

    // 4. Setup each loop player found
    sampleCardsWithAudio.forEach(card => { // 'card' is the dynamically generated HTMLElement
        const playButton = card.querySelector('.play-pause-btn');
        const loadingIndicator = card.querySelector('.loading-indicator');
        const audioSrc = card.dataset.src; // Get src from the data attribute
        const buttonIcon = playButton?.querySelector('i'); // Assuming Font Awesome icons

        // Basic validation for required elements/data
        if (!playButton || !audioSrc || !loadingIndicator) {
            console.warn('Sample card skipped: Missing play button, loading indicator or data-src.', card);
            card.style.opacity = '0.6'; // Dim incomplete cards
            card.title = 'Audio setup incomplete for this sample.';
            if(playButton) playButton.disabled = true;
            return; // Skip setup for this card
        }

        // Initialize state object for this player and store it in the Map
        const playerState = {
            isPlaying: false,
            audioBuffer: null,      // Decoded audio data (cached)
            sourceNode: null,       // The currently playing Web Audio node
            isLoading: false,
            loadError: null,        // Store any loading/decoding errors
            src: audioSrc,          // Store the source from the data attribute
            button: playButton,     // Reference to the button element
            indicator: loadingIndicator, // Reference to the indicator element
            icon: buttonIcon        // Reference to the icon element (if present)
        };
        loopPlayers.set(card, playerState); // Use the card element as the key

        // Add click listener to the play/pause button
        playButton.addEventListener('click', async () => {
            // Get the state associated with the specific card that was clicked
            const currentCardState = loopPlayers.get(card);

            // Prevent actions if state is missing or currently loading/error
            if (!currentCardState || currentCardState.isLoading || currentCardState.loadError) {
                if(currentCardState?.loadError) {
                    alert(`Cannot play sample. Previous error: ${currentCardState.loadError.message}`);
                }
                return;
            }


            // Initialize AudioContext on the *first* user interaction across all players
            if (!audioContext) {
                try {
                    console.log("Initializing AudioContext...");
                    audioContext = new AudioContext();
                     // Resume context if it starts suspended (common in modern browsers)
                     if (audioContext.state === 'suspended') {
                         await audioContext.resume();
                         console.log("AudioContext resumed on initialization.");
                     }
                } catch (e) {
                    console.error("Web Audio API is not supported or context creation failed.", e);
                    // Disable all play buttons if context fails
                    loopPlayers.forEach(state => { if(state.button) state.button.disabled = true; });
                    alert("Sorry, your browser doesn't support the required audio features for playback.");
                    return; // Stop execution for this click
                }
            }

            // Ensure context is running (it might suspend if the tab is inactive)
            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                    console.log("AudioContext resumed on demand.");
                } catch (e) {
                    console.error("Failed to resume AudioContext:", e);
                    alert("Could not resume audio playback. Please interact with the page again.");
                    return; // Stop execution for this click
                }
            }

            // --- Play/Pause Logic ---
            if (currentCardState.isPlaying) {
                stopLoop(card); // Stop this specific loop (pass the card element)
            } else {
                // Stop any *other* loops currently playing before starting this one
                stopAllLoops(card); // Pass current card element to exclude it

                // Attempt to play the requested loop (pass the card element)
                await playLoop(card);
            }
        });
    }); // End of sampleCardsWithAudio.forEach

    /**
     * Stops playback for a specific audio loop identified by its card element.
     * @param {HTMLElement} card The sample card element whose loop should be stopped.
     */
    function stopLoop(card) {
        const playerState = loopPlayers.get(card); // Get state using the card element

        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0); // Stop playback immediately
                 console.log(`Stopped: ${playerState.src}`);
                 // The onended event will fire, which should handle state cleanup
            } catch (e) {
                 // Catch errors if the node is already stopped or in an invalid state
                console.warn(`Error stopping node for ${playerState.src} (may have already stopped naturally):`, e.message);
                // Manually ensure state is updated if stop() fails unexpectedly but node exists
                if (playerState.sourceNode) {
                    playerState.sourceNode.onended = null; // Prevent potential duplicate cleanup
                    playerState.sourceNode = null;
                }
                playerState.isPlaying = false;
                updateButtonUI(card, playerState, false); // Ensure UI reflects stopped state
            }
            // Note: Don't nullify sourceNode or set isPlaying=false here directly.
            // Let the 'onended' handler do that for consistency, unless stop() throws.
        } else if (playerState && playerState.isPlaying) {
             // Handle inconsistency: state says playing, but no node exists
             console.warn(`Inconsistent state for ${playerState.src}: isPlaying=true but no valid sourceNode found. Resetting state.`);
             playerState.isPlaying = false;
             playerState.sourceNode = null; // Ensure node reference is cleared
             updateButtonUI(card, playerState, false); // Update UI
        }
    }

    /**
     * Stops all currently playing audio loops, optionally excluding one.
     * @param {HTMLElement|null} exceptCard Optional: A card element whose loop should NOT be stopped.
     */
    function stopAllLoops(exceptCard = null) {
        // console.log('Stopping other loops...'); // Can be noisy, enable if debugging
        loopPlayers.forEach((state, card) => { // Iterate through the Map (value, key)
            // Stop if the card is not the excluded one AND it is currently playing
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card); // Pass the specific card element to stopLoop
            }
        });
    }

    /**
     * Loads audio data (if not already cached) and starts seamless, looping playback
     * for the audio associated with the given card element.
     * @param {HTMLElement} card The sample card element whose loop should be played.
     */
    async function playLoop(card) {
        const playerState = loopPlayers.get(card); // Get state using the card element

        // --- Pre-play Checks ---
        // Ensure we have a valid state object
        if (!playerState) {
            console.error("Cannot play loop: Player state not found for this card.", card);
            return;
        }
        // Ensure AudioContext is initialized and running
        if (!audioContext || audioContext.state !== 'running') {
            console.error("Cannot play loop: AudioContext not available or not running.", { state: playerState, context: audioContext?.state });
             // Attempt to resume again just in case
             if (audioContext && audioContext.state === 'suspended') {
                 try {
                     await audioContext.resume();
                     console.log("AudioContext resumed just before play attempt.");
                 } catch (e) {
                     alert("Could not resume audio playback. Please interact with the page again.");
                     return;
                 }
            } else if (!audioContext) {
                 alert("Audio system not initialized. Please click play again.");
                 return; // Should have been caught earlier, but good failsafe
            } else {
                 return; // Other unexpected issue
            }
        }
        // Prevent playing if already playing (should be handled by caller, but safety check)
        if (playerState.isPlaying) {
            console.warn(`Play called on already playing loop: ${playerState.src}`);
            return;
        }
        // Prevent playing if there was a previous load error
        if (playerState.loadError) {
            console.error(`Cannot play ${playerState.src}, previous load error:`, playerState.loadError);
            alert(`Could not play this sample due to a previous error:\n${playerState.loadError.message}`);
            return;
        }

        // --- Loading Phase ---
        playerState.isLoading = true;
        playerState.button.disabled = true; // Disable button during load/play setup
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        updateButtonUI(card, playerState, false); // Keep icon as 'Play' visually during load

        try {
            // --- 1. Load Audio Buffer (Fetch and Decode if needed) ---
            if (!playerState.audioBuffer) { // Only load if not already cached
                console.log(`Loading audio data for: ${playerState.src}`);
                const response = await fetch(playerState.src);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} fetching ${playerState.src}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                console.log(`Decoding audio data for: ${playerState.src} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
                // Use promise-based decodeAudioData
                playerState.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log(`Successfully decoded: ${playerState.src}`);
                playerState.loadError = null; // Clear any previous error on successful load
            }
            // Double-check buffer exists after potential load
            if (!playerState.audioBuffer) {
                throw new Error(`AudioBuffer is unexpectedly null after load/decode attempt for ${playerState.src}`);
            }

            // --- 2. Create and Configure Audio Source Node ---
            // Create a new source node *each time* play is called
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer; // Assign the decoded buffer
            sourceNode.loop = true;                      // Enable seamless looping
            sourceNode.connect(audioContext.destination); // Connect to speakers

            // --- 3. Setup Cleanup Handler (IMPORTANT) ---
            // This function runs when the node stops for *any* reason (stopped manually, finished playing non-looped)
            sourceNode.onended = () => {
                // Check if this specific node is the one currently tracked in the state
                // This prevents issues if stop/play happens rapidly causing old onended events to fire
                if (playerState.sourceNode === sourceNode) {
                     console.log(`AudioNode ended naturally or stopped for ${playerState.src}. Current isPlaying state: ${playerState.isPlaying}`);
                     // If the state still thought it was playing when 'onended' fired, it means
                     // it wasn't stopped via the stopLoop function (e.g., context closed, unexpected stop).
                     // Or, it's the expected end after stopLoop called sourceNode.stop().
                     // Either way, ensure the state is consistent.
                     playerState.isPlaying = false;
                     playerState.sourceNode = null; // Clear the reference to the ended node
                     updateButtonUI(card, playerState, false); // Update button to "Play"
                } else {
                     // This ended event belongs to an "orphaned" node (already replaced or stopped)
                     console.log(`Orphaned AudioNode ended for ${playerState.src}`);
                }
                 // No need to disconnect, garbage collection handles it once references are cleared.
            };

            // --- 4. Start Playback ---
            sourceNode.start(0); // Start playing immediately
            playerState.sourceNode = sourceNode; // Store reference to the *currently playing* node
            playerState.isPlaying = true;        // Update state
            console.log(`Playing: ${playerState.src}`);
            updateButtonUI(card, playerState, true); // Update button to "Pause"

        } catch (error) {
            // --- Error Handling ---
            console.error(`Error processing or playing ${playerState.src}:`, error);
            playerState.loadError = error; // Store the error state
            playerState.isPlaying = false;
            playerState.audioBuffer = null; // Clear potentially corrupted buffer
            playerState.sourceNode = null; // Ensure no node reference is held
            updateButtonUI(card, playerState, false); // Ensure button shows "Play"
            alert(`Could not load or play the audio sample "${playerState.src.split('/').pop()}". Please check the console for details.\n\nError: ${error.message}`);

        } finally {
            // --- Cleanup Loading State ---
            // This runs regardless of success or failure in the try block
            playerState.isLoading = false;
            if (playerState.indicator) playerState.indicator.style.display = 'none';
            // Re-enable button ONLY if there wasn't a load error
            if (playerState.button && !playerState.loadError) {
                playerState.button.disabled = false;
            } else if (playerState.button) {
                // Keep button disabled if a load error occurred
                playerState.button.disabled = true;
                 console.warn(`Button remains disabled for ${playerState.src} due to load error.`);
            }
        }
    }

    /**
     * Updates the visual state (icon/text) and ARIA label of a play/pause button
     * based on the player's current state.
     * @param {HTMLElement} card The sample card element being updated.
     * @param {object} playerState The state object for the player associated with the card.
     * @param {boolean} isPlaying The target state (true for playing/pause icon, false for stopped/play icon).
     */
    function updateButtonUI(card, playerState, isPlaying) {
        // Safety checks for robustness
        if (!card || !playerState || !playerState.button) {
            console.warn("updateButtonUI called with invalid arguments", { card, playerState });
            return;
        }

        const button = playerState.button;
        const icon = playerState.icon; // Get icon reference from state

        // Update Icon or Text
        if (icon) {
            // Use classList.replace for cleaner toggling if supported, otherwise remove/add
            if (icon.classList.replace) {
                icon.classList.replace(isPlaying ? 'fa-play' : 'fa-pause', isPlaying ? 'fa-pause' : 'fa-play');
            } else {
                icon.classList.remove(isPlaying ? 'fa-play' : 'fa-pause');
                icon.classList.add(isPlaying ? 'fa-pause' : 'fa-play');
            }
        } else {
            // Fallback if no icon element is found
            button.textContent = isPlaying ? 'Pause' : 'Play';
        }

        // Update ARIA Label for Accessibility
        const action = isPlaying ? 'Pause' : 'Play';
        // Try to get the title from the card's h3, fallback to filename from state
        const sampleName = card.querySelector('h3')?.textContent.trim() || playerState.src.split('/').pop();
        button.setAttribute('aria-label', `${action} ${sampleName}`);

        // Optional: Add/Remove a class on the button itself for styling based on state
        button.classList.toggle('playing', isPlaying);
        // Ensure card itself doesn't have the 'playing' class unless needed for styling
        // card.classList.toggle('playing', isPlaying);
    }

    // --- END of Web Audio API Looping Logic ---

}); // End of DOMContentLoaded