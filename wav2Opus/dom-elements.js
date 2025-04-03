// dom-elements.js

// Get references to DOM elements - these will be used globally by other modules
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const convertBtn = document.getElementById('convertBtn');
const fileInput = document.getElementById('fileInput');
const resultEl = document.getElementById('result');
const formatRadios = document.querySelectorAll('input[name="format"]');
const mp3SettingsDiv = document.getElementById('mp3Settings');
const opusSettingsDiv = document.getElementById('opusSettings');
const mp3QualitySlider = document.getElementById('mp3Quality');
const mp3QualityValueSpan = document.getElementById('mp3QualityValue');
const opusBitrateSlider = document.getElementById('opusBitrate');
const opusBitrateValueSpan = document.getElementById('opusBitrateValue');
const estSizeMp3Span = document.getElementById('estSizeMp3');
const estSizeOpusSpan = document.getElementById('estSizeOpus');
const base64Container = document.getElementById('base64Container');
const base64Result = document.getElementById('base64Result');
const base64Output = document.getElementById('base64Output');
const copyBase64Btn = document.getElementById('copyBase64Btn');
const downloadBase64Btn = document.getElementById('downloadBase64Btn');
const playSampleBtn = document.getElementById('playSampleBtn');
const originalAudioContainer = document.getElementById('originalAudioContainer');



// --- Elements for Audio Format Info ---
const showInfoBtn = document.getElementById('showInfoBtn');
const audioInfoContainer = document.getElementById('audioInfoContainer');
const audioInfoContent = document.getElementById('audioInfoContent');
const closeInfoBtn = document.querySelector('#audioInfoContainer .close-info-btn');



/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: dom-elements.js</summary>

**Purpose:** Centralizes the selection of frequently used DOM elements by their IDs or selectors.

**Key Contents:**
*   A series of `const` declarations, each holding a reference to a specific HTML element (e.g., `statusEl`, `convertBtn`, `fileInput`, `mp3QualitySlider`, `base64Output`, etc.).

**Dependencies:**
*   The HTML structure of the page. Assumes elements with the specified IDs exist.

**Global Variables:**
*   All the `const` variables declared here are implicitly global (available to other scripts loaded afterwards) because no module system (like ES Modules) is used for encapsulation.

**Notes:**
*   This approach simplifies element access in other modules but relies heavily on the global scope and specific HTML IDs.
*   Any changes to the HTML IDs require updating this file.
*   Acts as a single source of truth for DOM element references.
</details>
-->
*/