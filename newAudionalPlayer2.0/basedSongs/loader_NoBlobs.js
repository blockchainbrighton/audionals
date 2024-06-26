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

// Function to initialize the application
function initializeApp() {
    window.cci2 = 0;
    window.initialCCI2 = 0;
    resetAllStates();
    loadJsonFromUrl(window.jsonDataUrl);


    const jsonData = JSON.parse(localStorage.getItem('jsonData'));
    if (jsonData) {
        window.settings = jsonData;
        // console.log("[debug] Settings loaded from localStorage:", jsonData);
        
        // console.log("[debug] Project Name:", jsonData.projectName);
        // console.log("[debug] Artist Name:", jsonData.artistName);
        // console.log("[debug] Project BPM:", jsonData.projectBPM);
        // console.log("[debug] Current Sequence:", jsonData.currentSequence);
        // console.log("[debug] Channel URLs:", jsonData.channelURLs);
        // console.log("[debug] Project Sequences:", jsonData.projectSequences);

        if (jsonData.projectSequences && Object.keys(jsonData.projectSequences).length > 0) {
            console.log('[debug] Sequence data is ready:', jsonData.projectSequences);
            initializeWorker();
        } else {
            console.error('[debug] Sequence data is not ready or empty. Data found:', jsonData.projectSequences);
        }
    } else {
        console.error('[debug] Error: JSON data not found in localStorage.');
    }
}

// Set up the body style for the canvas
document.body.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
`;

// Fetch settings and then load scripts if not found in localStorage
const jsonData = localStorage.getItem('jsonData');
if (jsonData) {
    console.log("[debug] JSON data found in localStorage:", JSON.parse(jsonData));
    loadScriptsSequentially(window.scriptsToLoad, 0, async () => {
        await ensureAudioContextState();
        if (document.readyState === 'loading') {
            document.addEventListener("DOMContentLoaded", initializeApp);
        } else {
            initializeApp();
        }
    });
} else {
    fetch(window.jsonDataUrl)
        .then(response => response.json())
        .then(data => {
            window.settings = data;
            // console.log("[debug] Settings loaded from URL:", data);

            // console.log("[debug] Project Name:", data.projectName);
            // console.log("[debug] Artist Name:", data.artistName);
            // console.log("[debug] Project BPM:", data.projectBPM);
            // console.log("[debug] Current Sequence:", data.currentSequence);
            // console.log("[debug] Channel URLs:", data.channelURLs);
            // console.log("[debug] Project Sequences:", data.projectSequences);

            localStorage.setItem('jsonData', JSON.stringify(data));
            console.log("[debug] Data stored in localStorage:", JSON.stringify(data));

            loadScriptsSequentially(window.scriptsToLoad, 0, async () => {
                await ensureAudioContextState();
                if (document.readyState === 'loading') {
                    document.addEventListener("DOMContentLoaded", initializeApp);
                } else {
                    initializeApp();
                }
            });
        })
        .catch(error => console.error('[debug] Error loading settings from URL:', error));
}
