// songLoader.js

// This file is supplied by the user and must contain the URL for the JSON data file to be loaded

// Set the HTML title dynamically (OPTIONAL)
document.title = "TRUTH";

// *** THIS IS THE URL TO THE AUDX SONGFILE ***
// Store JSON data URL in a global variable ()
window.jsonDataUrl = "testSongFiles/TRUTH.json";

// Dynamically load the loader.js script after setting up the environment
const script = document.createElement('script');
script.src = 'scriptLoader.js';
document.head.appendChild(script);



// Set the title configuration (OPTIONAL)
window.titleConfig = {
    projectName: "TRUTH",
    artistName: "melophonic",
    visualArtistName: "SQYZY",
    timings: {
        cooldownTime: 60000,
        projectNameDuration: 12000,
        byDuration: 4000,
        artistNameDuration: 12000,
        visualArtistDuration: 3000,
        visualArtistNameDuration: 30000
    },
    colors: {
        projectNameColor: "#ff0000", // Red
        byColor: "#000000", // Dim Grey
        artistNameColor: "#ff0000", // Red
        visualArtistColor: "#000000", // Dim Grey
        visualArtistNameColor: "#ff0000" // Red
    }
};



// // Set the HTML title dynamically
// document.title = "OB1 Song 1 by melophonic : Visuals by SQYZY";

// // Define the AUDX song file being loaded (jsonDataUrl) globally (Random seed is defined in the HTML document)
// // window.jsonDataUrl = "https://ordinals.com/content/f19abf0decb3741ee8fb5afc4a5639fdb2e47ee26f0db7725ffa1668c980c13fi0";
// // window.jsonDataUrl = "testSongFiles/BittyMcBitFaceFullSeq_AUDX.json";
// // window.jsonDataUrl = "testSongFiles/FInal_-_MetrOBoomin_1_AUDX.json";
// // window.jsonDataUrl = "testSongFiles/voteForMe.json";
// // window.jsonDataUrl = "testSongFiles/Mo_Aussies_Mo_Problems_AUDX_9.json";
// // window.jsonDataUrl = "testSongFiles/Fuck_The_Bear_-_Based_AUDX_5.json";
// // window.jsonDataUrl = "testSongFiles/How_We_Be_-_Based_AUDX_16.json";
// // window.jsonDataUrl = "testSongFiles/crashTest.json";
// // window.jsonDataUrl = "testSongFiles/voteForMe_short.json";
// // window.jsonDataUrl = "testSongFiles/voteForMeShort2.json";
// // window.jsonDataUrl = "testSongFiles/voteForMeShort3.json";
// // window.jsonDataUrl = "testSongFiles/VFM.json";
// // window.jsonDataUrl = "testSongFiles/Spooky_Pitch_AUDX_1.json";
// // window.jsonDataUrl = "testSongFiles/spooky_house.json";
// // window.jsonDataUrl = "testSongFiles/spooky_pitch_3.json";
// window.jsonDataUrl = "testSongFiles/SP1.json";






// window.cci2 = 0; 
// window.initialCCI2 = 0;
// // Create and append the canvas element to the body
// var canvas = document.createElement('canvas');
// canvas.id = 'cv';
// document.body.appendChild(canvas);

// // Adjust the body's style to ensure proper display of the canvas
// document.body.style.display = 'flex';
// document.body.style.justifyContent = 'center';
// document.body.style.alignItems = 'center';
// document.body.style.height = '100vh';
// document.body.style.margin = '0'; // Ensures the body takes up the full viewport height without default margins

// // Dynamically load the loader.js script after setting up the environment
// var script = document.createElement('script');
// script.src = 'loader.js';
// document.head.appendChild(script);
