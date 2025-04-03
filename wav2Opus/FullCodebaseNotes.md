<!-- FullCodebaseNotes.md -->
Consolidated File Summaries
This document provides a collected overview of the purpose, key functions, dependencies, and notes for each JavaScript file and configuration file within the project, based on the individual file summaries generated previously.
File: audio-formats-explained.js
Purpose: Provides static, structured informational text content (as HTML strings) used for display within the application's UI.
Key Contents:
audioFormatInfo: A single global JavaScript object containing usageInstructions, concepts (losslessVsLossy, bitrate), format details (wav, mp3, opus), and opusRecommendations.
Dependencies: None (provides data). Relied upon by event-listeners.js.
Global Variables: audioFormatInfo (implicitly global).
Notes: Contains pre-formatted HTML. Serves as a central repository for help text.
File: audio-player.js
Purpose: Handles the creation and management of HTML5 audio player elements within the UI, both for the original WAV and the converted audio.
Key Functions: createAudioPlayer(blob, mimeType, label), setupOriginalAudioPlayer(), handlePlayOriginalClick().
Dependencies: DOM Elements (implicitly global: selectedFile, originalAudioContainer, playSampleBtn), Global State Variables (selectedFile, originalAudioElement, originalAudioUrl), Utility Functions (updateStatus).
Global Variables: Manages originalAudioElement and originalAudioUrl.
Notes: Uses URL.createObjectURL(). Includes logic for Blob URL cleanup. Provides a reusable function (createAudioPlayer).
File: base64-handler.js (Refactored)
Purpose: Handles the conversion of audio Blobs into Base64 encoded strings and manages the UI section for displaying, copying, and downloading this Base64 data.
Key Functions: convertBlobToBase64(blob) (now calls utility), setupBase64DisplayAndActions(audioBlob, outputFormat, originalNameBase) (orchestrates UI, copy, download via utility, player creation, dispatches audioBase64Generated event).
Dependencies: DOM Elements (implicitly global), Utility Functions (updateStatus, formatBytes, fileOrBlobToPureBase64, triggerDownload), Audio Player Function (createAudioPlayer).
Global Variables: Dispatches an event instead of setting a global base64String.
Notes: Core conversion and download logic delegated to utils.js. Event-driven for OB1 generator. Relies heavily on globally available functions and DOM elements.
File: config-state.js
Purpose: Declares and potentially initializes global state variables used across multiple modules. Holds some initial configuration values.
Key Contents: State Variables (ffmpeg, selectedFile, etc.), Initial Config (initialMp3Quality, initialOpusBitrate).
Dependencies: None (defines variables for others).
Global Variables: All declared variables are implicitly global.
Notes: Central repository for application state. Global scope approach makes state management potentially fragile.
File: conversion-process.js (Refactored)
Purpose: Contains the core logic for handling the audio conversion process initiated by the user.
Key Functions: runConversion(): Orchestrates the conversion workflow (checks, UI disable, reset, FS cleanup, load file, run FFmpeg, process Blob, display results (visible link + player), initiate Base64, error handling, cleanup, UI re-enable).
Dependencies: Global State Variables, DOM Elements, FFmpeg Handler Functions, Base64 Handler Function, Audio Player Function, Utility Functions (getBaseFilename, window.formatBytes), UI Helper Functions (updateStatus, resetConversionOutputUI, enableConvertButtonIfNeeded).
Global Variables: Manages convertedAudioBlob state.
Notes: Central workflow for conversion. Coordinates modules. Maintains visible download link (doesn't use triggerDownload utility for this element). Relies on resetConversionOutputUI and finally block for cleanup/state restoration.
File: cors-config.json
Purpose: Provides configuration for setting specific CORS-related HTTP headers (COOP, COEP) for a deployment platform.
Key Contents: Sets Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp.
Dependencies: Deployment platform's build/runtime environment (e.g., Vercel).
Global Variables: N/A (config file).
Notes: Essential for cross-origin isolation required by SharedArrayBuffer, which FFmpeg often needs.
File: dom-elements.js
Purpose: Centralizes the selection of frequently used DOM elements by their IDs or selectors.
Key Contents: A series of const declarations referencing HTML elements.
Dependencies: The HTML structure of the page.
Global Variables: All const variables declared are implicitly global.
Notes: Simplifies element access but relies on global scope and specific IDs. Single source of truth for DOM refs.
File: event-listeners.js
Purpose: Sets up all necessary event listeners for user interactions and initializes the default UI state.
Key Functions: safeAddListener(), setupEventListeners(), initializeUIState().
Dependencies: DOM Elements, Handler Functions (from other modules), Static Data (audioFormatInfo).
Global Variables: None created directly.
Notes: Connects UI actions to logic. Includes UI initialization. Handles info modal display logic.
File: ffmpeg-handler.js
Purpose: Manages interaction with ffmpeg.js library (loading core, running commands, virtual FS handling).
Key Functions: loadFFmpeg(), runFFmpegConversion(), cleanupFFmpegFS().
Dependencies: External FFmpeg library, DOM Elements (progressEl, sliders), Utility Functions (updateStatus, updateProgress, etc.).
Global Variables: ffmpeg (holds the FFmpeg instance).
Notes: Handles async nature of FFmpeg. Interacts with virtual FS. Builds commands based on settings. Includes progress reporting.
File: file-handler.js
Purpose: Handles user file selection, WAV validation, and audio duration extraction using Web Audio API. Manages selected file state.
Key Functions: getWavDuration(file), handleFileChange(e).
Dependencies: DOM Elements, Utility Functions, Audio Player Function, Web Platform APIs (FileReader, AudioContext).
Global Variables: Manages selectedFile and fileDuration.
Notes: Uses Web Audio API for duration (can fail). Performs input validation. Responsible for state reset on new file selection.
File: image-base64-handler.js (DEPRECATED)
Purpose: Previously provided utility functions for image to Base64 conversion.
Status: DEPRECATED / REMOVED.
Reason: Functionality is fully covered by image-to-base64.js.
File: image-to-base64.js (Refactored)
Purpose: Handles the UI and logic for selecting an image, converting to Base64, previewing, downloading Base64 text, and integrating with OB1 generator (sends PURE Base64).
Key Functions: imageToBase64(imageFile) (calls utility, updates OB1 state, resolves with full Data URI), initializeImageConverter() (sets up UI listeners/flow).
Dependencies: DOM Elements (by ID), Global Functions (window.formatBytes, window.fileOrBlobToPureBase64, window.triggerDownload, window.updateImageBase64, window.getBaseFilename), Web APIs, ES Module Syntax.
Global Variables: Exports functions via ES Modules. Relies on/calls window globals.
Notes: Sole handler for image-to-base64 feature. Uses utilities from utils.js. Sends PURE base64 to OB1 state updater.
File: main.js
Purpose: Application entry point. Checks for FFmpeg library presence and orchestrates the initialization sequence.
Key Functions: initializeApp().
Dependencies: External FFmpeg library, DOM Elements, Initialization Functions (from other modules).
Global Variables: None created directly.
Notes: Performs critical FFmpeg check. Uses window.load for initialization. Orchestrates startup.
File: OB1_Template.js
Purpose: Defines generateHtml function to dynamically create complete HTML source for a standalone, playable "Audional OB1" file embedding Base64 data.
Key Functions: generateHtml(imageBase64Data, audioBase64Data), (Internal JS in output: base64ToArrayBuffer, event listeners, audio logic).
Dependencies: None external for generateHtml. Output HTML uses standard browser APIs.
Global Variables: Exports generateHtml.
Notes: Core template generator. Requires PURE Base64 input. Output HTML is self-contained. Internal JS handles decoding, playback, errors, cleanup.
File: ob1-generator.js
Purpose: Manages final OB1 HTML file generation. Tracks Base64 data availability via events, enables button, uses generateHtml, triggers download.
Key Functions: initOB1Generator(), updateAudio/ImageBase64(), checkGenerateButtonState(), generateOB1(), stripDataURIPrefix().
Dependencies: DOM Element (generateOB1Button), External Function (generateHtml - assumed global), Custom DOM Events (audioBase64Generated, imageBase64Generated), Web APIs.
Global Variables: Manages internal state (audioBase64, imageBase64). Relies on global generateHtml.
Notes: Controller for final step. Event-driven. CRITICAL: Assumes OB1_Template.js loaded first. Handles data prep (prefix stripping) and download.
File: ui-helpers.js (Refactored)
Purpose: Provides UI manipulation functions (status, progress, buttons, size estimates, settings visibility, resets, info display).
Key Functions: updateStatus, updateProgress, enableConvertButtonIfNeeded, updateEstimatedSize, updateQualityDisplays, resetUIForNewFile, resetConversionOutputUI, displayAudioFormatInfo, hideAudioFormatInfo.
Dependencies: DOM Elements, Global State Variables, Global Utility Functions (window.formatBytes), Global Data Objects (audioFormatInfo).
Global Variables: All functions are implicitly global.
Notes: Centralizes DOM manipulations. Global scope reliance. Improved robustness and clarity of resets. Uses window.formatBytes.
File: utils.js (Refactored)
Purpose: Provides common global utility functions, explicitly attached to window.
Key Functions: formatBytes, getBaseFilename, fileOrBlobToPureBase64, triggerDownload.
Dependencies: Web APIs (Math, Blob, FileReader, URL, document).
Global Variables: Explicitly makes listed functions global via window. formatFileSize removed.
Notes: Global helper library. Consolidated Base64 conversion and download logic. Removed redundancy.