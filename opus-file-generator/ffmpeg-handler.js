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
        log: false, // Enable FFmpeg logging in console
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

     // --- WATERMARK METADATA ---
    const generatorIdentifier = "AudionalOpusEncoder_v1.0"; // Your unique tool identifier
    const watermarkValue = `Generated by ${generatorIdentifier}`;

    // Using multiple custom tags for increased resilience.
    // 'X-' prefix is a common convention for application-specific tags.
    // Using a unique prefix like 'AOE_' (Audional Opus Encoder) further reduces collision risk.
    cmd.push('-metadata', `AOE-Generator=${generatorIdentifier}`);
    cmd.push('-metadata', `X-AudionalTool-Origin=${generatorIdentifier}`); // Another distinct custom tag

    // For WebM/Opus, we can try to target the audio stream specifically for some tags,
    // though FFmpeg's general -metadata often applies globally or to the first suitable stream.
    // The syntax for stream-specific metadata is '-metadata:s:a:0 key=value' for the first audio stream.
    // However, for simplicity and broad compatibility of the -metadata flag, applying globally is usually sufficient
    // and less prone to complex command construction issues.
    // Let's stick to global metadata for now, as it's widely supported and easier.
    // If you find these are being stripped, then stream-specific tags could be an advanced option to explore.
    // Example for stream-specific (more complex to ensure it always targets correctly):
    // cmd.push('-metadata:s:a:0', `AOE-AudioStreamMarker=${generatorIdentifier}`);

    // We can also add a more generic comment, which might be picked up by simpler tools,
    // but it's more likely to be overwritten. It acts as a fallback.
    cmd.push('-metadata', `comment=${watermarkValue}`);


    if (outputFormat === 'opus' || outputFormat === 'webm') { // Common settings for Opus and WebM (Opus)
        const bitrate = opusBitrateSlider ? opusBitrateSlider.value : initialOpusBitrate;
        const vbrMode = opusVbrModeSelect ? opusVbrModeSelect.value : initialOpusVbrMode;
        const compressionLevel = opusCompressionLevelSlider ? opusCompressionLevelSlider.value : initialOpusCompressionLevel;
        const application = opusApplicationSelect ? opusApplicationSelect.value : initialOpusApplication;

        cmd.push('-c:a', 'libopus');
        cmd.push('-b:a', `${bitrate}k`);
        
        // VBR mode: FFmpeg's libopus uses 0 for 'off', 1 for 'on', 2 for 'constrained'
        let vbrValue = '1'; // Default to 'on'
        if (vbrMode === 'off') vbrValue = '0';
        else if (vbrMode === 'constrained') vbrValue = '2';
        cmd.push('-vbr', vbrValue);

        cmd.push('-compression_level', compressionLevel.toString());
        cmd.push('-application', application);

        if (outputFormat === 'webm') {
            console.info("Using libopus codec for WebM container with specified settings.");
            // FFmpeg automatically handles the WebM container. '-vn' might be added if source could have video.
        }
        cmd.push(outputFilename);

    } else { // MP3 (default fallback)
        const quality = mp3QualitySlider ? mp3QualitySlider.value : initialMp3Quality; // Slider value 0-9
        const ffmpegQuality = parseInt(quality, 10);
        cmd.push('-c:a', 'libmp3lame', '-q:a', ffmpegQuality.toString());
        // The -metadata flags added earlier will also apply to MP3 (as ID3 tags).
        cmd.push(outputFilename);
    }

    // console.log("Running FFmpeg command:", cmd.join(' '));
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