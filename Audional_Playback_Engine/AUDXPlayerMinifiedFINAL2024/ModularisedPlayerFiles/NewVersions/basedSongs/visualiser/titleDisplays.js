let visualArtistName = 'SQYZY'; // Hard-coded visual artist name

(function() {
    // Function to setup the title display
    function setupTitleDisplay() {
        console.log("[titleDisplay] setupTitleDisplay called.");
        if (!window.settings) {
            console.error('[titleDisplay] Settings not loaded yet');
            return;
        }

        const { projectName, artistName } = window.settings;
        console.log("[titleDisplay] Settings loaded:", window.settings);

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
        const cooldownTime = 60000; // 60 seconds cooldown
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
                                }, 24000); // Duration for visual artist name (total 20s: 2s fade in, 10s hold, 8s fade out with shrinking)
                            }, 4000); // Start visual artist name 14s after visual artist (total 15s for visual artist: 2s fade in, 5s hold, 8s fade out)
                        }, 12000); // Start visual artist 18s after artist name (total 20s for artist name: 2s fade in, 10s hold, 8s fade out)
                    }, 4000); // Start artist name 12s after by starts (total 15s for "by": 2s fade in, 5s hold, 8s fade out)
                }, 12000); // Start "by" animation 18s after project name (total 20s for project name: 2s fade in, 10s hold, 8s fade out)
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
        if (window.settings) {
            console.log("[titleDisplay] Settings found, setting up title display.");
            setupTitleDisplay();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
