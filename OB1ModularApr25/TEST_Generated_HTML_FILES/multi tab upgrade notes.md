Okay, this is a fascinating and powerful feature request! Implementing a multi-tab save/load system that preserves the state across different instances of your application presents significant challenges due to browser security restrictions (tab isolation), but it's achievable using browser storage mechanisms and careful coordination.

Here's a breakdown of the concept and a step-by-step implementation guide using localStorage and potentially BroadcastChannel for coordination.

Core Concepts:

Tab Identification: Each open tab running your application needs a unique identifier.

State Sharing/Discovery: Tabs need a way to signal their existence and share their current state (settings, loaded MIDI data, etc.) with others. localStorage is a good candidate because changes trigger a storage event in other tabs of the same origin.

State Aggregation: One tab (the one initiating "Save All") needs to collect the state from all other identified tabs.

Saving: The aggregated state is saved into a single JSON file.

Loading & Restoration: When loading the file, one tab reads it and then needs to:

Apply the state for the "first" tab to itself.

Programmatically open new tabs for the other saved states.

Pass the specific state data to each newly opened tab so it can initialize correctly.

Implementation Steps:

Phase 1: Tracking and Saving Individual Tab State

Generate Unique Tab IDs:

In main.js (or a dedicated sessionManager.js module), generate a unique ID for each tab when it initializes. Use crypto.randomUUID() for modern browsers or a robust library/function for wider compatibility.

Store this tabId in a module-level variable within that tab's instance.

// In main.js or sessionManager.js
let currentTabId = crypto.randomUUID();
const LOCAL_STORAGE_KEY_PREFIX = 'audional_tab_state_';
let appStateUpdateTimeout = null;

console.log(`Initializing tab with ID: ${currentTabId}`);


Define State Structure:

Create a function (e.g., getCurrentAppState in main.js) that gathers all the necessary state information into a structured object. This must include everything needed to restore the tab:

tabId: The unique ID of this tab.

audioSettings: { tempo, pitch, volume, isReversed, multiplier } (Get these from audioProcessor or the sliders).

midiRecording: The recordedEvents array from midiRecorder.js (if any). Get this via an exported function like midiRecorder.getRecordingData().

audioSourceInfo: Information about the original audio sample used (e.g., its base64 data or a reference/name if you implement user loading later). You might need to store the initial imageBase64 and audioBase64_Opus used for this instance.

uiState: { isReferencePanelVisible, isControlsColumnVisible, isMidiRecorderVisible } (Optional but helpful).

selectedMidiDevice: The ID of the currently selected MIDI input device from midiHandler.js.

