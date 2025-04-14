// ffmpeg-handler.js

const { createFFmpeg, fetchFile } = FFmpeg; // Assuming FFmpeg is global

/**
 * Loads the FFmpeg library if it hasn't been loaded yet.
 */
const loadFFmpeg = async () => {
  if (ffmpeg) {
      console.log("FFmpeg already loaded.");
      updateStatus('FFmpeg ready. Select a file.');
      enableConvertButtonIfNeeded();
      return; // Already loaded
  }

  try {
    updateStatus('Loading FFmpeg core...');
    const corePath = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';

    ffmpeg = createFFmpeg({
        log: true, // Enable FFmpeg logging in console
        corePath: corePath
    });

    await ffmpeg.load();

    ffmpeg.setProgress(({ ratio }) => {
       updateProgress(ratio);
    });

    updateStatus('FFmpeg ready. Select a file.');
    enableConvertButtonIfNeeded();

  } catch (e) {
    updateStatus(`Failed to load FFmpeg: ${e.message}`, true);
    console.error("FFmpeg loading error:", e);
    ffmpeg = null; // Ensure ffmpeg state is null on failure
  }
};

/**
 * Runs the FFmpeg conversion command.
 * @param {string} inputFilename - The name of the input file in FFmpeg's virtual FS.
 * @param {string} outputFilename - The desired name for the output file in FFmpeg's virtual FS.
 * @param {string} outputFormat - 'mp3', 'opus', or 'webm'. // Updated doc
 * @returns {Promise<Uint8Array>} The raw byte data of the converted file.
 */
const runFFmpegConversion = async (inputFilename, outputFilename, outputFormat) => {
    if (!ffmpeg) throw new Error("FFmpeg is not loaded.");

    // Build FFmpeg command
    let cmd = ['-i', inputFilename];

    if (outputFormat === 'opus') {
        // Use the Opus slider value
        const bitrate = opusBitrateSlider ? opusBitrateSlider.value : initialOpusBitrate;
        // Opus command: -c:a libopus -b:a <bitrate>k
        cmd.push('-c:a', 'libopus', '-b:a', `${bitrate}k`, outputFilename);

    } else if (outputFormat === 'webm') { // Changed from 'caf'
        // Use the Opus slider value (as UI is reused)
        const bitrate = opusBitrateSlider ? opusBitrateSlider.value : initialOpusBitrate;
        // WebM command using Opus codec: -c:a libopus -b:a <bitrate>k
        // FFmpeg automatically handles the WebM container when the output filename ends in .webm
        cmd.push('-c:a', 'libopus', '-b:a', `${bitrate}k`, outputFilename);
        console.info("Using libopus codec for WebM container.");
        // Note: '-vn' (disable video) is often implied for .webm audio but explicit doesn't hurt
        // cmd.push('-vn', '-c:a', 'libopus', '-b:a', `${bitrate}k`, outputFilename);

    } else { // MP3 (default fallback)
        const quality = mp3QualitySlider ? mp3QualitySlider.value : initialMp3Quality; // Slider value 0-9
        // Assuming label "0=Best... 9=Worst..." maps slider 0 to FFmpeg -q:a 0 (Best)
        const ffmpegQuality = parseInt(quality, 10);
        // If label means Slider 0 = Worst -> FFmpeg 9, use: const ffmpegQuality = 9 - parseInt(quality, 10);
        cmd.push('-c:a', 'libmp3lame', '-q:a', ffmpegQuality.toString(), outputFilename);
    }

    console.log("Running FFmpeg command:", cmd.join(' '));
    updateStatus(`Starting conversion to ${outputFormat.toUpperCase()}...`);
    if (progressEl) { // Ensure progressEl exists before using it
        progressEl.style.display = 'block';
        progressEl.value = 0;
    }

    try {
        // Run FFmpeg
        await ffmpeg.run(...cmd);
        // Read output file from virtual filesystem
        const data = ffmpeg.FS('readFile', outputFilename);
        return data; // Return the Uint8Array
    } catch (error) {
        // Try to provide more specific feedback if FFmpeg fails
        updateStatus(`Conversion to ${outputFormat.toUpperCase()} failed. Check console for details.`, true);
        console.error(`FFmpeg run error for ${outputFormat}:`, error);
        // Re-throw the error so the main conversion process catches it
        throw error;
    }
};

/**
 * Cleans up specified files from FFmpeg's virtual filesystem.
 */
const cleanupFFmpegFS = (filenames) => {
    if (!ffmpeg) return;
    filenames.forEach(f => {
        try {
            // Check if file exists before unlinking to avoid errors
            if (ffmpeg.FS('readdir', '/').includes(f)) {
                ffmpeg.FS('unlink', f);
                // console.log(`Cleaned up ${f} from virtual FS.`); // Debug log
            }
        } catch (e) {
            // Ignore errors during cleanup (e.g., file not found)
             console.warn(`Ignoring cleanup warning for ${f}:`, e.message);
        }
    });
};