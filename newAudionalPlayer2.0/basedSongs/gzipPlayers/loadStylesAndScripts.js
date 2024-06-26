 // loadStylesAndScripts.js

// Load external stylesheet
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/content/27679fb51975e991284bebdaa2e340ab0f4002ea5423c8849106e4dabbd43627i0';
document.head.appendChild(link);

// Apply inline styles and additional scripts after the stylesheet has loaded
link.onload = function() {
    document.body.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: black;
        position: relative;
    `;

    const container = document.getElementById('canvas-container');
    container.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        position: relative;
    `;

    // Load the additional JavaScript files for pakoLoader and gzipSongFile
    const pakoAndGzipScript = document.createElement('script');
    pakoAndGzipScript.src = '/content/e6eb3fc8c66831d6231979b8925350f4e4306570843e27577337a74dbd6d95e4i0';
    document.body.appendChild(pakoAndGzipScript);
};
