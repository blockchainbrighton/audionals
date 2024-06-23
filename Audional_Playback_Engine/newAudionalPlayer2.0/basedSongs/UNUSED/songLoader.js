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


// songLoader.js

// Set the title configuration (OPTIONAL)
window.titleConfig = {
    projectName: "TRUTH",
    artistName: "melophonic",
    visualArtistName: "SQYZY",
    triggerTimes: {
        projectName: "100:00:00", // Example: 1 minute, 0 seconds, 50 hundredths (i.e., 60.5 seconds)
        artistName: "100:00:00",  // Example: 1 minute, 10 seconds, 5 hundredths (i.e., 70.05 seconds)
        visualArtistName: "100:00:00", // Example: 1 minute, 20 seconds, 50 hundredths (i.e., 80.5 seconds)
        by: "100:00:00" // Add a slight delay

    },
    timings: {
        projectNameDuration: 15000, // Duration to display project name
        byDuration: 3000, // Duration to display "by"
        artistNameDuration: 12000, // Duration to display artist name
        visualArtistDuration: 1000, // Duration to display "and"
        visualArtistNameDuration: 36000 // Duration to display visual artist name
    },
    colors: {
        projectNameColor: "#000000", // Color for project name
        byColor: "#000000", // Color for "by"
        artistNameColor: "#000000", // Color for artist name
        visualArtistColor: "#000000", // Color for visual artist
        visualArtistNameColor: "#000000" // Color for visual artist name
    },
    fontSizes: {
        projectNameFontSize: "90px", // Font size for project name
        byFontSize: "48px", // Font size for "by"
        artistNameFontSize: "64px", // Font size for artist name
        visualArtistFontSize: "32px", // Font size for visual artist
        visualArtistNameFontSize: "47px" // Font size for visual artist name
    },
    fontStyles: {
        projectNameFontStyle: "bold", // Font style for project name
        byFontStyle: "normal", // Font style for "by"
        artistNameFontStyle: "bold", // Font style for artist name
        visualArtistFontStyle: "normal", // Font style for visual artist
        visualArtistNameFontStyle: "bold" // Font style for visual artist name
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
