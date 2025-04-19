document.addEventListener('DOMContentLoaded', () => {
    // --- Existing Loading Screen Logic ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);

    // --- Existing Basic Interactivity ---
    const sequencerPlayButtons = document.querySelectorAll('.sequencer-placeholder .play-button');
    sequencerPlayButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.textContent.includes('Play')) {
                button.textContent = '❚❚ Pause';
                button.closest('.sequencer-placeholder').classList.add('playing');
            } else {
                button.textContent = '▶ Play';
                button.closest('.sequencer-placeholder').classList.remove('playing');
            }
        });
    });

    const compositionPlayButtons = document.querySelectorAll('.featured-composition .play-button');
    compositionPlayButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Playing composition... (feature not implemented)');
        });
    });

    // --- NEW: Tools Page Tab Navigation Logic ---
    const tabsContainer = document.querySelector('.tools-page .tabs');
    if (tabsContainer) {
        const tabButtons = tabsContainer.querySelectorAll('.tab-button');
        const toolSections = document.querySelectorAll('.tools-page .tool-section');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update button active state
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update content section visibility
                toolSections.forEach(section => {
                    if (section.id === `tab-content-${targetTab}`) {
                        section.classList.add('active');
                    } else {
                        section.classList.remove('active');
                    }
                });
            });
        });
    }

    // --- Optional: Set Active Nav Link ---
    // function setActiveNavLink() { ... }
    // setActiveNavLink();
});