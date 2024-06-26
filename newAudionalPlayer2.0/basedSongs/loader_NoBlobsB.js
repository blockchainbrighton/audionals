// loader_NoBlobs.js

// Create and append the canvas element to the body
const canvas = document.createElement('canvas');
canvas.id = 'cv';
document.body.appendChild(canvas);

// Set up the body style for the canvas
document.body.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
`;


const initializeApp = () => {
    console.log("[debug] Initializing app.");
    window.cci2 = 0;
    window.initialCCI2 = 0;
    resetAllStates();
    loadJsonFromLocalStorage(window.jsonDataUrl);

    const jsonData = JSON.parse(localStorage.getItem('jsonData'));
    if (jsonData) {
        window.settings = jsonData;
        const projectSequences = jsonData.projectSequences;

        if (projectSequences && Object.keys(projectSequences).length > 0) {
            console.log('[debug] Sequence data is ready:', projectSequences);
            initializeWorker();
        } else {
            console.error('[debug] Sequence data is not ready or empty. Data found:', projectSequences);
        }
    } else {
        console.error('[debug] Error: JSON data not found in localStorage.');
    }
};

const handleSettingsAndScripts = async () => {
    console.log("[debug] Handling settings and scripts.");
    await ensureAudioContextState();
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initializeApp);
    } else {
        initializeApp();
    }
};

const jsonData = localStorage.getItem('jsonData');
if (jsonData) {
    console.log("[debug] JSON data found in localStorage:", JSON.parse(jsonData));
    loadScriptsSequentially(window.scriptsToLoad, 0, handleSettingsAndScripts);
} else {
    fetch(window.jsonDataUrl)
        .then(response => response.json())
        .then(data => {
            window.settings = data;
            localStorage.setItem('jsonData', JSON.stringify(data));
            console.log("[debug] Data stored in localStorage:", JSON.stringify(data));

            loadScriptsSequentially(window.scriptsToLoad, 0, handleSettingsAndScripts);
        })
        .catch(error => console.error('[debug] Error loading settings from URL:', error));
}