// Example in main.js (needs access to other modules)
function getCurrentAppState() {
    // Assume audio, midiRecorder, etc. are imported and initialized
    const audioSettings = {
        tempo: audio.getCurrentTempo ? audio.getCurrentTempo() : DEFAULT_TEMPO,
        pitch: audio.getCurrentPitch ? audio.getCurrentPitch() : DEFAULT_PITCH,
        volume: /* Need a getter for current volume in audioProcessor */ audio.getCurrentVolume ? audio.getCurrentVolume() : DEFAULT_VOLUME,
        isReversed: audio.getReverseState ? audio.getReverseState() : false,
        multiplier: audio.getScheduleMultiplier ? audio.getScheduleMultiplier() : 1,
    };
    const midiRecordingData = midiRecorder.getRecordingData ? midiRecorder.getRecordingData() : [];
    const audioSource = { // Store the initial data used by this tab
         image: typeof imageBase64 !== 'undefined' ? imageBase64 : null,
         audioOpus: typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null
    };
    const selectedMidi = midiHandler.getSelectedDeviceId ? midiHandler.getSelectedDeviceId() : null;
    // ... other state like UI visibility

    return {
        tabId: currentTabId,
        timestamp: Date.now(), // Useful for debugging/staleness checks
        audioSettings,
        midiRecording: midiRecordingData,
        audioSourceInfo: audioSource,
        selectedMidiDevice: selectedMidi,
        // uiState: { ... }
    };
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

(Important): Ensure midiRecorder.js exports a function like getRecordingData() that returns recordedEvents, and setRecordingData(events) to load data back in. Add getCurrentVolume and getSelectedDeviceId getters to respective modules.

Write State to localStorage:

Create a function saveCurrentStateToLocalStorage() that calls getCurrentAppState() and writes the result to localStorage using the tab's unique ID in the key.

Call this function whenever significant state changes occur (e.g., tempo/pitch/volume change ends, reverse toggled, MIDI recording stopped, MIDI device selected). Use debouncing for frequent events like slider moves to avoid excessive writes.

// In main.js or sessionManager.js
function saveCurrentStateToLocalStorage() {
    try {
        const state = getCurrentAppState();
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${currentTabId}`;
        localStorage.setItem(key, JSON.stringify(state));
        // console.log(`Saved state for tab ${currentTabId}`);
    } catch (error) {
        console.error(`Error saving state for tab ${currentTabId} to localStorage:`, error);
        ui.showError("Error saving tab state.");
        // Handle potential quota exceeded errors
    }
}

// Debounced version for frequent updates
function debouncedSaveState() {
    clearTimeout(appStateUpdateTimeout);
    appStateUpdateTimeout = setTimeout(saveCurrentStateToLocalStorage, 500); // Adjust delay as needed
}

// Example usage in event listeners (main.js)
// addListener(tempoSlider, 'change', saveCurrentStateToLocalStorage, 'tempoSlider'); // On 'change' (less frequent)
// addListener(volumeSlider, 'input', debouncedSaveState, 'volumeSlider'); // On 'input' (more frequent)
// Call saveCurrentStateToLocalStorage() after stopping recording, toggling reverse, etc.
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Cleanup on Tab Close:

Add an event listener for beforeunload to remove this tab's state from localStorage.

// In main.js
window.addEventListener('beforeunload', () => {
    try {
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${currentTabId}`;
        localStorage.removeItem(key);
        console.log(`Cleaned up state for tab ${currentTabId}`);
    } catch (error) {
        console.error("Error removing state on unload:", error);
    }
    // Note: Complex operations might not complete reliably here. Removal is best effort.
});
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Phase 2: Implementing "Save All Tabs"

Add "Save All Tabs" Button:

Place this button logically in the UI (e.g., near MIDI recorder controls or in a new "Session" section).

Ensure createElement and listener attachment happens in layoutBuilder.js or main.js.

// Example in controlsColumn.js or main.js setup
const saveAllButton = createElement('button', { id: 'save-all-tabs-btn', textContent: 'Save All Tabs' });
// Append it to an appropriate container
// Add listener in main.js setupEventListeners
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Implement Save All Logic:

When the button is clicked, the current tab (the initiator) performs these actions:

Iterate through all keys in localStorage.

Collect all values whose keys start with LOCAL_STORAGE_KEY_PREFIX.

Parse each valid JSON string found.

(Optional but Recommended): Filter out potentially stale entries (e.g., based on the timestamp if a tab crashed without cleaning up).

Create an aggregated object:

