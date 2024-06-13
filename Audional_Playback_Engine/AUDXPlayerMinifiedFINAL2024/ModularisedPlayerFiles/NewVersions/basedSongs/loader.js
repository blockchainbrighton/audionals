// loader.js

// Function to dynamically load scripts in order
function loadScriptsSequentially(scripts, index = 0, callback) {
    if (index < scripts.length) {
        const script = document.createElement('script');
        script.src = scripts[index];
        script.onload = () => loadScriptsSequentially(scripts, index + 1, callback); // Load next script once the current one is done
        document.head.appendChild(script);
    } else if (typeof callback === "function") {
        // All scripts are loaded; call the callback function
        callback();
    }
}

// Define the scripts to be loaded
const scriptsToLoad = [
    'audioContextManager.js',
    'jsonLoader.js',
    'audioProcessing.js',
    'fileAndAudioHandling.js',
    'colourSettingsFiles/colourSettingsLevel1.js',
    'colourSettingsFiles/colourSettingsLevel2.js',
    'colourSettingsFiles/colourSettingsLevel3.js',
    'visualiser/visualiserCode.js',
    'visualiser/titleDisplays.js'
];

// Function to ensure AudioContext is in a running state
function ensureAudioContextState() {
    return new Promise((resolve) => {
        if (window.audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().then(() => {
                console.log("AudioContext resumed");
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Initialize the application
function initializeApp() {
    resetAllStates();
    loadJsonFromUrl(window.jsonDataUrl);
    initializeWorker();
}

// Load settings and then scripts
fetch('testSongFiles/SP1.json')
    .then(response => response.json())
    .then(data => {
        window.settings = data; // Assign to global variable
        console.log("Settings loaded:", data);

        // After settings are loaded, load the rest of the scripts
        loadScriptsSequentially(scriptsToLoad, 0, async () => {
            await ensureAudioContextState();
            if (document.readyState === 'loading') {
                document.addEventListener("DOMContentLoaded", initializeApp);
            } else {
                initializeApp();
            }
        });
    })
    .catch(error => console.error('Error loading settings:', error));
