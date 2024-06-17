(function() {
    let titleSequenceTimeouts = []; // Store timeouts to clear later
    let animationPlaying = false; // Flag to prevent multiple animations

    // Utility function to create and append elements
    function createElement(id, text, container) {
        const element = document.createElement('div');
        element.id = id;
        element.innerText = text || '';
        container.appendChild(element);
        console.log(`[titleDisplay] ${id} element created with text: "${text}"`);
        return element;
    }

    // Function to clear previous animations and timeouts
    function clearAnimations() {
        console.log("[titleDisplay] Clearing animations.");
        document.querySelectorAll('#title-display-container > div').forEach(el => el.className = '');

        // Clear any ongoing timeouts
        titleSequenceTimeouts.forEach(clearTimeout);
        titleSequenceTimeouts = [];
    }

    // Function to setup the title display
    function setupTitleDisplay() {
        console.log("[titleDisplay] setupTitleDisplay called.");

        // Check if both window.settings and window.titleConfig are available
        if (!window.settings || !window.titleConfig) {
            console.error('[titleDisplay] Settings or titleConfig not loaded yet, exiting.');
            return;
        }

        const { projectName, artistName, visualArtistName, timings } = window.titleConfig;

        // Check if all required properties are present
        if (!projectName || !artistName || !visualArtistName || !timings) {
            console.error('[titleDisplay] Missing required configuration values, exiting.');
            return;
        }

        // Create container for the title display
        const container = document.createElement('div');
        container.id = 'title-display-container';
        document.body.appendChild(container);
        console.log("[titleDisplay] Title display container created.");

        // Create title elements
        const projectNameElement = createElement('project-name-display', projectName, container);
        const byElement = createElement('by-display', 'by', container);
        const artistNameElement = createElement('artist-name-display', artistName, container);
        const visualArtistElement = createElement('visual-artist-display', 'and', container);
        const visualArtistNameElement = createElement('visual-artist-name-display', visualArtistName, container);

        const { cooldownTime, projectNameDuration, byDuration, artistNameDuration, visualArtistDuration, visualArtistNameDuration } = timings;

        // Apply colors after creating elements
        applyColors();
        
        // Function to show the title sequence
        function showTitleSequence() {
            console.log("[titleDisplay] showTitleSequence called. Animation playing:", animationPlaying);

            // Clear previous animations and timeouts before starting the new sequence
            clearAnimations();
            animationPlaying = true;
            console.log("[titleDisplay] Starting title sequence.");

            // Sequence: Show project name, then "by", then artist name, then visual artist, then visual artist name
            projectNameElement.classList.add('show-project-name');
            titleSequenceTimeouts.push(setTimeout(() => {
                byElement.classList.add('show-by');
                titleSequenceTimeouts.push(setTimeout(() => {
                    artistNameElement.classList.add('show-artist-name');
                    titleSequenceTimeouts.push(setTimeout(() => {
                        visualArtistElement.classList.add('show-visual-artist');
                        titleSequenceTimeouts.push(setTimeout(() => {
                            visualArtistNameElement.classList.add('show-visual-artist-name');
                            titleSequenceTimeouts.push(setTimeout(() => {
                                clearAnimations();
                                animationPlaying = false;
                                console.log("[titleDisplay] Title sequence completed.");
                            }, visualArtistNameDuration)); // Duration for visual artist name
                        }, visualArtistDuration)); // Start visual artist name
                    }, artistNameDuration)); // Start visual artist
                }, byDuration)); // Start artist name
            }, projectNameDuration)); // Start "by" animation
        }

        function applyColors() {
            const { colors } = window.titleConfig;
            
            if (!colors) {
                console.warn('[titleDisplay] No color configuration found.');
                return;
            }
        
            // Apply colors to respective elements
            document.getElementById('project-name-display').style.color = colors.projectNameColor || '#000';
            document.getElementById('by-display').style.color = colors.byColor || '#000';
            document.getElementById('artist-name-display').style.color = colors.artistNameColor || '#000';
            document.getElementById('visual-artist-display').style.color = colors.visualArtistColor || '#000';
            document.getElementById('visual-artist-name-display').style.color = colors.visualArtistNameColor || '#000';
        }
        

        // Listen for custom playbackStarted event
        document.addEventListener('playbackStarted', () => {
            console.log("[titleDisplay] playbackStarted event received.");
            showTitleSequence();
        });

        // Listen for custom playbackStopped event to clear animations (if needed)
        document.addEventListener('playbackStopped', () => {
            console.log("[titleDisplay] playbackStopped event received.");
            clearAnimations(); // Clear animations when playback stops
            animationPlaying = false;
        });
    }

    // Function to wait for settings and titleConfig to load
    function waitForSettings() {
        console.log("[titleDisplay] Waiting for settings and titleConfig...");
        if (window.settings && window.titleConfig) {
            console.log("[titleDisplay] Settings and titleConfig found, setting up title display.");
            setupTitleDisplay();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
