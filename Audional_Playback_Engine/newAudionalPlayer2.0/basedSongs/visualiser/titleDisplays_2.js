(function () {
    let titleSequenceTimeouts = [];

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
                el.style.opacity = '0';
                el.style.transform = 'translate(-50%, -50%) scale(1)';
                console.log(`[clearAnimations] Resetting element ${el.id}`);
            });
        }
        titleSequenceTimeouts.forEach(clearTimeout);
        titleSequenceTimeouts = [];
    }

    // Function to setup the text displays
    function setupTextDisplays() {
        const config = window.titleConfig;
        if (!config) return;

        const {
            showTextTime = {}, hideTextTime = {},
            fadeInDuration = {}, fadeOutDuration = {},
            colors = {}, fontSizes = {}, fontStyles = {}, fontTypes = {}
        } = config;

        // Create container for the text displays
        const container = document.createElement('div');
        container.id = 'text-display-container';
        Object.assign(container.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100%', height: '100%', pointerEvents: 'none'
        });
        document.body.appendChild(container);

        // Create text elements and apply styles
        const textElements = {};
        for (let i = 1; i <= 10; i++) {
            const text = config[`displayText_${i}`] || '';
            const element = createElement(`text-display-${i}`, text, container);
            Object.assign(element.style, {
                color: colors[`displayText_${i}`] || '#000',
                fontSize: fontSizes[`displayText_${i}`] || '16px',
                fontWeight: fontStyles[`displayText_${i}`] || 'normal',
                fontFamily: fontTypes[`displayText_${i}`] || 'Arial, sans-serif',
                opacity: '0', position: 'absolute',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                transformOrigin: 'center center'
            });
            textElements[`textDisplay${i}`] = element;
            console.log(`[applyStyles] Applied styles to ${element.id}`);
        }

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
                            element.style.opacity = '1';
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
                            element.style.opacity = '0';
                            setTimeout(() => {
                                element.style.display = 'none';
                                console.log(`[showTextSequence] Fading out and hiding textDisplay${i}`);
                            }, fadeOut);
                        }
                    }, hideTime));
                }
            }
        }

        // Function to perform shrink and fade out animation
        function shrinkAndFadeOut(element, duration) {
            const animate = (time) => {
                if (!animate.startTime) animate.startTime = time;
                const elapsed = time - animate.startTime;
                const progress = Math.min(elapsed / duration, 1);
                const scale = 1 - progress * 0.995;

                Object.assign(element.style, {
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    opacity: `${1 - progress}`
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    Object.assign(element.style, {
                        display: 'none', transform: 'translate(-50%, -50%) scale(1)'
                    });
                    console.log(`[shrinkAndFadeOut] Finished shrinking and hiding ${element.id}`);
                }
            };

            requestAnimationFrame(animate);
        }

        function startTitleTimer() {
            console.log("[textDisplay] Starting title timer...");
            showTextSequence();
        }

        function stopTitleTimer() {
            clearAnimations();
        }

        document.addEventListener('playbackStarted', startTitleTimer);
        document.addEventListener('playbackStopped', stopTitleTimer);
    }

    function waitForSettings() {
        console.log("[textDisplay] Waiting for settings and titleConfig...");
        if (window.titleConfig) {
            console.log("[textDisplay] Settings and titleConfig found, setting up text displays.");
            setupTextDisplays();
        } else {
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
})();
