(function() {
    let titleSequenceTimeouts = []; // Store timeouts to clear later
    let animationPlaying = false; // Flag to prevent multiple animations

   

    // Utility function to create and append elements
    function createElement(id, text, container) {
        const element = document.createElement('div');
        element.id = id;
        element.innerText = text || '';
        container.appendChild(element);
        return element;
    }

    // Function to clear previous animations and timeouts
    function clearAnimations() {
        document.querySelectorAll('#title-display-container > div').forEach(el => el.className = '');

        // Clear any ongoing timeouts
        titleSequenceTimeouts.forEach(clearTimeout);
        titleSequenceTimeouts = [];
    }

    // Function to setup the title display
    function setupTitleDisplay() {
        if (!window.settings || !window.titleConfig) {
            return;
        }

        const { projectName, artistName, visualArtistName, timings } = window.titleConfig;

        if (!projectName || !artistName || !visualArtistName || !timings) {
            return;
        }

        // Create container for the title display
        const container = document.createElement('div');
        container.id = 'title-display-container';
        document.body.appendChild(container);

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
            clearAnimations();
            animationPlaying = true;

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

        // Function to show a single title element
        function showSingleTitleElement(elementName) {
            clearAnimations();

            let duration = 0;
            let element;

            switch(elementName) {
                case 'projectName':
                    element = projectNameElement;
                    duration = projectNameDuration;
                    break;
                case 'artistName':
                    element = artistNameElement;
                    duration = artistNameDuration;
                    break;
                case 'visualArtistName':
                    element = visualArtistNameElement;
                    duration = visualArtistNameDuration;
                    break;
                default:
                    console.error(`[titleDisplay] Unknown element name: ${elementName}`);
                    return;
            }

            element.classList.add(`show-${elementName}`);
            titleSequenceTimeouts.push(setTimeout(() => {
                clearAnimations();
                console.log(`[titleDisplay] ${elementName} display completed.`);
            }, duration));
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
        document.addEventListener('customTitleDisplay', (event) => {
            console.log("[titleDisplay] Custom title display event received:", event.detail);
            showTitleSequence(); // You may want to modify this to show specific parts based on event details
        });
    
        // Consolidated listener for single title element display
        document.addEventListener('singleTitleDisplay', (event) => {
            const elementName = event.detail;
            console.log(`[titleDisplay] Single title display event received for: ${elementName}`);
            showSingleTitleElement(elementName);
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
