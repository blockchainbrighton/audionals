(function() {
    // Function to setup the title display
    function setupTitleDisplay() {
        console.log("[titleDisplay] setupTitleDisplay called.");
        
        if (!window.settings || !window.titleConfig) {
            console.error('[titleDisplay] Settings or titleConfig not loaded yet');
            return;
        }

        const { projectName, artistName, visualArtistName, timings } = window.titleConfig;
        console.log("[titleDisplay] titleConfig loaded:", window.titleConfig);

        // Create container for the title display
        const container = document.createElement('div');
        container.id = 'title-display-container';
        document.body.appendChild(container);
        console.log("[titleDisplay] Title display container created.");

        // Create elements for project name, by, artist name, visual artist, and visual artist name
        const projectNameElement = document.createElement('div');
        projectNameElement.id = 'project-name-display';
        projectNameElement.innerText = projectName;
        container.appendChild(projectNameElement);
        console.log("[titleDisplay] Project name element created.");

        const byElement = document.createElement('div');
        byElement.id = 'by-display';
        byElement.innerText = 'by';
        container.appendChild(byElement);
        console.log("[titleDisplay] 'By' element created.");

        const artistNameElement = document.createElement('div');
        artistNameElement.id = 'artist-name-display';
        artistNameElement.innerText = artistName;
        container.appendChild(artistNameElement);
        console.log("[titleDisplay] Artist name element created.");

        const visualArtistElement = document.createElement('div');
        visualArtistElement.id = 'visual-artist-display';
        visualArtistElement.innerText = 'visuals by';
        container.appendChild(visualArtistElement);
        console.log("[titleDisplay] Visual artist element created.");

        const visualArtistNameElement = document.createElement('div');
        visualArtistNameElement.id = 'visual-artist-name-display';
        visualArtistNameElement.innerText = visualArtistName;
        container.appendChild(visualArtistNameElement);
        console.log("[titleDisplay] Visual artist name element created.");

        let animationPlaying = false; // Flag to prevent multiple animations
        const { cooldownTime, projectNameDuration, byDuration, artistNameDuration, visualArtistDuration, visualArtistNameDuration } = timings;
        let lastAnimationEnd = 0; // Timestamp of last animation end

        // Function to clear previous animations
        function clearAnimations() {
            console.log("[titleDisplay] Clearing animations.");
            projectNameElement.className = '';
            byElement.className = '';
            artistNameElement.className = '';
            visualArtistElement.className = '';
            visualArtistNameElement.className = '';
        }

        // Function to show the title sequence
        function showTitleSequence() {
            console.log("[titleDisplay] showTitleSequence called. Animation playing:", animationPlaying);
            if (!animationPlaying && (Date.now() - lastAnimationEnd > cooldownTime)) {
                animationPlaying = true;
                console.log("[titleDisplay] Starting title sequence.");

                // Clear previous animations
                clearAnimations();

                // Sequence: Show project name, then "by", then artist name, then visual artist, then visual artist name
                projectNameElement.classList.add('show-project-name');
                setTimeout(() => {
                    byElement.classList.add('show-by');
                    setTimeout(() => {
                        artistNameElement.classList.add('show-artist-name');
                        setTimeout(() => {
                            visualArtistElement.classList.add('show-visual-artist');
                            setTimeout(() => {
                                visualArtistNameElement.classList.add('show-visual-artist-name');
                                setTimeout(() => {
                                    clearAnimations();
                                    animationPlaying = false;
                                    lastAnimationEnd = Date.now();
                                    console.log("[titleDisplay] Title sequence completed.");
                                }, visualArtistNameDuration); // Duration for visual artist name
                            }, visualArtistDuration); // Start visual artist name
                        }, artistNameDuration); // Start visual artist
                    }, byDuration); // Start artist name
                }, projectNameDuration); // Start "by" animation
            }
        }

        // Listen for custom playbackStarted event
        document.addEventListener('playbackStarted', () => {
            console.log("[titleDisplay] playbackStarted event received.");
            showTitleSequence();
        });
    }

    function waitForSettings() {
        console.log("[titleDisplay] Waiting for settings...");
        if (window.settings && window.titleConfig) {
            console.log("[titleDisplay] Settings and titleConfig found, setting up title display.");
            setupTitleDisplay();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
