/**
 * Main JavaScript file for website interactions and enhancements.
 * Includes: Mobile Navigation, Animations, Audio Playback (Web Audio API),
 * Filtering, and other UI effects.
 */
document.addEventListener('DOMContentLoaded', () => {
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
                if (nav.classList.contains('active')) {
                    toggleNav(); // Use the toggle function to also handle icon state
                }
            })
        );
    }

    // --- Placeholder marking (If elements OTHER than audio samples need it) ---
    // Adjusted selector if '.sample-player' is no longer the primary container
    // Select placeholder cards specifically (ones without data-src)
    document.querySelectorAll('.sample-card:not([data-src])').forEach(item => {
        item.classList.add('placeholder');
        item.setAttribute('data-tooltip', 'Coming Soon');
        // Optionally disable buttons if they exist in placeholder cards
        item.querySelectorAll('button').forEach(el => el.disabled = true);
    });

    // --- Animate on scroll (Simple fallback) ---
    const animateOnScroll = () => {
        const elementsToAnimate = document.querySelectorAll('.fade-in, .slide-up');
        elementsToAnimate.forEach(el => {
            // Check if element is already animated by Intersection Observer to avoid conflicts
            if (el.style.animationPlayState !== 'running' && el.style.animationPlayState !== 'paused') {
                 if (el.getBoundingClientRect().top < window.innerHeight - 50) {
                     el.style.opacity = '1';
                     el.style.transform = 'translateY(0)';
                 }
            }
        });
    };
    // Run once on load
    animateOnScroll();
    // Run on scroll events
    window.addEventListener('scroll', animateOnScroll);

    // --- Intersection Observer for Performance-Optimized Animations ---
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Toggle animation play state based on visibility
                // Use animation-name check if multiple animations might be paused/played
                const styles = window.getComputedStyle(entry.target);
                if (styles.animationName && styles.animationName !== 'none') { // Check if animation is applied
                     entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
                } else if (entry.isIntersecting) {
                    // Fallback or initial trigger for non-CSS animation styles
                    // Check if it's already visible to prevent re-triggering fade/slide
                    if (entry.target.style.opacity !== '1') {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                }
                // Optionally: Unobserve after first animation
                // if (entry.isIntersecting && entry.target.dataset.animateOnce) {
                //     observer.unobserve(entry.target);
                // }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
             // Check if element has CSS animation defined
             const styles = window.getComputedStyle(el);
             if (styles.animationName && styles.animationName !== 'none') {
                // Pause CSS animations initially if IntersectionObserver is used
                 el.style.animationPlayState = 'paused';
                 observer.observe(el);
             } else {
                 // If no CSS animation, set initial state for fallback/JS animation
                 el.style.opacity = '0';
                 if (el.classList.contains('slide-up')) {
                    el.style.transform = 'translateY(20px)';
                 }
                 observer.observe(el); // Still observe to trigger visibility changes
             }
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
        const typingSpeed = 100; // Milliseconds per character

        const typeWriterEffect = () => {
            if (charIndex < originalText.length) {
                heroTextElement.textContent += originalText.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriterEffect, typingSpeed);
            }
        };
        // Start after a short delay
        setTimeout(typeWriterEffect, 500);
    }

    // --- Category Filter for Samples ---
    // Select filter buttons (including potential variations like .btn)
    const filterButtons = document.querySelectorAll('.category-filter button, .category-filter .btn'); // Assuming filter buttons exist
    // Select the cards to be filtered (ensure this selector matches your HTML structure)
    const sampleCardsToFilter = document.querySelectorAll('.samples-grid .sample-card');

    // Only add listeners if filter buttons exist
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Manage active state for buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const selectedCategory = button.dataset.category; // Get category from data attribute

                // Filter the cards
                sampleCardsToFilter.forEach(card => {
                    const cardCategory = card.dataset.category;
                    // Show card if 'all' is selected OR card's category matches selected category
                    const shouldShow = (selectedCategory === 'all' || cardCategory === selectedCategory);
                    card.style.display = shouldShow ? 'block' : 'none'; // Use 'block' or adjust based on CSS (e.g., 'grid', 'flex')
                });
            });
        });
    } else {
        console.log("No category filter buttons found.");
    }


    // --- Retro Computer Screen Flicker Effect ---
    const computerScreen = document.querySelector('.computer-screen');
    if (computerScreen) {
        const flickerInterval = 5000; // Time between flickers (ms)
        const flickerDuration = 100; // How long the flicker class stays (ms)
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
            // Ensure it's a valid internal link and not just "#"
            if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#')) {
                try {
                    const targetElement = document.querySelector(hrefAttribute);
                    if (targetElement) {
                        e.preventDefault(); // Prevent default anchor jump

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
                        console.warn(`Smooth scroll target not found for selector: ${hrefAttribute}`);
                    }
                } catch (error) {
                     console.error(`Error finding smooth scroll target element with selector "${hrefAttribute}":`, error);
                }
            }
        });
    });


    // =========================================================================
    // --- NEW Web Audio API Looping Logic for Samples ---
    // =========================================================================

    // 1. Initialize Audio Context (lazily on first interaction)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null; // Initialize later

    // 2. Store state for each loop player (using Map for better element association)
    const loopPlayers = new Map(); // Map: sampleCardElement -> playerStateObject

    // 3. Select all sample cards that have audio data source
    const sampleCardsWithAudio = document.querySelectorAll('.sample-card[data-src]');

    // 4. Setup each loop player found
    sampleCardsWithAudio.forEach(card => { // 'card' is the HTMLElement here
        const playButton = card.querySelector('.play-pause-btn');
        const loadingIndicator = card.querySelector('.loading-indicator');
        const audioSrc = card.dataset.src;
        const buttonIcon = playButton?.querySelector('i'); // Assuming Font Awesome icons

        // Basic validation for required elements/data
        if (!playButton || !audioSrc) {
            console.warn('Sample card skipped: Missing play button or data-src.', card);
            card.style.opacity = '0.5';
            card.title = 'Audio setup incomplete for this sample.';
            return; // Skip setup for this card
        }

        // Initialize state object for this player and store it in the Map
        const playerState = {
            isPlaying: false,
            audioBuffer: null,      // Decoded audio data (cached)
            sourceNode: null,       // The currently playing Web Audio node
            isLoading: false,
            loadError: null,        // Store any loading/decoding errors
            src: audioSrc,
            button: playButton,
            indicator: loadingIndicator,
            icon: buttonIcon
            // No need to store 'card' here if we pass it to functions needing it
        };
        loopPlayers.set(card, playerState);

        // Add click listener to the play/pause button
        playButton.addEventListener('click', async () => {
            // Get the state associated with the specific card that was clicked
            const currentCardState = loopPlayers.get(card);

            // Prevent actions if state is missing or currently loading
            if (!currentCardState || currentCardState.isLoading) return;

            // Initialize AudioContext on the *first* user interaction across all players
            if (!audioContext) {
                try {
                    console.log("Initializing AudioContext...");
                    audioContext = new AudioContext();
                     if (audioContext.state === 'suspended') {
                         await audioContext.resume();
                         console.log("AudioContext resumed.");
                     }
                } catch (e) {
                    console.error("Web Audio API is not supported or context creation failed.", e);
                    alert("Sorry, your browser doesn't support the required audio features for playback.");
                    loopPlayers.forEach(state => state.button.disabled = true);
                    return;
                }
            }

            // Ensure context is running (might suspend if page is inactive)
            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                    console.log("AudioContext resumed.");
                } catch (e) {
                    console.error("Failed to resume AudioContext:", e);
                    return;
                }
            }

            // --- Play/Pause Logic ---
            if (currentCardState.isPlaying) {
                stopLoop(card); // Stop this specific loop (pass the card element)
            } else {
                // Stop any *other* loops currently playing before starting this one
                stopAllLoops(card); // Pass current card element to prevent it from stopping itself

                // Attempt to play the requested loop (pass the card element)
                await playLoop(card);
            }
        });
    }); // End of sampleCardsWithAudio.forEach

    /**
     * Stops playback for a specific audio loop.
     * @param {HTMLElement} card The sample card element whose loop should be stopped.
     */
    function stopLoop(card) { // Accepts card element
        const playerState = loopPlayers.get(card); // Get state using the card element
        if (playerState && playerState.isPlaying && playerState.sourceNode) {
            try {
                 playerState.sourceNode.stop(0); // Stop immediately
                 console.log(`Stopped: ${playerState.src}`);
            } catch (e) {
                console.warn(`Error stopping node for ${playerState.src} (may already be stopped):`, e.message);
            } finally {
                if (playerState.sourceNode) { // Check if sourceNode still exists before modifying
                    playerState.sourceNode.onended = null; // Remove listener
                    playerState.sourceNode = null;
                }
                playerState.isPlaying = false;
                // Pass the card element to updateButtonUI
                updateButtonUI(card, playerState, false);
            }
        } else if (playerState && playerState.isPlaying) {
             console.warn(`Inconsistent state for ${playerState.src}: isPlaying=true but no sourceNode.`);
             playerState.isPlaying = false;
             // Pass the card element to updateButtonUI
             updateButtonUI(card, playerState, false);
        }
    }

    /**
     * Stops all currently playing audio loops.
     * @param {HTMLElement|null} exceptCard Optional: A card element to exclude from stopping.
     */
    function stopAllLoops(exceptCard = null) {
        console.log('Stopping other loops...');
        loopPlayers.forEach((state, card) => { // Iterate map: state, cardElement
            if (card !== exceptCard && state.isPlaying) {
                stopLoop(card); // Pass the card element to stopLoop
            }
        });
    }

    /**
     * Loads audio data (if needed) and starts seamless playback for a specific loop.
     * @param {HTMLElement} card The sample card element whose loop should be played.
     */
    async function playLoop(card) { // Accepts card element
        const playerState = loopPlayers.get(card); // Get state using the card element

        // Ensure we have a valid state and the AudioContext is ready
        if (!playerState || !audioContext || audioContext.state !== 'running') {
            console.error("Cannot play loop: Invalid state or AudioContext not running.", { playerState, audioContext });
            if (audioContext && audioContext.state === 'suspended') {
                 try { await audioContext.resume(); } catch (e) {
                     alert("Could not resume audio playback. Please interact with the page again."); return;
                 }
            } else if (!audioContext) {
                alert("Audio system not initialized. Please click play again."); return;
            } else {
                 return; // Other issue (e.g. invalid playerState)
            }
        }

        // Show loading state immediately
        playerState.isLoading = true;
        if (playerState.indicator) playerState.indicator.style.display = 'inline';
        if (playerState.button) playerState.button.disabled = true;
        // Pass the card element to updateButtonUI
        updateButtonUI(card, playerState, false); // Keep icon as 'Play' during load

        try {
            // --- 1. Load Audio Buffer (Fetch and Decode) ---
            if (!playerState.audioBuffer && !playerState.loadError) {
                console.log(`Loading audio data for: ${playerState.src}`);
                const response = await fetch(playerState.src);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} fetching ${playerState.src}`);
                const arrayBuffer = await response.arrayBuffer();
                console.log(`Decoding audio data for: ${playerState.src}`);
                playerState.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log(`Successfully decoded: ${playerState.src}`);
                playerState.loadError = null;
            } else if (playerState.loadError) {
                 console.warn(`Attempting to play previously failed source: ${playerState.src}`);
                 throw playerState.loadError;
            }
             if (!playerState.audioBuffer) throw new Error(`AudioBuffer is unexpectedly null for ${playerState.src}`);

            // --- 2. Create and Configure Audio Source Node ---
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = playerState.audioBuffer;
            sourceNode.loop = true;
            sourceNode.connect(audioContext.destination);

            // --- 3. Start Playback ---
            sourceNode.start(0);
            playerState.sourceNode = sourceNode;
            playerState.isPlaying = true;
            console.log(`Playing: ${playerState.src}`);
            // Pass the card element to updateButtonUI
            updateButtonUI(card, playerState, true);

            // --- 4. Handle Node Ending ---
            sourceNode.onended = () => {
                 if (playerState.sourceNode === sourceNode) {
                     console.log(`AudioNode ended for ${playerState.src}. State IsPlaying: ${playerState.isPlaying}`);
                     if (playerState.isPlaying) { // If ended unexpectedly while state thought it was playing
                         playerState.isPlaying = false;
                         // Pass the card element to updateButtonUI
                         updateButtonUI(card, playerState, false);
                         playerState.sourceNode = null;
                     }
                 }
            };

        } catch (error) {
            console.error(`Error processing or playing ${playerState.src}:`, error);
            playerState.loadError = error;
            playerState.isPlaying = false;
            // Pass the card element to updateButtonUI
            updateButtonUI(card, playerState, false); // Ensure button shows "Play"
            alert(`Could not load or play the audio sample "${playerState.src.split('/').pop()}".\n\nError: ${error.message}`);

        } finally {
            // --- Cleanup Loading State ---
            playerState.isLoading = false;
            if (playerState.indicator) playerState.indicator.style.display = 'none';
            if (playerState.button) playerState.button.disabled = false; // Re-enable button
        }
    }

    /**
     * Updates the visual state (icon/text) of a play/pause button.
     * @param {HTMLElement} card The sample card element being updated. <--- ADDED
     * @param {object} playerState The state object for the player.
     * @param {boolean} isPlaying The target state (true for playing/pause, false for stopped/play).
     */
    function updateButtonUI(card, playerState, isPlaying) { // Accepts card element
        // Safety checks
        if (!card || !playerState || !playerState.button) {
            console.warn("updateButtonUI called with invalid arguments", { card, playerState });
            return;
        }

        const button = playerState.button;
        const icon = playerState.icon;

        if (icon) {
            icon.classList.remove(isPlaying ? 'fa-play' : 'fa-pause');
            icon.classList.add(isPlaying ? 'fa-pause' : 'fa-play');
        } else {
            button.textContent = isPlaying ? 'Pause' : 'Play';
        }

        // Update ARIA label using the passed card element
        const action = isPlaying ? 'Pause' : 'Play';
        // Use the h3 from the specific card passed in, or fallback to filename
        const sampleName = card.querySelector('h3')?.textContent || playerState.src.split('/').pop();
        button.setAttribute('aria-label', `${action} ${sampleName}`);

        button.classList.toggle('playing', isPlaying);
    }

    // --- END of Web Audio API Looping Logic ---

}); // End of DOMContentLoaded