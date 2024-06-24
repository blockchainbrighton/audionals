// songLoader.js

// titleConfig.js
src="https://ordinals.com/content/e575d3519ca3d6eb6a8d34e4c969dee9ef72b84766fd3f8f2ed2aeead06a4f66i0"

// *** THIS IS THE URL TO THE AUDX SONGFILE ***
// Store JSON data URL in a global variable ()
window.jsonDataUrl = "testSongFiles/TRUTH_AUDX_17.json";


// TRUMP SONG
// window.jsonDataUrl = "https://ordinals.com/content/23613a61942425c3a55153ae579cfa874459d91608b35da1d835f26bbfa617a3i0";


// Dynamically load the loader.js script after setting up the environment
const script = document.createElement('script');
script.src = 'scriptLoader.js';
document.head.appendChild(script);



