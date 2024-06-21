// songLoader.js

// This file is supplied by the user and must contain the URL for the JSON data file to be loaded

// Set the HTML title dynamically (OPTIONAL)
document.title = "TRUTH";

// *** THIS IS THE URL TO THE AUDX SONGFILE ***
// Store JSON data URL in a global variable ()
window.jsonDataUrl = "testSongFiles/TRUTH_AUDX_17.json";

// Dynamically load the loader.js script after setting up the environment
const script = document.createElement('script');
script.src = 'scriptLoader.js';
document.head.appendChild(script);


window.titleConfig = {
    displayText_1: "TRUTH",
    displayText_2: "",
    displayText_3: "melophonic",
    displayText_4: "and",
    displayText_5: "SQYZY",
    displayText_6: "",
    displayText_7: "",
    displayText_8: "",
    displayText_9: "",
    displayText_10: "",

    showTextTime: {
        displayText_1: 0, // TRUTH
        displayText_2: 14000, // by
        displayText_3: 16000, // melophonic
        displayText_4: 30000, // and
        displayText_5: 31000 // SQYZY
    },
    hideTextTime: {
        displayText_1: 13500, // TRUTH
        displayText_2: 15500, // by
        displayText_3: 29500, // melophonic
        displayText_4: 31500, // and
        displayText_5: 48500  // SQYZY
    },
    fadeInDuration: {
        displayText_1: 32000, // TRUTH
        displayText_2: 0,     // by
        displayText_3: 0,  // melophonic
        displayText_4: 0,     // and
        displayText_5: 32000   // SQYZY
    },
    fadeOutDuration: {
        displayText_1: 32000, // TRUTH
        displayText_2: 0, // by
        displayText_3: 1000, // melophonic
        displayText_4: 0, // and
        displayText_5: 7500  // SQYZY
    },
    colors: {
        displayText_1: "#000000",
        displayText_2: "#000000",
        displayText_3: "#000000",
        displayText_4: "#000000",
        displayText_5: "#000000"
    },
    fontSizes: {
        displayText_1: "121px", // TRUTH
        displayText_2: "32px", // by
        displayText_3: "64px", // melophonic
        displayText_4: "32px", // and
        displayText_5: "121px" // SQYZY
    },
    fontStyles: {
        displayText_1: "bold",
        displayText_2: "bold",
        displayText_3: "bold",
        displayText_4: "bold",
        displayText_5: "bold"
    },
    fontTypes: {
        displayText_1: "Impact, charcoal, sans-serif",
        displayText_2: "Impact, charcoal, sans-serif",
        displayText_3: "Impact, charcoal, sans-serif",
        displayText_4: "Impact, charcoal, sans-serif",
        displayText_5: "Impact, charcoal, sans-serif"
    },
    // Centralized position configuration
    centralPosition: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        transformOrigin: "center center"
    }
};

