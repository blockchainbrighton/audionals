/**
 * sampleManager.js
 * Handles sorting sample data, generating sample cards in the DOM,
 * and initializing category filtering.
 */
import { sampleData, neonRowColors } from './config.js';

// --- Helper function for Sorting ---
function getSortKeys(sample) {
    const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
    const bpmMatch = (sample.details && typeof sample.details === 'string') ? sample.details.match(/^(\d+)\s*BPM/i) : null;
    const kitName = titleMatch ? titleMatch[1].trim() : sample.title;
    const variation = titleMatch ? titleMatch[2].trim() : '';
    const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;
    const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`;
    return { kitName, bpm, variation, groupIdentifier };
}

// --- Sort Sample Data ---
function sortSampleData() {
    sampleData.sort((a, b) => {
        const keysA = getSortKeys(a);
        const keysB = getSortKeys(b);
        const groupCompare = keysA.groupIdentifier.localeCompare(keysB.groupIdentifier);
        if (groupCompare !== 0) { return groupCompare; }
        return keysA.variation.localeCompare(keysB.variation, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// --- Generate Sample Cards ---
export function generateSampleCards(samplesGridSelector, audioContextAvailable) {
    sortSampleData(); // Sort before generating

    const samplesGrid = document.querySelector(samplesGridSelector);
    const loopPlayers = new Map(); // Store references to card elements and initial state

    if (!samplesGrid) {
        console.error(`Could not find the '${samplesGridSelector}' element to populate samples.`);
        return loopPlayers; // Return empty map
    }

    samplesGrid.innerHTML = ''; // Clear existing grid content
    let previousGroupIdentifier = null;
    let currentRowContainer = null;
    let rowIndex = 0;

    sampleData.forEach(sample => {
        const currentKeys = getSortKeys(sample);

        // Create a new row container if the group changes
        if (currentKeys.groupIdentifier !== previousGroupIdentifier || currentRowContainer === null) {
            currentRowContainer = document.createElement('div');
            currentRowContainer.classList.add('sample-row');
            const uniqueColor = neonRowColors[rowIndex % neonRowColors.length];
            currentRowContainer.style.borderTopColor = uniqueColor;
            currentRowContainer.style.setProperty('--row-border-color', uniqueColor);
            samplesGrid.appendChild(currentRowContainer);
            previousGroupIdentifier = currentKeys.groupIdentifier;
            rowIndex++;
        }

        // Create the sample card element
        const card = document.createElement('div');
        card.classList.add('sample-card');
        card.dataset.group = currentKeys.groupIdentifier;
        card.dataset.originalBpm = currentKeys.bpm > 0 ? currentKeys.bpm : '';

        if (sample.src) {
            card.dataset.src = sample.src;
            if (sample.category) card.dataset.category = sample.category;

            const titleEl = document.createElement('h3');
            titleEl.textContent = sample.title;
            card.appendChild(titleEl);

            const details = document.createElement('p');
            details.textContent = sample.details || '';
            card.appendChild(details);

            const playButton = document.createElement('button');
            playButton.classList.add('play-pause-btn');
            playButton.setAttribute('tabindex', '-1'); // Often better for screen readers if the card itself is focusable
            playButton.setAttribute('aria-label', `Play/Pause ${sample.title || 'sample'}`);

            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-play');
            playButton.appendChild(icon);
            card.appendChild(playButton);

            const loadingIndicator = document.createElement('span');
            loadingIndicator.classList.add('loading-indicator');
            loadingIndicator.style.display = 'none';
            loadingIndicator.textContent = 'Loading...';
            card.appendChild(loadingIndicator);

            const originalBPM = parseInt(card.dataset.originalBpm, 10) || currentKeys.bpm || 0;
            if (audioContextAvailable) {
                 if (originalBPM === 0 && sample.src) {
                    console.warn(`Sample "${sample.src}" has no discernible BPM for quantize. Defaults to normal speed.`);
                 }
                // Initial state for the audio engine (will be populated further by audioEngine)
                const playerState = {
                    src: sample.src,
                    button: playButton,
                    indicator: loadingIndicator,
                    icon: icon,
                    originalBPM: originalBPM,
                    // Audio specific state will be added by audioEngine
                    isPlaying: false,
                    audioBuffer: null,
                    audioPromise: null,
                    sourceNode: null,
                    gainNode: null,
                    isMutedDueToSolo: false,
                    isLoading: false,
                    loadError: null
                };
                loopPlayers.set(card, playerState);
            } else {
                // Audio context not available, disable audio features
                playButton.disabled = true;
                playButton.title = "Audio playback not available.";
                loadingIndicator.textContent = "Audio N/A";
                loadingIndicator.style.display = 'inline';
                card.classList.add('audio-error');
            }

        } else { // Placeholder card
            card.classList.add('placeholder');
            const titleEl = document.createElement('h3');
            titleEl.textContent = sample.title || 'Coming Soon...';
            card.appendChild(titleEl);

            const details = document.createElement('p');
            details.textContent = sample.details || 'More variants pending';
            card.appendChild(details);

            card.setAttribute('data-tooltip', sample.details || 'Loop not yet available');
            // Placeholder doesn't get added to loopPlayers map as it has no audio
        }
        currentRowContainer.appendChild(card);
    });

    console.log(`Generated ${loopPlayers.size} audio players (cards with audio src).`);
    return loopPlayers;
}

// --- Initialize Category Filtering ---
export function initFiltering(filterButtonsSelector, cardsSelector) {
    const filterButtons = document.querySelectorAll(filterButtonsSelector);
    const sampleCardsToFilter = document.querySelectorAll(cardsSelector);

    if (filterButtons.length === 0) {
        console.log("No category filter buttons found using selector:", filterButtonsSelector);
        return;
    }
    if (sampleCardsToFilter.length === 0) {
        console.warn("No sample cards found using selector:", cardsSelector);
        // Continue, maybe cards are added later, though unlikely with current flow
    }


    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const selectedCategory = button.dataset.category;

            sampleCardsToFilter.forEach(card => {
                // Check if the card has a category dataset (non-placeholders should)
                const cardCategory = card.dataset.category;
                // Check if it's explicitly marked as a placeholder
                const isPlaceholder = card.classList.contains('placeholder');

                // Show if:
                // 1. 'all' is selected OR
                // 2. It's a placeholder (always show placeholders regardless of filter) OR
                // 3. The card's category matches the selected filter
                const shouldShow = (selectedCategory === 'all' || isPlaceholder || (cardCategory && cardCategory === selectedCategory));

                // Use visibility for potentially better layout stability, or display none
                 card.style.display = shouldShow ? '' : 'none';
                // card.style.visibility = shouldShow ? 'visible' : 'hidden';
                // card.style.position = shouldShow ? '' : 'absolute'; // If using visibility
            });

            // Optional: Adjust layout of parent rows if they become empty? (More complex)
             const rows = document.querySelectorAll(`${samplesGridSelector} .sample-row`);
             rows.forEach(row => {
                const visibleCardsInRow = Array.from(row.querySelectorAll('.sample-card')).filter(card => card.style.display !== 'none');
                 row.style.display = visibleCardsInRow.length > 0 ? '' : 'none'; // Hide empty rows
             });
        });
    });

    // Activate "all" filter by default on load
    const allButton = document.querySelector(`${filterButtonsSelector}[data-category="all"]`);
    if (allButton) {
        allButton.click();
    } else {
        console.warn("Could not find the 'all' category filter button to activate by default.");
        // Fallback: Maybe click the first button?
        if (filterButtons.length > 0) {
            filterButtons[0].click();
        }
    }
}