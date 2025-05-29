Use npx serve -l 3000 in the root directory to run the code

Audional Art Tools: WAV to WebM & Image to Base64 Converter
Overview

This web-based application provides a suite of tools for artists and creators working with Audionals (audio-based Bitcoin Ordinals). It allows users to:

Convert WAV audio files to web-friendly formats like WebM (using the Opus codec), MP3, or raw Opus, with options to control quality and file size.

Generate Base64 representations of these converted audio files.

Convert image files (e.g., PNG, JPG, GIF, WebP) into Base64 strings.

Combine the Base64 audio and image data with user-provided metadata to generate a clickable HTML file (OB1 Audional format), ready for inscription on the Bitcoin blockchain.

The entire process runs in the user's browser, ensuring privacy and speed, thanks to WebAssembly-powered FFmpeg.

Features

Audio Conversion (WAV input):

Output formats: WebM (Opus codec - recommended), MP3 (LAME encoder), Opus.

Adjustable Opus settings: Bitrate, VBR mode (On, Off, Constrained), Compression Level, Application type (Audio, VoIP, Low Delay).

Adjustable MP3 quality (VBR -q:a setting).

Real-time estimated output file size.

Original audio playback.

Converted audio playback.

Download link for the converted audio file.

Progress bar for conversion.

Audio Base64 Generation:

Convert the processed audio into a pure Base64 string.

Display Base64 string (collapsible section).

Copy Base64 string to clipboard.

Download Base64 string as a .txt file.

Image to Base64 Conversion:

Supports common image formats.

Image preview.

Displays original file size.

Convert image to a pure Base64 string.

Display Base64 string (collapsible section).

Copy Base64 string to clipboard.

Download Base64 string as a .txt file.

OB1 Audional HTML Generation:

Modal for inputting metadata: Title, Instrument, Note (with frequency auto-calculation), Is Loop?, BPM (if loop).

Combines audio Base64, image Base64, and metadata into a single HTML file.

The generated HTML follows the OB1 Audional standard, embedding the data and metadata for display and interaction.

Download the generated .html file.

Informational Popups:

Detailed explanations of audio formats (containers, codecs, lossless/lossy, bitrate, WAV, WebM, Opus, MP3).

Opus bitrate recommendations.

Step-by-step instructions for generating Audional art using the tool.

Client-Side Processing: All file processing and conversions happen directly in the browser. No files are uploaded to a server.

Running the Application
Prerequisites

Node.js and npm (or npx) installed on your system (primarily to use npx serve).

Steps to Run

Clone or download this repository to your local machine.

Open your terminal or command prompt.

Navigate to the root directory of the project (where index.html and serve.json are located).

Run the following command:

npx serve -l 3000


This will start a local development server, typically at http://localhost:3000.

Open your web browser and go to http://localhost:3000.

Important: COOP/COEP Headers

The application uses FFmpeg.wasm, which relies on SharedArrayBuffer. For SharedArrayBuffer to work, specific HTTP headers must be set:

Cross-Origin-Opener-Policy: same-origin

Cross-Origin-Embedder-Policy: require-corp

The provided serve.json file configures npx serve to send these headers for .html files. If you deploy this tool to a different static hosting provider (like Vercel, Netlify, GitHub Pages), you will need to ensure these headers are correctly configured for your deployment. The cors-config.json file provides an example of how this might be configured for a platform like Vercel.

How to Use

The application is divided into sections: Audio Conversion, Image Conversion, and OB1 Generation.

1. Audio Conversion (WAV to WebM/Opus/MP3)

Select WAV File: Click "Select WAV File" and choose your .wav audio.

The tool will display the file name and duration.

You can click "Play Original" to listen to it.

Choose Output Quality:

By default, WebM (Opus) is selected, which is highly recommended for Audionals due to its excellent quality-to-size ratio.

Adjust the Opus Bitrate slider (e.g., 64-96 kbps is often a good balance).

Optionally, adjust advanced Opus settings: VBR Mode, Compression Level, Application.

The estimated output file size will update as you change settings.

(Alternatively, you can select MP3 and adjust its quality slider, though WebM/Opus is preferred for Audionals).

Convert: Click the "Convert to WebM" (or selected format) button.

A progress bar will show the conversion status.

Results:

A download link for the converted file will appear (e.g., "Download myaudio.webm").

An audio player for the converted file will appear.

Audio Base64 Conversion:

The converted audio is automatically processed into a Base64 string.

You can expand "Show Audio Base64 Output" to view it.

Use the "Copy Audio Base64" or "Download Audio Base64 as TXT" buttons as needed. This Base64 data is required for the OB1 Generator.

2. Image to Base64 Conversion

Select Image File: Click "Select Image File" and choose your image (e.g., PNG, JPG, GIF, WebP).

A preview of the image and its file size will be displayed.

Convert to Base64: Click the "Convert to Base64" button.

Results:

The Base64 string of the image will appear in the "Image Base64 Output" textarea.

Use the "Copy Image Base64" or "Download Image Base64 as TXT" buttons. This Base64 data is required for the OB1 Generator.

3. Generating OB1 Audional HTML

Once you have successfully generated both the Audio Base64 (from a WebM/Opus conversion) and the Image Base64:

Enable Button: The "Generate Clickable HTML (OB1)" button at the bottom of the page will become enabled.

Open Metadata Modal: Click the "Generate Clickable HTML (OB1)" button. A modal dialog will appear.

Enter Metadata:

Title/Name: A title for your Audional.

Instrument: The instrument or sound source.

