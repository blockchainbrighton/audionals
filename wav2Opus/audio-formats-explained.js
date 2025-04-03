/**
 * @file audio-formats-explained.js
 * @description Exports structured text explaining how to use the app and details about WAV, MP3, and Opus formats,
 * focusing on file size, quality, and bitrate trade-offs, suitable for UI display.
 */

// Define the object containing the informational text using standard JavaScript syntax.
const audioFormatInfo = {

    // --- App Usage Instructions ---
    usageInstructions: `
        <h2>How to Use This App</h2>
        <h3>Audio Conversion (WAV to MP3/Opus)</h3>
        <ol>
            <li><strong>Select WAV File:</strong> Click "Choose File" and select a .wav audio file from your computer.</li>
            <li><strong>Choose Output Format &amp; Quality:</strong>
                <ul>
                    <li>Select either <strong>MP3</strong> or <strong>Opus</strong>. <strong>Opus</strong> is generally recommended for better quality at smaller sizes.</li>
                    <li>If MP3: Adjust the MP3 Quality slider (0 = Best Quality/Largest File, 9 = Worst Quality/Smallest File). A value of 4-5 is often a good balance.</li>
                    <li>If Opus: Adjust the Opus Bitrate slider (higher kbps = better quality/larger file). See Opus Recommendations below for guidance (64-96kbps is often great for music).</li>
                </ul>
            </li>
            <li><strong>(Optional)</strong> Click <em>Play Original</em> to listen to your selected WAV file before converting.</li>
            <li>Click <strong>3. Convert</strong>. The process may take a few moments depending on file size and your computer.</li>
            <li><strong>Review Results:</strong>
                <ul>
                    <li>Download the converted MP3 or Opus file.</li>
                    <li>Play the converted audio directly on the page.</li>
                    <li>View, Copy, or Download the Base64 text representation of the converted audio file (under the "Base64 Conversion" section that appears).</li>
                </ul>
            </li>
        </ol>

        <h3>Image Conversion (to Base64)</h3>
        <ol>
            <li><strong>Select Image File:</strong> Click "Select Image File" (or the "Choose File" button next to it) and select an image (e.g., JPG, PNG, GIF) from your computer. A preview will appear.</li>
            <li>Click <strong>Convert to Base64</strong>.</li>
            <li><strong>Review Results:</strong>
                <ul>
                    <li>Expand the "Show Base64 Output" section to view the text.</li>
                    <li>Copy the Base64 text using the button (if needed).</li>
                    <li>Download the Base64 text as a .txt file.</li>
                </ul>
            </li>
        </ol>

        <h3>Generate Clickable HTML (OB1) File</h3>
        <ol>
            <li><strong>Prerequisite:</strong> You must have successfully generated both the audio Base64 output (from the audio converter) and the image Base64 output (from the image converter) in the sections above.</li>
            <li>Once both Base64 outputs are available, the <strong>Generate OB1</strong> button at the bottom will become enabled.</li>
            <li>Click <strong>Generate OB1</strong>.</li>
            <li>An HTML file (e.g., <em>Audional_OB1_Clickable_... .html</em>) will be automatically downloaded.</li>
            <li>Open this HTML file in your web browser. Clicking the image within the file should play the embedded audio.</li>
        </ol>
    `,

    // --- Core Concepts ---
    conceptsTitle: `<h2>Core Concepts: Lossless vs. Lossy & Bitrate</h2>`,

    losslessVsLossy: `
        <p><strong>Lossless (e.g., WAV):</strong> Stores audio data without discarding information. Quality is identical to the original source, resulting in the largest file sizes. Ideal for archiving and professional editing.</p>
        <p><strong>Lossy (e.g., MP3, Opus):</strong> Achieves smaller sizes by permanently discarding data deemed less audible to humans (using "psychoacoustic models"). Quality loss is inherent but can be minimal at high settings. Great for streaming and portable devices. <em>Re-encoding lossy files causes further quality loss.</em></p>
    `,

    bitrate: `
        <p><strong>Bitrate (kbps - kilobits per second):</strong> Represents the amount of data used per second of audio.</p>
        <ul>
            <li><strong>Higher Bitrate:</strong> Generally = More data, potentially higher quality, larger file size.</li>
            <li><strong>Lower Bitrate:</strong> Generally = Less data, more compression artifacts (potential quality loss), smaller file size.</li>
        </ul>
        <p><em>Codec efficiency matters!</em> A modern codec like Opus usually sounds better than MP3 at the same bitrate.</p>
        <p><strong>VBR (Variable Bitrate):</strong> Used by Opus and our MP3 setting (-q:a). Allocates more data to complex audio sections and less to simple ones, generally offering better quality for a given average size than CBR (Constant Bitrate).</p>
        <p><strong>File Size Estimation (Approx.):</strong> Size (KB) ≈ (Bitrate (kbps) * Duration (s)) / 8</p>
    `,

    // --- Audio Format Details ---
    formatsTitle: `<h2>Format Details</h2>`,

    wav: `
        <h3>WAV (Waveform Audio File Format)</h3>
        <ul>
            <li><strong>Type:</strong> Lossless (usually uncompressed PCM).</li>
            <li><strong>Quality:</strong> Highest fidelity, identical to the digital source.</li>
            <li><strong>File Size:</strong> Very Large (~10 MB per minute for CD quality).</li>
            <li><strong>Pros:</strong> Perfect quality for editing/archiving.</li>
            <li><strong>Cons:</strong> Impractical size for streaming/portable use.</li>
        </ul>
    `,

    mp3: `
        <h3>MP3 (MPEG-1 Audio Layer III)</h3>
        <ul>
            <li><strong>Type:</strong> Lossy.</li>
            <li><strong>Quality:</strong> Varies with bitrate. 128-192 kbps often acceptable, 256-320 kbps considered high quality. VBR (\`-q:a\` setting here, 0=Best/Largest, 9=Worst/Smallest) is generally better than CBR.</li>
            <li><strong>File Size:</strong> Good reduction (~1 MB/min @ 128 kbps).</li>
            <li><strong>Compression:</strong> Older, less efficient psychoacoustic model than Opus.</li>
            <li><strong>Pros:</strong> Highly compatible.</li>
            <li><strong>Cons:</strong> Less efficient than modern codecs, artifacts more noticeable at lower bitrates.</li>
        </ul>
    `,

    opus: `
        <h3>Opus</h3>
        <ul>
            <li><strong>Type:</strong> Lossy.</li>
            <li><strong>Quality:</strong> State-of-the-art efficiency. Superior to MP3 at the same bitrate, especially below 128 kbps. Excellent for both speech and music.</li>
            <li><strong>File Size:</strong> Very flexible, excellent compression.</li>
            <li><strong>Compression:</strong> Modern (SILK+CELT), adaptable bitrate, low latency.</li>
            <li><strong>Pros:</strong> Best quality-to-size ratio, open standard, royalty-free, great for web/VoIP.</li>
            <li><strong>Cons:</strong> Less compatible than MP3 on very old hardware (support is widespread now).</li>
        </ul>
    `,

    // --- Opus Bitrate Recommendations ---
    opusRecommendationsTitle: `<h2>Opus Bitrate Recommendations (Quality vs. Size)</h2>`,

    opusDetails: `
        <p>Opus is versatile. The "ideal" bitrate depends on your needs:</p>
        <ul>
            <li><strong>~128 kbps+:</strong> Often achieves <strong>perceptual transparency</strong> (indistinguishable from WAV for most listeners). Technically still lossy, so use WAV/FLAC for true archival. 128-160 kbps is usually sufficient; higher rates offer diminishing returns.</li>
            <li><strong>~96 kbps:</strong> A common "sweet spot" for high-quality stereo music streaming. Excellent quality, significant size savings.</li>
            <li><strong>~64 kbps:</strong> Surprisingly good stereo music quality (often better than MP3 @ 128kbps). Great for mobile/web. Very good for high-quality stereo speech.</li>
            <li><strong>~48 kbps:</strong> Excellent for mono speech (podcasts). Usable for less critical stereo/background music.</li>
            <li><strong>~32 kbps:</strong> Primarily for speech intelligibility (VoIP). Music noticeably compressed.</li>
            <li><strong>Below 32 kbps:</strong> Highly compressed speech for very low bandwidth.</li>
        </ul>
        <p><strong>Conclusion:</strong> For near-WAV quality, try <strong>96-128 kbps</strong>. For excellent web/mobile music, <strong>64-96 kbps</strong> is great. For high-quality speech, <strong>48-64 kbps</strong> is usually plenty.</p>
        <p><em>Consider: Source complexity, listening environment, listener sensitivity, and bandwidth/storage limits. Always test!</em></p>
    `
}; // End of the audioFormatInfo object definition

// Note: No 'export' statement is used here, assuming standard script loading in the browser.
// The 'audioFormatInfo' object will be available globally after this script runs.
