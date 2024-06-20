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

        const { projectName, artistName, visualArtistName, timings, colors, fontSizes } = window.titleConfig;
        if (!projectName || !artistName || !visualArtistName || !timings || !colors || !fontSizes) {
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

        const { projectNameDuration, byDuration, artistNameDuration, visualArtistDuration, visualArtistNameDuration } = timings;

        // Apply colors and font sizes
        applyStyles();

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
                        visualArtistElement.classList.add('show-and');
                        titleSequenceTimeouts.push(setTimeout(() => {
                            visualArtistNameElement.classList.add('show-visual-artist-name');
                            titleSequenceTimeouts.push(setTimeout(() => {
                                clearAnimations();
                                animationPlaying = false;
                                console.log("[titleDisplay] Title sequence completed.");
                            }, visualArtistNameDuration)); // Duration for visual artist name
                        }, visualArtistDuration - 1000)); // Start visual artist name
                    }, artistNameDuration)); // Start and
                }, byDuration)); // Start artist name
            }, window.titleConfig.timings.projectNameDuration + 1000)); // Delay "by" by 1 second
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

        // Timer functions
        let titleTimer = null;

        function startTitleTimer(callbacks) {
            const { triggerTimes } = window.titleConfig;

            if (!triggerTimes) {
                console.warn('[titleDisplay] No trigger times configuration found.');
                return;
            }

            // Convert trigger times to milliseconds and sort them
            const sortedTriggerTimes = Object.entries(triggerTimes)
                .filter(([_, timeString]) => timeString) // Filter out null values
                .map(([name, timeString]) => [name, timeStringToMilliseconds(timeString)])
                .sort((a, b) => a[1] - b[1]);

            let currentIndex = 0;
            const startTime = Date.now();

            titleTimer = setInterval(() => {
                const currentTime = Date.now() - startTime;
                if (currentIndex < sortedTriggerTimes.length) {
                    const [eventName, eventTime] = sortedTriggerTimes[currentIndex];

                    if (currentTime >= eventTime) {
                        console.log(`[titleDisplay] Triggering event: ${eventName} at time: ${eventTime}`);
                        if (callbacks[eventName]) {
                            callbacks[eventName]();
                        } else {
                            console.error(`[titleDisplay] No callback found for event: ${eventName}`);
                        }
                        currentIndex++;
                    }
                } else {
                    stopTitleTimer();
                }
            }, 100); // Check every 100ms
        }

        function stopTitleTimer() {
            if (titleTimer) {
                clearInterval(titleTimer);
                titleTimer = null;
                console.log('[titleDisplay] Title timer stopped.');
            }
        }

        function applyStyles() {
            const { colors, fontSizes } = window.titleConfig;

            if (!colors || !fontSizes) {
                console.warn('[titleDisplay] No style configuration found.');
                return;
            }

            // Apply colors and font sizes to respective elements
            projectNameElement.style.color = colors.projectNameColor || '#000';
            projectNameElement.style.fontSize = fontSizes.projectNameFontSize || '16px';
            byElement.style.color = colors.byColor || '#000';
            byElement.style.fontSize = fontSizes.byFontSize || '12px';
            artistNameElement.style.color = colors.artistNameColor || '#000';
            artistNameElement.style.fontSize = fontSizes.artistNameFontSize || '16px';
            visualArtistElement.style.color = colors.visualArtistColor || '#000';
            visualArtistElement.style.fontSize = fontSizes.visualArtistFontSize || '12px';
            visualArtistNameElement.style.color = colors.visualArtistNameColor || '#000';
            visualArtistNameElement.style.fontSize = fontSizes.visualArtistNameFontSize || '16px';
        }

        // Listen for custom playbackStarted event
        document.addEventListener('playbackStarted', () => {
            console.log("[titleDisplay] playbackStarted event received.");
            showTitleSequence();

            // Start the title timer with callbacks for each event
            startTitleTimer({
                projectName: () => showSingleTitleElement('projectName'),
                artistName: () => showSingleTitleElement('artistName'),
                visualArtistName: () => showSingleTitleElement('visualArtistName'),
                // Add more callbacks as needed
            });
        });

        // Listen for custom playbackStopped event to clear animations and stop the timer
        document.addEventListener('playbackStopped', () => {
            console.log("[titleDisplay] playbackStopped event received.");
            clearAnimations(); // Clear animations when playback stops
            animationPlaying = false;
            stopTitleTimer(); // Stop the title timer
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

// Helper function to convert time string (minutes:seconds:hundredths) to milliseconds
function timeStringToMilliseconds(timeString) {
    const [minutes, seconds, hundredths] = timeString.split(':').map(Number);
    return (minutes * 60000) + (seconds * 1000) + (hundredths * 10);
}