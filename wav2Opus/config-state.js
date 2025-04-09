// config-state.js

// State variables - these will be accessed and modified globally by other modules
let ffmpeg = null;
let selectedFile = null;
let fileDuration = null;
let convertedAudioBlob = null;
let base64String = null;
let originalAudioUrl = null;
let originalAudioElement = null; // Reference to the <audio> element for the original file

// Initial quality values (could be considered config)
const initialMp3Quality = 4; // Example default, adjust as needed
const initialOpusBitrate = 64; // Example default, adjust as needed


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: conversion-process.js</summary>

**Purpose:** Contains the core logic for handling the audio conversion process when initiated by the user (e.g., clicking the "Convert" button).

**Key Functions:**
*   `runConversion()`: The main asynchronous function orchestrating the conversion workflow.
    1.  Checks prerequisites (FFmpeg loaded, file selected, duration known).
    2.  Disables relevant UI elements.
    3.  Resets previous output UI and state.
    4.  Determines output format and filenames.
    5.  Cleans up old files from FFmpeg's virtual FS.
    6.  Loads the selected file into FFmpeg's memory (`fetchFile`, `FS('writeFile')`).
    7.  Executes the FFmpeg conversion command (`runFFmpegConversion`).
    8.  Creates a Blob from the resulting data (`Uint8Array`).
    9.  Updates the UI with results (download link, audio player).
    10. Initiates the Base64 conversion and display (`setupBase64DisplayAndActions`).
    11. Handles errors throughout the process.
    12. Performs cleanup in the `finally` block (virtual FS, re-enabling UI elements).

**Dependencies:**
*   **Global State Variables:** `ffmpeg`, `selectedFile`, `fileDuration`, `convertedAudioBlob`, `base64String`.
*   **DOM Elements (implicitly global):** `convertBtn`, `playSampleBtn`, `resultEl`, `formatRadios` (for getting selected format).
*   **FFmpeg Handler Functions (implicitly global):** `fetchFile`, `runFFmpegConversion`, `cleanupFFmpegFS`.
*   **Base64 Handler Function (implicitly global):** `setupBase64DisplayAndActions`.
*   **Audio Player Function (implicitly global):** `createAudioPlayer`.
*   **Utility Functions (implicitly global):** `updateStatus`, `resetConversionOutputUI`, `getBaseFilename`, `formatBytes`, `enableConvertButtonIfNeeded`.

**Global Variables:**
*   Manages `convertedAudioBlob` and `base64String` state (setting them on success, clearing on reset/failure).

**Notes:**
*   This file represents the central workflow for the conversion feature.
*   It coordinates actions across multiple other modules (FFmpeg, UI updates, Base64, Audio Player).
*   Includes important state management during the asynchronous conversion process (e.g., disabling buttons).
*   Handles Blob creation from FFmpeg output and subsequent processing.
*   Relies heavily on the global scope for accessing functions and state from other files.
</details>
-->
*/