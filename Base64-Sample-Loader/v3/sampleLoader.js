// sampleLoader.js - Simplified logic for loading various sample formats

// Import the sample URLs
import { ogSampleUrls } from './samples.js'; // Ensure samples.js is in the same directory

/**
 * Object to manage sample loading.
 */
export const SimpleSampleLoader = {
  /**
   * Loads a sample based on its source URL.
   * Handles Ordinals URLs, direct audio files, JSON with base64, and HTML with embedded audio.
   * @param {string} src - The source URL of the sample.
   * @returns {Promise<AudioBuffer>} A Promise that resolves to an AudioBuffer.
   */
  async loadSample(src) {
    try {
        // --- 1. Handle Ordinals.com URLs ---
        // Check if the source looks like an Ordinals content path or URL
        const isOrd = /^\/content\/[a-f0-9]{64}i0$/i.test(src) || src.startsWith('https://ordinals.com/content/');
        // Construct the full URL if it's a relative Ordinals path
        const url = isOrd && !src.startsWith('http') ? `https://ordinals.com${src}` : src;

        console.log(`Fetching sample from: ${url}`);
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        }

        const contentType = res.headers.get('Content-Type') || '';
        console.log(`Content-Type received: ${contentType}`);

        // --- 2. Handle JSON format (containing base64 audio data) ---
        if (contentType.includes('application/json')) {
            console.log("Detected JSON response, attempting to parse...");
            const data = await res.json();
            // Assume the JSON has an 'audioData' property containing the base64 string
            if (data.audioData) {
                console.log("Found 'audioData' in JSON. Decoding base64...");
                // Remove the data URL prefix if present (e.g., "data:audio/wav;base64,")
                let base64String = data.audioData;
                const prefixIndex = base64String.indexOf(',');
                if (prefixIndex !== -1) {
                    base64String = base64String.substring(prefixIndex + 1);
                }

                // Convert base64 string to binary data
                const binaryString = atob(base64String);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const arrayBuffer = bytes.buffer;

                // Decode the ArrayBuffer into an AudioBuffer using the Web Audio API
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("Decoding base64 audio data...");
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log("Successfully decoded base64 audio data.");
                return audioBuffer;
            } else {
                 throw new Error("JSON response does not contain 'audioData' property.");
            }
        }

        // --- 3. Handle direct audio files (e.g., WAV, MP3) ---
        if (contentType.startsWith('audio/')) {
             console.log("Detected direct audio file. Decoding...");
             const arrayBuffer = await res.arrayBuffer();
             const audioContext = new (window.AudioContext || window.webkitAudioContext)();
             const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
             console.log("Successfully decoded direct audio file.");
             return audioBuffer;
        }

        // --- 4. Handle HTML pages containing embedded audio ---
        // This is a fallback if the content type isn't explicitly audio or json
        console.log("Attempting to parse as HTML for embedded audio tags...");
        const htmlText = await res.text();
        // Try to find an <audio> tag with a src attribute
        const audioTagMatch = htmlText.match(/<audio[^>]+src=["']([^"']+)["']/i);
        // Fallback to finding a src with a data:audio URL
        const dataSrcMatch = htmlText.match(/src=["'](data:audio\/[^"']+)["']/i);

        if (audioTagMatch) {
            // Found an audio tag with a URL src
            const audioSrc = audioTagMatch[1];
            console.log(`Found audio tag with src: ${audioSrc}`);
            // If it's a relative URL, make it absolute using the original fetch URL
            const absoluteSrc = audioSrc.startsWith('http') ? audioSrc : new URL(audioSrc, url).href;
            console.log(`Following audio tag src link: ${absoluteSrc}`);
            // Recursively call loadSample to handle the found URL (could be base64 data: URL or direct audio)
            return this.loadSample(absoluteSrc);
        } else if (dataSrcMatch) {
            // Found a src attribute with a data:audio URL directly
             console.log("Found direct data:audio URL in HTML.");
             // Recursively call loadSample to handle the data: URL
             return this.loadSample(dataSrcMatch[1]);
        } else {
            // If none of the above conditions are met, throw an error
            throw new Error(`Unsupported source format. Content-Type: ${contentType}. No audio tag or data URL found in HTML.`);
        }

    } catch (error) {
        // Catch any errors during the fetch or processing and re-throw them
        console.error("Error loading sample from:", src, error);
        throw error; // Re-throw to allow calling code to handle it
    }
  },

  /**
   * Attempts to load all samples defined in ogSampleUrls.
   * @returns {Promise<Array<{name: string, url: string, success: boolean, error?: Error, audioBuffer?: AudioBuffer}>>}
   * An array of results for each sample attempt.
   */
  async loadAllSamples() {
    console.log("Starting to load all samples from ogSampleUrls...");
    const results = [];

    // Use map to create an array of promises, one for each sample
    const loadPromises = ogSampleUrls.map(async (sample) => {
        const name = sample.text;
        const url = sample.value;
        console.log(`Initiating load for: ${name} (${url})`);
        try {
            // Await the result of loading this specific sample
            const audioBuffer = await this.loadSample(url);
            console.log(`✅ Successfully loaded: ${name}`);
            // Store success result
            results.push({ name, url, success: true, audioBuffer });
        } catch (error) {
            console.error(`❌ Failed to load: ${name} (${url})`, error);
             // Store failure result with the error
            results.push({ name, url, success: false, error: error.message || error });
        }
    });

    // Wait for all loading promises to settle (either resolve or reject)
    await Promise.allSettled(loadPromises); // Use allSettled to ensure we wait for all, even if some fail

     console.log("Finished loading all samples.");
     return results; // Return the collected results
  }
};