Note: The musical note (e.g., C#4). The frequency will be auto-calculated.

Is this a loop?: Check this box if your audio is a seamless loop.

BPM/Tempo: If it's a loop, enter the Beats Per Minute (BPM).

Generate HTML: Click "Generate HTML" in the modal.

Download: Your browser will download an .html file (e.g., Audional_OB1_Clickable_YYYY-MM-DDTHH-MM-SS-mmmZ.html).

This HTML file contains your embedded audio, image (as Base64), and the metadata you entered. It is ready to be inscribed as a Bitcoin Ordinal.

Important Note on Generated HTML:
The generated OB1 HTML file (OB1_Template2.js structure) is designed to be interactive and references three external files: style.css, app.js, and main.js.

<!-- In the generated HTML -->
<link rel="stylesheet" href="style.css">
<script type="module" src="app.js"></script>
<script type="module" src="main.js"></script>
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Html
IGNORE_WHEN_COPYING_END

For the generated HTML file to display and function correctly when opened in a browser (e.g., for testing before inscription or when viewed via an Ordinal explorer), these three supporting files must be present in the same directory as the generated HTML file, or accessible via paths that the Audional platform/explorer resolves. This tool generates the main HTML structure; these supporting style.css, app.js, and main.js files are assumed to be part of the OB1 Audional standard or provided by the platform where the Audional will be viewed/used.

Development

This project is built using vanilla HTML, CSS, and JavaScript, with FFmpeg.wasm for client-side media processing.

Project Structure

/: Root directory.

index.html: The main HTML file for the application.

*.js: Various JavaScript files handling specific functionalities (see below).

OB1_Template2.js: Contains the JavaScript template string for the generated Audional HTML.

serve.json: Configuration for npx serve to apply necessary COOP/COEP headers.

cors-config.json: Example header configuration (e.g., for Vercel-like deployments).

README.md: This file.

/css3/:

s6.css: Main stylesheet for the application.

favicon.ico: Application icon.

Core Technologies & Libraries

HTML5, CSS3, JavaScript (ES6+): Standard web technologies.

FFmpeg.wasm (@ffmpeg/ffmpeg, @ffmpeg/core): Enables client-side audio conversion by running FFmpeg in the browser using WebAssembly. Loaded from a CDN.

Web APIs:

File API (FileReader): For reading user-selected files.

Blob API: For creating downloadable files (converted audio, Base64 text, generated HTML).

URL API (URL.createObjectURL): For creating temporary URLs for Blobs.

Web Audio API (AudioContext.decodeAudioData): Used to determine WAV file duration.

DOM Manipulation: Standard methods for interacting with the page.

CustomEvent: Used for inter-module communication (e.g., signaling Base64 data readiness).

ES Modules: Used for image-to-base64.js. Other scripts are loaded globally/sequentially with defer.

Key JavaScript Modules

The application's JavaScript is organized into modules, each with a specific responsibility:

main.js: Entry point of the application; initializes other modules and FFmpeg.

config-state.js: Holds global state variables and initial configuration values.

dom-elements.js: Centralizes DOM element selection.

event-listeners.js: Sets up all primary UI event listeners and initializes UI state.

ui-helpers.js: Contains functions for updating UI elements (status messages, progress bars, info popups, estimated sizes, UI resets).

file-handler.js: Manages file input, validates WAV files, and extracts audio duration.

ffmpeg-handler.js: Handles loading FFmpeg.wasm, running FFmpeg commands, and reporting progress.

conversion-process.js: Orchestrates the main audio conversion workflow.

base64-handler.js: Converts audio Blobs to Base64 strings and manages the audio Base64 display/actions.

image-to-base64.js (ES Module): Handles image file selection, conversion to Base64, and manages the image Base64 UI section.

audio-player.js: Utility to create HTML5 audio player elements.

metadata-modal-handler.js: Manages interactions within the metadata input modal (e.g., note-to-frequency conversion, BPM field visibility).

ob1-generator.js: Manages the state of audio/image Base64 data, handles the metadata modal, and uses OB1_Template2.js to generate the final Audional HTML file.

OB1_Template2.js: A function that returns the HTML string for the Audional, embedding the Base64 data and metadata.

informationButtons.js: Stores the text content for the informational popups.

utils.js: General utility functions (e.g., formatBytes).

Event System

The application uses CustomEvents for loose coupling between modules, particularly for signaling the availability of Base64 data:

audioBase64Generated: Dispatched by base64-handler.js when audio Base64 is ready. Listened to by ob1-generator.js.

imageBase64Generated: Dispatched by image-to-base64.js (indirectly, as it calls window.updateImageBase64 which is an alias to a function in ob1-generator.js). The ob1-generator.js actually listens for a direct function call, but a custom event for images is also noted in ob1-generator.js event listeners though perhaps not the primary mechanism. The primary mechanism is window.updateImageBase64.

Developer Resources & References

FFmpeg.wasm:

GitHub: https://github.com/ffmpegwasm/ffmpeg.wasm

MDN Web Docs (Mozilla Developer Network):

File API: https://developer.mozilla.org/en-US/docs/Web/API/File_API

FileReader API: https://developer.mozilla.org/en-US/docs/Web/API/FileReader

Blob API: https://developer.mozilla.org/en-US/docs/Web/API/Blob

URL API (URL.createObjectURL): https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL

Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

CustomEvent: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent

JavaScript Modules (ESM): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

Opus Codec:

Official Website: https://opus-codec.org/

WebM Project:

Official Website: https://www.webmproject.org/

Opus in WebM: https://www.webmproject.org/docs/container/

Cross-Origin Policies (COOP/COEP):

Making your website "cross-origin isolated": https://web.dev/coop-coep/

Audionals & Ordinals:

Ordinals Handbook: https://docs.ordinals.com/

(For the specific OB1 HTML structure, the OB1_Template2.js file in this project serves as a primary reference. Community resources for Audionals may provide further context on the standard.)

npx serve utility:

npm package: https://www.npmjs.com/package/serve (for serve.json options)