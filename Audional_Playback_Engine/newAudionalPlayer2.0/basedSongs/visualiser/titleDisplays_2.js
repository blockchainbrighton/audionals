(function () {
    let titleSequenceTimeouts = []; // Store timeouts to clear later

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
        const container = document.querySelector('#text-display-container');
        if (container) {
            container.childNodes.forEach(el => {
                el.style.display = 'none';
                el.style.opacity = '0'; // Ensure opacity is reset
                el.style.transform = 'translate(-50%, -50%) scale(1)'; // Reset scale
                console.log(`[clearAnimations] Resetting element ${el.id}`);
            });
        }
        titleSequenceTimeouts.forEach(timeout => clearTimeout(timeout));
        titleSequenceTimeouts = [];
    }

    // Function to setup the text displays
    function setupTextDisplays() {
        if (!window.settings || !window.titleConfig) {
            return;
        }

        const {
            showTextTime = {}, hideTextTime = {},
            fadeInDuration = {}, fadeOutDuration = {},
            colors = {}, fontSizes = {}, fontStyles = {}, fontTypes = {}
        } = window.titleConfig;

        // Create container for the text displays
        const container = document.createElement('div');
        container.id = 'text-display-container';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none'; // Non-interactive
        document.body.appendChild(container);

        // Create text elements
        const textElements = {};
        for (let i = 1; i <= 10; i++) {
            const text = window.titleConfig[`displayText_${i}`] || '';
            textElements[`textDisplay${i}`] = createElement(`text-display-${i}`, text, container);
        }

        // Apply styles
        applyStyles(textElements);

        // Function to show and hide text elements based on configured times
        function showTextSequence() {
            clearAnimations();
            for (let i = 1; i <= 10; i++) {
                const showTime = showTextTime[`displayText_${i}`];
                const hideTime = hideTextTime[`displayText_${i}`];
                const fadeIn = fadeInDuration[`displayText_${i}`] || 1000;
                const fadeOut = fadeOutDuration[`displayText_${i}`] || 1000;

                if (showTime !== undefined && hideTime !== undefined) {
                    titleSequenceTimeouts.push(setTimeout(() => {
                        const element = textElements[`textDisplay${i}`];
                        element.style.display = 'block';
                        element.style.transition = `opacity ${fadeIn}ms`;
                        requestAnimationFrame(() => {
                            element.style.opacity = '1'; // Set opacity to 1 when showing
                            console.log(`[showTextSequence] Showing textDisplay${i}`);
                        });
                    }, showTime));

                    titleSequenceTimeouts.push(setTimeout(() => {
                        const element = textElements[`textDisplay${i}`];
                        console.log(`[showTextSequence] Preparing to hide textDisplay${i}`);

                        if (i === 5) { // Apply JavaScript shrink effect for displayText_5
                            shrinkAndFadeOut(element, fadeOut);
                        } else {
                            element.style.transition = `opacity ${fadeOut}ms`;
                            element.style.opacity = '0'; // Fade out before hiding
                            setTimeout(() => {
                                element.style.display = 'none';
                                console.log(`[showTextSequence] Fading out and hiding textDisplay${i}`);
                            }, fadeOut); // Give some time to fade out before hiding
                        }
                    }, hideTime));
                }
            }
        }

        // Function to apply styles to text elements
        function applyStyles(elements) {
            for (let i = 1; i <= 10; i++) {
                const element = elements[`textDisplay${i}`];
                if (element) {
                    element.style.color = colors[`displayText_${i}`] || '#000';
                    element.style.fontSize = fontSizes[`displayText_${i}`] || '16px';
                    element.style.fontWeight = fontStyles[`displayText_${i}`] || 'normal';
                    element.style.fontFamily = fontTypes[`displayText_${i}`] || 'Arial, sans-serif';
                    element.style.opacity = '0'; // Initially set opacity to 0

                    // Apply central positioning
                    element.style.position = 'absolute';
                    element.style.top = '50%';
                    element.style.left = '50%';
                    element.style.transform = 'translate(-50%, -50%)';
                    element.style.transformOrigin = 'center center';

                    // Debug log for styles applied
                    console.log(`[applyStyles] Applied styles to ${element.id}: ` +
                        `color=${element.style.color}, fontSize=${element.style.fontSize}, ` +
                        `fontWeight=${element.style.fontWeight}, fontFamily=${element.style.fontFamily}, ` +
                        `opacity=${element.style.opacity}, top=${element.style.top}, left=${element.style.left}, transform=${element.style.transform}`);
                }
            }
        }

        // Function to perform shrink and fade out animation
        function shrinkAndFadeOut(element, duration) {
            let startTime = null;

            function animate(time) {
                if (!startTime) startTime = time;
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const scale = 1 - progress * 0.995; // Scale to 0.005

                element.style.transform = `translate(-50%, -50%) scale(${scale})`;
                element.style.opacity = `${1 - progress}`;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    element.style.transform = 'translate(-50%, -50%) scale(1)';
                    console.log(`[shrinkAndFadeOut] Finished shrinking and hiding ${element.id}`);
                }
            }

            requestAnimationFrame(animate);
        }

        // Start the text sequence when ready
        function startTitleTimer() {
            console.log("[textDisplay] Starting title timer...");
            showTextSequence();
        }

        // Stop the text sequence and clear animations
        function stopTitleTimer() {
            clearAnimations();
        }

        // Listen for custom playbackStarted event
        document.addEventListener('playbackStarted', startTitleTimer);

        // Listen for custom playbackStopped event to clear animations and stop the timer
        document.addEventListener('playbackStopped', stopTitleTimer);
    }

    // Function to wait for settings and titleConfig to load
    function waitForSettings() {
        console.log("[textDisplay] Waiting for settings and titleConfig...");
        if (window.settings && window.titleConfig) {
            console.log("[textDisplay] Settings and titleConfig found, setting up text displays.");
            setupTextDisplays();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
