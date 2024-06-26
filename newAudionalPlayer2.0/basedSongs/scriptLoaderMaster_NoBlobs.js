// scriptLoaderMaster.js

function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
        console.log(`[debug] Loaded script: ${src}`);
        callback();
    };
    script.onerror = () => console.error(`[debug] Error loading script: ${src}`);
    document.head.appendChild(script);
}

function loadScriptsInOrder(scripts, finalCallback) {
    const loadNextScript = (index) => {
        if (index >= scripts.length) {
            finalCallback();
            return;
        }
        loadScript(scripts[index], () => loadNextScript(index + 1));
    };
    loadNextScript(0);
}

// Load the arrays and initialization script first, then initialize the rest
loadScript('scriptArraysAndInitialization.js', () => {
    if (typeof initializeScripts === 'function') {
        initializeScripts();
    } else {
        console.error('[debug] Error: initializeScripts function is not defined.');
    }
});
