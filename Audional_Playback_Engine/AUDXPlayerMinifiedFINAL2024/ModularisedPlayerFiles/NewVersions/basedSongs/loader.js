// loader.js

// Create and append the canvas element to the body
const canvas = document.createElement('canvas');
canvas.id = 'cv';
document.body.appendChild(canvas);

// Function to dynamically load scripts sequentially
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
    'colourSettingsFiles/colourPaletteINDEX.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2.js',
    'colourSettingsFiles/colourSettingsLevel3.js',
    'visualiser/visualiserCode.js',

    // TITLES SCRIPTS (OPTIONAL)
    'visualiser/userTitlesConfig.js',
    'visualiser/titleDisplays.js'
    // 'visualiser/titleDisplayCore.js',
    // 'visualiser/titleDisplayUser.js',
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

// Function to initialize the application
function initializeApp() {
    window.cci2 = 0;
    window.initialCCI2 = 0;
    resetAllStates();
    loadJsonFromUrl(window.jsonDataUrl);
    initializeWorker();
}

// Set up the body style for the canvas
document.body.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
`;

// Fetch settings and then load scripts
fetch(window.jsonDataUrl)
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
