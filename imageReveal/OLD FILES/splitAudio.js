const { exec } = require('child_process'); // To run external commands
const path = require('path');           // To handle file paths
const fs = require('fs');               // To check if file exists

// --- Configuration ---
const inputFile = process.argv[2]; // Get input file from command line argument
// --- End Configuration ---

if (!inputFile) {
  console.error('Error: Please provide the input WebM file path as an argument.');
  console.log('Usage: node split_audio.js <path/to/your/audio.webm>');
  process.exit(1); // Exit with error code
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

const outputBasename = path.basename(inputFile, path.extname(inputFile));
const outputDir = path.dirname(inputFile);
const outputFile1 = path.join(outputDir, `${outputBasename}_part1.webm`);
const outputFile2 = path.join(outputDir, `${outputBasename}_part2.webm`);

console.log(`Input file: ${inputFile}`);
console.log('Attempting to split...');

// 1. Get the duration of the audio file using ffprobe (part of FFmpeg)
const ffprobeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFile}"`;

exec(ffprobeCmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error getting duration: ${error.message}`);
    console.error('Stderr:', stderr);
    console.error('\nMake sure FFmpeg (including ffprobe) is installed and in your PATH.');
    process.exit(1);
  }
  if (stderr) {
      console.warn(`ffprobe stderr: ${stderr}`); // Show warnings but continue
  }

  const duration = parseFloat(stdout);
  if (isNaN(duration) || duration <= 0) {
    console.error(`Error: Could not parse duration or duration is invalid: ${stdout}`);
    process.exit(1);
  }

  const midpoint = duration / 2;
  console.log(`Total duration: ${duration.toFixed(3)} seconds`);
  console.log(`Splitting at: ${midpoint.toFixed(3)} seconds`);

  // 2. Create the first half using ffmpeg
  // -i: input file
  // -to: duration/timestamp to stop writing at
  // -c copy: copy codecs without re-encoding (fast, preserves quality)
  const cmd1 = `ffmpeg -i "${inputFile}" -to ${midpoint} -c copy "${outputFile1}" -y`; // -y overwrites output without asking

  console.log(`\nExecuting: ${cmd1}`);
  exec(cmd1, (err1, stdout1, stderr1) => {
    if (err1) {
      console.error(`\nError creating first part: ${err1.message}`);
      console.error('Stderr:', stderr1);
      process.exit(1);
    }
    if (stderr1) {
        console.log(`FFmpeg (Part 1) output:\n${stderr1}`); // Show ffmpeg output/warnings
    }
    console.log(`Successfully created: ${outputFile1}`);

    // 3. Create the second half using ffmpeg
    // -ss: seek to start position (put *before* -i for faster seeking on keyframes, but can be less accurate. Put *after* -i for slower but sample-accurate seeking)
    // Here, accuracy might be slightly off but it's simpler. For exactness, place -ss after -i.
    // For simplicity and speed with -c copy, -ss before -i is common.
    // Let's try -ss *after* -i for better accuracy with -c copy, though it might still adjust slightly.
    // const cmd2 = `ffmpeg -ss ${midpoint} -i "${inputFile}" -c copy "${outputFile2}" -y`; // Faster seek potentially less accurate start
    const cmd2 = `ffmpeg -i "${inputFile}" -ss ${midpoint} -c copy "${outputFile2}" -y`; // Slower seek potentially more accurate start

    console.log(`\nExecuting: ${cmd2}`);
    exec(cmd2, (err2, stdout2, stderr2) => {
      if (err2) {
        console.error(`\nError creating second part: ${err2.message}`);
        console.error('Stderr:', stderr2);
        // Optionally delete the first part if the second fails
        // fs.unlinkSync(outputFile1);
        process.exit(1);
      }
       if (stderr2) {
        console.log(`FFmpeg (Part 2) output:\n${stderr2}`); // Show ffmpeg output/warnings
       }
      console.log(`Successfully created: ${outputFile2}`);
      console.log('\nSplit complete!');
    });
  });
});