let visualArtistName = 'SQYZY'; // Hard-coded visual artist name

(function() {
    // Function to setup the title display
    function setupTitleDisplay() {
        if (!window.settings) {
            console.error('Settings not loaded yet');
            return;
        }

        const { projectName, artistName } = window.settings; // No visualArtistName in settings

        // Create container for the title display
        const container = document.createElement('div');
        container.id = 'title-display-container';
        document.body.appendChild(container);

        // Create elements for project name, by, artist name, visual artist, and visual artist name
        const projectNameElement = document.createElement('div');
        projectNameElement.id = 'project-name-display';
        projectNameElement.innerText = projectName;
        container.appendChild(projectNameElement);

        const byElement = document.createElement('div');
        byElement.id = 'by-display';
        byElement.innerText = 'by';
        container.appendChild(byElement);

        const artistNameElement = document.createElement('div');
        artistNameElement.id = 'artist-name-display';
        artistNameElement.innerText = artistName;
        container.appendChild(artistNameElement);

        const visualArtistElement = document.createElement('div');
        visualArtistElement.id = 'visual-artist-display';
        visualArtistElement.innerText = 'visuals by';
        container.appendChild(visualArtistElement);

        const visualArtistNameElement = document.createElement('div');
        visualArtistNameElement.id = 'visual-artist-name-display';
        visualArtistNameElement.innerText = visualArtistName;
        container.appendChild(visualArtistNameElement);

        let animationPlaying = false; // Flag to prevent multiple animations
        const cooldownTime = 60000; // 60 seconds cooldown
        let lastAnimationEnd = 0; // Timestamp of last animation end

        // Function to clear previous animations
        function clearAnimations() {
            projectNameElement.className = '';
            byElement.className = '';
            artistNameElement.className = '';
            visualArtistElement.className = '';
            visualArtistNameElement.className = '';
        }

        // Function to show the title sequence
        function showTitleSequence() {
            if (!animationPlaying && (Date.now() - lastAnimationEnd > cooldownTime)) {
                animationPlaying = true;

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
                                }, 24000); // Duration for visual artist name (total 20s: 2s fade in, 10s hold, 8s fade out with shrinking)
                            }, 4000); // Start visual artist name 14s after visual artist (total 15s for visual artist: 2s fade in, 5s hold, 8s fade out)
                        }, 12000); // Start visual artist 18s after artist name (total 20s for artist name: 2s fade in, 10s hold, 8s fade out)
                    }, 4000); // Start artist name 12s after by starts (total 15s for "by": 2s fade in, 5s hold, 8s fade out)
                }, 12000); // Start "by" animation 18s after project name (total 20s for project name: 2s fade in, 10s hold, 8s fade out)
            }
        }


        // Throttle the mousemove event to avoid excessive triggering
        document.addEventListener('mousemove', (event) => {
            if (event.clientY < 50) { // Adjust the threshold as needed
                showTitleSequence();
            }
        });
    }

    function waitForSettings() {
        if (window.settings) {
            setupTitleDisplay();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
