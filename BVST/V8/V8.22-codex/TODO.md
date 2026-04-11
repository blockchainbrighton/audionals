We need to update the audio loading logic to handle some historical on-chain inscriptions that converted audio to base64 to place it in text files like json as well as html files. I have a report on the specifics of the different historical files we need to handle pasted below. 

Please read the report then make a plan to safely implement the new module either in its own module or as part of the audio processing / importing logic so if non audio/video formatted files are submitted that the logic is there to identify these filetypes and find the audio fields, labels or tags, decode the audio into its original format then pass back into the existing chain as a regular media file the system expects.

Report: Audio File Formats & Base64 Decoding

  The application loads audio primarily by fetching content from URLs (often blockchain
  inscriptions) and determining the format based on the Content-Type header or the file
  structure.

  1. JSON Format
   * Detection: Content-Type: application/json
   * Structure: A JSON object containing:
       * audioData: A Base64-encoded string of the audio file (e.g.,
         "data:audio/wav;base64,...").
       * filename: (Optional) The name of the sample.
   * Decoding: The app splits the audioData string at the comma (,) to remove the data URI
     prefix, then decodes the remaining Base64 string into an ArrayBuffer.

  2. "Standard" Audional HTML Format
   * Detection: Content-Type: text/html
   * Structure: An HTML file containing:
       * An audio element with a specific data attribute: <audio data-audionalSampleName="...">.
       * Inside the audio element, a <source> tag with a src attribute containing the Base64 data
         URI.
       * A sample name element: <div id="sampleName">...</div>.
   * Decoding: DOM parsing is used to locate the <source> tag. The src attribute is parsed to
     extract the Base64 data.

  3. "OB1" / Legacy HTML Format (Found in your examples)
   * Detection: Content-Type: text/html (but fails standard parsing).
   * Structure: Uses custom XML-like tags within the HTML:
       * <Audional_Base64_Sample_Text> wrapping a <source> tag with the Base64 data.
       * <OB1_Base64_Image_Text> wrapping an <img> tag (often containing cover art).
   * Decoding: Needs a specific selector to find the <source> tag inside the custom parent tag.
     The current audioUtils.js does not explicitly handle this, which is likely why you
     encountered issues. The new module below adds this support.

  4. Direct Audio Files
   * Detection: Content-Type: audio/flac, audio/wav, audio/mp3, etc.
   * Structure: Raw binary audio data.
   * Decoding: No Base64 decoding required; the response buffer is used directly.

  ---

  Standalone Module: `AudionalDecoder.js`

  This module allows you to fetch and decode audio from any of the formats described above. It is
  designed to be dropped into any web3 or audio application.

     1 /**
     2  * AudionalDecoder.js
     3  * A standalone module for fetching and decoding Audional/Ordinal audio data.
     4  * Supports: JSON, Standard HTML, OB1 Legacy HTML, and Direct Audio.
     5  */
     6 
     7 const AudionalDecoder = (() => {
     8 
     9     // Helper: Convert Base64 Data URI to ArrayBuffer
    10     function base64ToArrayBuffer(base64) {
    11         // Handle data URI prefix if present (e.g. "data:audio/wav;base64,")
    12         const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    13         
    14         const binaryString = window.atob(cleanBase64);
    15         const len = binaryString.length;
    16         const bytes = new Uint8Array(len);
    17         for (let i = 0; i < len; i++) {
    18             bytes[i] = binaryString.charCodeAt(i);
    19         }
    20         return bytes.buffer;
    21     }
    22 
    23     // Parser: Handle JSON Response
    24     function parseJSON(json) {
    25         return {
    26             audioData: json.audioData ? base64ToArrayBuffer(json.audioData) : null,
    27             filename: json.filename || 'Untitled JSON Sample',
    28             type: 'json'
    29         };
    30     }
    31 
    32     // Parser: Handle HTML Response (Standard & OB1)
    33     function parseHTML(htmlText) {
    34         const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    35         let audioData = null;
    36         let filename = 'Untitled HTML Sample';
    37 
    38         // 1. Try Standard Audional Format
    39         const standardSource = doc.querySelector('audio[data-audionalSampleName] source');
    40         const standardName = doc.getElementById('sampleName');
    41         
    42         if (standardSource) {
    43             const src = standardSource.getAttribute('src');
    44             if (src && src.toLowerCase().startsWith('data:audio/')) {
    45                 audioData = base64ToArrayBuffer(src);
    46                 if (standardName) filename = standardName.textContent.trim();
    47                 return { audioData, filename, type: 'html_standard' };
    48             }
    49         }
    50 
    51         // 2. Try OB1 / Legacy Format
    52         // Looks for <source> inside <Audional_Base64_Sample_Text>
    53         const ob1Container = doc.querySelector('Audional_Base64_Sample_Text');
    54         const ob1Source = ob1Container ? ob1Container.querySelector('source') : null;
    55         
    56         if (ob1Source) {
    57             const src = ob1Source.getAttribute('src');
    58             if (src && src.toLowerCase().startsWith('data:audio/')) {
    59                 audioData = base64ToArrayBuffer(src);
    60                 // Try to find title for filename
    61                 const title = doc.querySelector('title');
    62                 if (title) filename = title.textContent.trim();
    63                 return { audioData, filename, type: 'html_ob1' };
    64             }
    65         }
    66 
    67         // 3. Fallback: Look for any base64 audio source
    68         const anySource = doc.querySelector('source[src^="data:audio/"]');
    69         if (anySource) {
    70             audioData = base64ToArrayBuffer(anySource.getAttribute('src'));
    71             return { audioData, filename: 'Unknown HTML Sample', type: 'html_fallback' };
    72         }
    73 
    74         throw new Error("No valid audio data found in HTML.");
    75     }
    76 
    77     /**
    78      * Main fetch function
    79      * @param {string} url - The URL (Ordinal/IPFS) to fetch.
    80      * @returns {Promise<{audioBuffer: ArrayBuffer, filename: string, type: string}>}
    81      */
    82     async function fetchAudio(url) {
    83         console.log(`[AudionalDecoder] Fetching: ${url}`);
    84         
    85         try {
    86             const response = await fetch(url);
    87             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    88             
    89             const contentType = response.headers.get('content-type');
    90 
    91             if (contentType && contentType.includes('application/json')) {
    92                 const json = await response.json();
    93                 return parseJSON(json);
    94             } 
    95             else if (contentType && contentType.includes('text/html')) {
    96                 const text = await response.text();
    97                 return parseHTML(text);
    98             } 
    99             else if (contentType && (contentType.includes('audio/') || contentType.include
       'application/octet-stream'))) {
   100                 // Direct Audio File (Binary)
   101                 const buffer = await response.arrayBuffer();
   102                 let filename = url.split('/').pop().split('#')[0].split('?')[0] || 'Direct
       Audio';
   103                 return { audioData: buffer, filename: filename, type: 'direct_audio' };
   104             } 
   105             else {
   106                 throw new Error(`Unsupported content type: ${contentType}`);
   107             }
   108 
   109         } catch (error) {
   110             console.error("[AudionalDecoder] Error:", error);
   111             throw error;
   112         }
   113     }
   114 
   115     return {
   116         fetchAudio: fetchAudio,
   117         base64ToArrayBuffer: base64ToArrayBuffer
   118     };
   119 
   120 })();
   121 
   122 // Export for module systems
   123 if (typeof module !== 'undefined') module.exports = AudionalDecoder;

  How to Use:

    1 // Example Usage
    2 const url = 
      "https://ordinals.com/content/e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59a
      8i0";
    3 
    4 AudionalDecoder.fetchAudio(url).then(result => {
    5     console.log("Loaded:", result.filename);
    6     console.log("Format:", result.type);
    7     
    8     // Decode array buffer to audio buffer (Web Audio API)
    9     const audioContext = new (window.AudioContext || window.webkitAudioContext)();
   10     audioContext.decodeAudioData(result.audioData, (decodedBuffer) => {
   11         console.log("Audio ready to play", decodedBuffer);
   12         // Play sound...
   13     });
   14 }).catch(err => {
   15     console.error("Failed to load audio:", err);
   16 });