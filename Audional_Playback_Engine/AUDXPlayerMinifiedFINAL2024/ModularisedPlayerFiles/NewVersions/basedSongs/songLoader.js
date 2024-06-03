// Set the HTML title dynamically
document.title = "OB1 Song 1 by melophonic : Visuals by SQYZY";

// Define the AUDX song file being loaded (jsonDataUrl) globally (Random seed is defined in the HTML document)
// window.jsonDataUrl = "https://ordinals.com/content/f19abf0decb3741ee8fb5afc4a5639fdb2e47ee26f0db7725ffa1668c980c13fi0";
// window.jsonDataUrl = "testSongFiles/BittyMcBitFaceFullSeq_AUDX.json";
// window.jsonDataUrl = "testSongFiles/FInal_-_MetrOBoomin_1_AUDX.json";
// window.jsonDataUrl = "testSongFiles/voteForMe.json";
// window.jsonDataUrl = "testSongFiles/Mo_Aussies_Mo_Problems_AUDX_9.json";
// window.jsonDataUrl = "testSongFiles/Fuck_The_Bear_-_Based_AUDX_5.json";
// window.jsonDataUrl = "testSongFiles/How_We_Be_-_Based_AUDX_16.json";
// window.jsonDataUrl = "testSongFiles/crashTest.json";
// window.jsonDataUrl = "testSongFiles/voteForMe_short.json";
window.jsonDataUrl = "testSongFiles/voteForMeShort2.json";



window.cci2 = 0; 
window.initialCCI2 = 0;
// Create and append the canvas element to the body
var canvas = document.createElement('canvas');
canvas.id = 'cv';
document.body.appendChild(canvas);

// Adjust the body's style to ensure proper display of the canvas
document.body.style.display = 'flex';
document.body.style.justifyContent = 'center';
document.body.style.alignItems = 'center';
document.body.style.height = '100vh';
document.body.style.margin = '0'; // Ensures the body takes up the full viewport height without default margins

// Dynamically load the loader.js script after setting up the environment
var script = document.createElement('script');
script.src = 'loader.js';
document.head.appendChild(script);