{
    formatVersion: "multi-tab-session-1.0", // Add a version
    savedAt: Date.now(),
    tabs: [ /* array of individual tab state objects collected */ ]
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Trigger a download of this aggregated object as a JSON file.

// In main.js (event listener for the button)
function handleSaveAllTabs() {
    console.log("Initiating Save All Tabs...");
    const allTabStates = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
                const stateString = localStorage.getItem(key);
                if (stateString) {
                    try {
                        const state = JSON.parse(stateString);
                        // Optional: Add staleness check based on state.timestamp
                        allTabStates.push(state);
                    } catch (parseError) {
                        console.warn(`Could not parse state from localStorage key ${key}:`, parseError);
                    }
                }
            }
        }

        if (allTabStates.length === 0) {
            alert("No active Audional tabs found to save.");
            return;
        }

        const sessionData = {
            formatVersion: "multi-tab-session-1.0",
            savedAt: Date.now(),
            tabs: allTabStates
        };

        const jsonData = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = createElement('a', {
            href: url,
            download: `audional_session_${Date.now()}.json`
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Saved session with ${allTabStates.length} tabs.`);

    } catch (error) {
        console.error("Error during Save All Tabs:", error);
        alert("Failed to save session. See console for details.");
    }
}

// In setupEventListeners
// addListener(saveAllButton, 'click', handleSaveAllTabs, 'saveAllButton');
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Phase 3: Implementing "Load Session"

Add "Load Session" Button:

Place near the "Save All Tabs" button.

Add an <input type="file"> element (can be hidden and triggered by the button click) to select the session JSON file.

// Example in controlsColumn.js or main.js setup
const loadSessionButton = createElement('button', { id: 'load-session-btn', textContent: 'Load Session' });
const loadSessionInput = createElement('input', { type: 'file', accept: '.json,application/json', style: 'display: none;', id: 'load-session-input' });
// Append buttons/input
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

Implement Load Logic:

Attach a listener to the loadSessionButton that clicks the hidden loadSessionInput.

Attach a change listener to loadSessionInput.

When a file is selected:

Read the file content using FileReader.

Parse the JSON content.

Validate the formatVersion and the structure (check for tabs array).

Crucially: Decide how to handle the restoration:

The first state object (sessionData.tabs[0]) should be applied to the current tab.

For every subsequent state object (sessionData.tabs[1], [2], etc.), the current tab needs to open a new browser tab.

Applying State to Current Tab:

Create an applyAppState(state) function in main.js.

This function takes a state object and sets the sliders, toggles reverse, loads MIDI data into the recorder, selects the MIDI device, and importantly, re-initializes the audio processor if the audioSourceInfo differs from the current one (or potentially always re-initialize to be safe). This might involve modifying audioProcessor.init to accept initial state parameters.

After applying the state, call saveCurrentStateToLocalStorage() to register this tab with its newly restored state and its existing currentTabId.

Opening and Initializing New Tabs (The Tricky Part):

For sessionData.tabs[1] onwards:

Store Temporary State: Before opening the new tab, store the specific state object intended for it in localStorage using a temporary, predictable key based on the original tabId from the file (e.g., audional_restore_pending_${state.tabId}).

Open New Tab: Use window.open('index.html?restoreTabId=' + state.tabId). Pass the original tab ID as a query parameter. Note: This might be blocked by popup blockers. Inform the user they may need to allow popups.

The window.open call returns a reference to the new window, but interacting with it directly across origins or complex scenarios can be difficult. Relying on localStorage and the query parameter is generally more reliable.

In the initializeApp function (main.js):

At the very beginning, check window.location.search for the restoreTabId parameter.

If found:

Read the restoreTabId value.

Construct the temporary storage key (e.g., audional_restore_pending_${restoreTabId}).

Read the state object from localStorage using that key.

Crucially: Remove the temporary key from localStorage immediately after reading it to prevent accidental re-use.

Call applyAppState(loadedState) to configure this new tab.

Proceed with the rest of initialization.

If not found, proceed with normal initialization (generating a new tabId, etc.).

// --- In main.js ---

// Modify initializeApp start
async function initializeApp() {
    console.log("Initializing application...");
    currentTabId = crypto.randomUUID(); // Generate ID early

    // --- Check for restore state ---
    const urlParams = new URLSearchParams(window.location.search);
    const restoreId = urlParams.get('restoreTabId');
    let initialStateFromLoad = null;

    if (restoreId) {
        console.log(`Attempting to restore state for original tab ID: ${restoreId}`);
        const restoreKey = `audional_restore_pending_${restoreId}`;
        try {
            const stateString = localStorage.getItem(restoreKey);
            if (stateString) {
                initialStateFromLoad = JSON.parse(stateString);
                localStorage.removeItem(restoreKey); // IMPORTANT: Clean up!
                console.log(`Successfully retrieved restore state for ${restoreId}`);
                // Override the randomly generated tabId with the one from the loaded state
                // NO - keep the NEW unique ID for this browser tab instance.
                // The restoreId was just for lookup.
            } else {
                 console.warn(`Restore ID ${restoreId} found in URL, but no state found in localStorage key ${restoreKey}.`);
            }
        } catch (error) {
            console.error(`Error retrieving or parsing restore state for ${restoreId}:`, error);
        }
    }
    // --- End Check for restore state ---

    // ... (Find elements, init UI) ...

    if (initialStateFromLoad) {
        console.log("Applying loaded initial state...");
        // Apply the state BEFORE initializing audio/MIDI etc.
        // This might require passing parts of initialStateFromLoad to subsequent init functions
        // OR calling applyAppState later after basic init is done.
        // Let's aim for calling applyAppState later for simplicity.
    }

    // ... (Validate data - use default or from initialStateFromLoad if available) ...
    // ... (Determine initial slider values - use default or from initialStateFromLoad) ...

    // ... (Init MIDI Handler) ...
    // ... (Init Audio Processor - potentially pass audioSourceInfo from initialStateFromLoad) ...
    // ... (Init MIDI Recorder) ...
    // ... (Init Reference Panel) ...
    // ... (Init Keyboard Shortcuts) ...
    // ... (Setup Event Listeners) ...

    // --- Apply full state if loaded ---
    if (initialStateFromLoad) {
         await applyAppState(initialStateFromLoad); // Make applyAppState async if needed
         console.log("Finished applying loaded state.");
    } else {
         // Set Initial UI Display Values & Enable Controls (for a fresh tab)
         console.log("Setting default initial UI values for new tab.");
         // ... (set initial UI from defaults/sliders) ...
         ui.enableControls();
         saveCurrentStateToLocalStorage(); // Save initial state for a new tab
    }

    console.log(`Application initialized successfully for tab ID: ${currentTabId}.`);
}


// --- Add applyAppState function ---
async function applyAppState(state) {
    if (!state) return;
    console.log(`Applying state for original tab ID ${state.tabId} to current tab ${currentTabId}`);

    // 1. Restore Audio Source (Requires careful handling in audio.init or a separate function)
    //    You might need to re-initialize audioProcessor if sources differ.
    //    This example assumes audioProcessor can handle new data or is re-initialized.
    //    If re-initializing:
    //    const audioReady = await audio.init(state.audioSourceInfo.audioOpus, state.audioSettings.tempo, state.audioSettings.pitch);
    //    if (!audioReady) { throw new Error("Failed to re-initialize audio for loaded state"); }
    //    ui.setImageSource(validateAndFormatDataSource(state.audioSourceInfo.image, 'data:image/jpeg;base64,', 'image')); // Update image too

    // 2. Restore Settings
    audio.setTempo(state.audioSettings.tempo);
    audio.setGlobalPitch(state.audioSettings.pitch);
    audio.setVolume(state.audioSettings.volume);
    audio.setScheduleMultiplier(state.audioSettings.multiplier);
    if (audio.getReverseState() !== state.audioSettings.isReversed) {
       audio.toggleReverse(); // Toggle if needed
    }

    // 3. Restore MIDI Recording
    if (midiRecorder.setRecordingData) {
        midiRecorder.setRecordingData(state.midiRecording || []);
    }

    // 4. Restore MIDI Device Selection
    if (midiHandler.selectDevice && state.selectedMidiDevice) {
       // Give MIDI handler time to populate devices after init
       await new Promise(resolve => setTimeout(resolve, 500)); // Small delay, might need adjustment
       midiHandler.selectDevice(state.selectedMidiDevice);
    }

    // 5. Update UI to reflect restored state
    ui.updateTempoDisplay(state.audioSettings.tempo);
    if(tempoSlider) tempoSlider.value = state.audioSettings.tempo; // Update slider visuals too
    ui.updatePitchDisplay(state.audioSettings.pitch);
     if(pitchSlider) pitchSlider.value = state.audioSettings.pitch;
    ui.updateVolumeDisplay(state.audioSettings.volume);
     if(volumeSlider) volumeSlider.value = state.audioSettings.volume;
    ui.updateScheduleMultiplierDisplay(state.audioSettings.multiplier);
     if(multiplierSlider) multiplierSlider.value = state.audioSettings.multiplier;
    ui.updateReverseButton(state.audioSettings.isReversed);
    ui.updateLoopButton(audio.getLoopingState()); // Loop state isn't saved, reset to off typically
    // Restore UI visibility if saved in state.uiState
    // midiRecorder.updateUI() // Update recorder UI state

    ui.enableControls(); // Ensure controls are enabled

    // 6. Save the newly applied state under the *current* tab's ID
    saveCurrentStateToLocalStorage();
}


// --- Add listener for Load Session Button / Input ---
function handleLoadSessionFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => { // Make async to await applyAppState
        try {
            const content = e.target.result;
            const sessionData = JSON.parse(content);

            // --- Validation ---
            if (!sessionData || typeof sessionData !== 'object' || !Array.isArray(sessionData.tabs)) {
                throw new Error("Invalid session file format.");
            }
            if (sessionData.formatVersion !== "multi-tab-session-1.0") {
                 console.warn("Loading session file with potentially incompatible version:", sessionData.formatVersion);
            }
            if (sessionData.tabs.length === 0) {
                 alert("Session file contains no tab data to load.");
                 return;
            }

            console.log(`Loaded session file with ${sessionData.tabs.length} tabs.`);

            // --- Apply state to THIS tab (first tab data) ---
            const firstTabState = sessionData.tabs[0];
            await applyAppState(firstTabState); // Wait for the first tab to apply its state

            // --- Open new tabs for the rest ---
            if (sessionData.tabs.length > 1) {
                 alert(`This session contains ${sessionData.tabs.length} tabs. Allow popups if prompted to restore all tabs.`);
                for (let i = 1; i < sessionData.tabs.length; i++) {
                    const tabState = sessionData.tabs[i];
                    const restoreKey = `audional_restore_pending_${tabState.tabId}`;
                    try {
                        localStorage.setItem(restoreKey, JSON.stringify(tabState));
                        const newWindow = window.open('index.html?restoreTabId=' + tabState.tabId);
                        if (!newWindow) {
                            console.error(`Failed to open new tab for restore ID ${tabState.tabId}. Popup blocker?`);
                            localStorage.removeItem(restoreKey); // Clean up if open failed
                            alert(`Could not open a new tab for restoration (ID: ${tabState.tabId}). Please check your popup blocker settings.`);
                            // Optionally break, or continue trying others?
                        } else {
                             console.log(`Opened new tab, attempting restore for original ID: ${tabState.tabId}`);
                        }
                    } catch (storageError) {
                         console.error(`Error storing temporary restore state for ${tabState.tabId}:`, storageError);
                         alert(`Error preparing state for tab restore (ID: ${tabState.tabId}). Session load incomplete.`);
                    }
                     // Small delay between opening tabs might help prevent issues
                     await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            alert("Session loaded successfully.");

        } catch (error) {
            console.error("Error loading or processing session file:", error);
            alert(`Error loading session: ${error.message}`);
        } finally {
            // Reset file input value so the same file can be loaded again if needed
             event.target.value = null;
        }
    };
    reader.onerror = (e) => {
         console.error("Error reading session file:", e);
         alert("Error reading the selected file.");
         event.target.value = null;
    };
    reader.readAsText(file);
}

// In setupEventListeners:
// addListener(loadSessionButton, 'click', () => loadSessionInput.click(), 'loadSessionButton');
// addListener(loadSessionInput, 'change', handleLoadSessionFile, 'loadSessionInput');
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

UI Considerations & Potential Issues:

Popup Blockers: The biggest hurdle. Users must be informed they need to allow popups from your site for multi-tab restoration to work.

localStorage Limits: localStorage typically has a limit (around 5-10MB). If MIDI recordings or base64 audio data are very large, you could exceed this, especially with many tabs open. Consider storing large data blobs elsewhere or optimizing storage.

Stale State: The beforeunload cleanup isn't 100% guaranteed (e.g., browser crash). The timestamp check during "Save All" helps mitigate saving crashed tabs, but isn't perfect.

User Experience: Clearly explain what "Save All Tabs" and "Load Session" do. The multi-tab opening can be surprising if unexpected.

Race Conditions: Be mindful of timing issues, especially when setting/removing the temporary restore keys in localStorage during the loading process.

Performance: Writing to localStorage frequently (even debounced) can have a minor performance impact. Reading all localStorage keys during "Save All" is generally fast unless there are thousands of unrelated keys.

This detailed approach provides a robust way to implement the multi-tab save/load feature using standard browser capabilities. Remember to test thoroughly, especially the tab opening and state restoration logic across different browsers.