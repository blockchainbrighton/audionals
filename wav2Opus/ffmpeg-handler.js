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
    // Path to ffmpeg-core.js uploaded to the same server or CDN
    // Using a specific version from CDN:
    const corePath = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';
    // Or if you host it yourself:
    // const corePath = '/path/to/ffmpeg-core.js';

    ffmpeg = createFFmpeg({
        log: true, // Enable FFmpeg logging in console
        corePath: corePath
    });

    await ffmpeg.load();

    // Setup progress handler
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
 * @param {string} outputFormat - 'mp3' or 'opus'.
 * @returns {Promise<Uint8Array>} The raw byte data of the converted file.
 */
const runFFmpegConversion = async (inputFilename, outputFilename, outputFormat) => {
    if (!ffmpeg) throw new Error("FFmpeg is not loaded.");

    // Build FFmpeg command
    let cmd = ['-i', inputFilename];
    if (outputFormat === 'opus') {
        const bitrate = opusBitrateSlider ? opusBitrateSlider.value : initialOpusBitrate; // Use slider value or default
        cmd.push('-c:a', 'libopus', '-b:a', `${bitrate}k`, outputFilename);
    } else { // MP3 (default)
        const quality = mp3QualitySlider ? mp3QualitySlider.value : initialMp3Quality; // Use slider value or default
        const ffmpegQuality = 9 - parseInt(quality, 10); // FFmpeg q:a is reverse of visual slider (0=best, 9=worst)
        cmd.push('-c:a', 'libmp3lame', '-q:a', ffmpegQuality.toString(), outputFilename);
    }

    console.log("Running FFmpeg command:", cmd.join(' '));
    updateStatus(`Starting conversion to ${outputFormat.toUpperCase()}...`);
    progressEl.style.display = 'block'; // Show progress bar before run starts
    progressEl.value = 0;

    // Run FFmpeg
    await ffmpeg.run(...cmd);

    // Read output file from virtual filesystem
    const data = ffmpeg.FS('readFile', outputFilename);
    return data; // Return the Uint8Array
};

/**
 * Cleans up specified files from FFmpeg's virtual filesystem.
 * @param {string[]} filenames - An array of filenames to unlink.
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