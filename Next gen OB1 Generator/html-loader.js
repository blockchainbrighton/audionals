// js/html-loader.js

// Define the HTML structure as a template literal string
const htmlContent = `
   <!-- Dynamically Loaded HTML Elements -->
   <img id="clickableImage" alt="Clickable Image Area" src=""> <!-- src left empty, will be set by JS -->
   <audio id="clickSoundPlayer" preload="metadata">
       <!-- This element is not directly used for playback anymore -->
       Your browser does not support the audio element.
   </audio>

   <!-- Updated Controls Section -->
   <div class="controls" id="controls-container"> <!-- Added ID here -->
        <div class="control-group">
            <button id="playOnceButton">Play Once</button>
            <button id="loopToggle">Play Loop: Off</button>
            <button id="reverseButton" title="Toggle Reverse Playback">Reverse: Off</button>
        </div>

        <div class="control-group">
           <label for="tempoSlider">Tempo:</label>
           <input type="range" id="tempoSlider" min="1" max="400" step="1" value="76">
           <span id="bpmValue">76 BPM</span> <!-- Use this ID -->
       </div>

       <div class="control-group">
           <label for="pitchSlider">Pitch/Speed:</label>
           <input type="range" id="pitchSlider" min="0.01" max="10.0" step="0.01" value="1.0">
           <span id="pitchValue">100%</span> <!-- Use this ID -->
       </div>

       <div class="control-group">
           <label for="volumeSlider">Volume:</label>
           <input type="range" id="volumeSlider" min="0" max="1.5" step="0.01" value="1.0">
           <span id="volumeValue">100%</span> <!-- Use this ID -->
       </div>

       <!-- Explicit placeholder for error messages -->
       <div id="error-message-container" style="width: 100%; min-height: 1.5em;"></div>

   </div>
   <!-- End Dynamically Loaded HTML Elements -->
`;

// --- Injection Logic (Keep as is) ---
if (document.body) {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
} else {
    console.warn("html-loader.js: document.body not found immediately. Waiting for DOMContentLoaded.");
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
            document.body.insertAdjacentHTML('beforeend', htmlContent);
        } else {
            console.error("html-loader.js: document.body still not found after DOMContentLoaded. HTML injection failed.");
        }
    });
}
// --- End Injection Logic ---

// Note: No need for explicit promises or custom events here because
// the standard script loading order handles the synchronization.
// The browser parses and executes <script src="js/html-loader.js"></script>
// *completely* before it moves on to parse and execute
// <script type="module" src="js/main.js"></script>.