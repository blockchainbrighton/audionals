const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Numerical key mapping
const keyMap = {
  0: 'projectName',
  1: 'artistName',
  2: 'projectBPM',
  3: 'currentSequence',
  4: 'channelURLs',
  5: 'channelVolume',
  6: 'channelPlaybackSpeed',
  7: 'trimSettings',
  8: 'projectChannelNames',
  9: 'startSliderValue',
  10: 'endSliderValue',
  11: 'totalSampleDuration',
  12: 'start',
  13: 'end',
  14: 'projectSequences',
  15: 'steps'
};

const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, +k]));

// Channel number to letter mapping
const channelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [i, letter]));

// Round to four decimal places
const roundToFourDecimals = num => Math.round(num * 10000) / 10000;

const compressSteps = steps => {
  if (!steps.length) return [];

  const compressed = [];
  let start = null, end = null, inRange = false;

  steps.forEach(step => {
    if (typeof step === 'number') {
      if (start === null) {
        start = end = step;
      } else if (step === end + 1) {
        end = step;
        inRange = true;
      } else {
        compressed.push(inRange ? { r: [start, end] } : start);
        start = end = step;
        inRange = false;
      }
    } else if (step.index !== undefined && step.reverse) {
      if (start !== null) {
        compressed.push(inRange ? { r: [start, end] } : start);
        start = end = null;
        inRange = false;
      }
      compressed.push(`${step.index}r`);
    }
  });

  if (start !== null) compressed.push(inRange ? { r: [start, end] } : start);

  return compressed;
};

const serialize = data => {
  const serializedData = {};

  for (const [key, value] of Object.entries(data)) {
    const shortKey = reverseKeyMap[key] ?? key;

    if (key === 'channelURLs') {
      // Directly assign channelURLs without alteration
      serializedData[shortKey] = value;
    } else if (Array.isArray(value)) {
      serializedData[shortKey] = ['projectChannelNames'].includes(key)
        ? value.map((v, i) => reverseChannelMap[i] ?? v) // Map channel names to letters
        : value.map(v => typeof v === 'number' ? roundToFourDecimals(v) : serialize(v));
    } else if (typeof value === 'object' && value !== null) {
      serializedData[shortKey] = key === 'projectSequences'
        ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
            const shortSeqKey = seqKey.replace('Sequence', 's');
            const filteredChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
              const letter = reverseChannelMap[parseInt(chKey.replace('ch', ''), 10)] ?? chKey; // Convert channel number to letter
              if (chValue.steps?.length) {
                chAcc[letter] = { [reverseKeyMap['steps']]: compressSteps(chValue.steps) };
              }
              return chAcc;
            }, {});
            if (Object.keys(filteredChannels).length) acc[shortSeqKey] = filteredChannels;
            return acc;
          }, {})
        : serialize(value);
    } else {
      serializedData[shortKey] = typeof value === 'number' ? roundToFourDecimals(value) : value;
    }
  }

  return serializedData;
};

const analyzeSequences = data => {
  const sequences = data.projectSequences || data.pS || {};
  const analysis = {
    totalSequences: 0,
    totalChannels: 0,
    totalSteps: 0,
    sequences: {}
  };

  for (const [seqKey, channels] of Object.entries(sequences)) {
    const seqAnalysis = {
      totalChannels: 0,
      totalSteps: 0,
      channels: {}
    };

    for (const [chKey, chValue] of Object.entries(channels)) {
      if (Array.isArray(chValue.steps) && chValue.steps.length) {
        const numSteps = chValue.steps.length;
        seqAnalysis.totalChannels++;
        seqAnalysis.totalSteps += numSteps;
        seqAnalysis.channels[chKey] = {
          totalSteps: numSteps,
          activeSteps: chValue.steps
        };
      }
    }

    if (seqAnalysis.totalChannels) {
      analysis.totalSequences++;
      analysis.totalChannels += seqAnalysis.totalChannels;
      analysis.totalSteps += seqAnalysis.totalSteps;
      analysis.sequences[seqKey] = seqAnalysis;
    }
  }

  return analysis;
};

const inputDir = __dirname; // Enclosing folder
const outputDir = path.join(__dirname, 'serializedFiles');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.readdir(inputDir, (err, files) => {
  if (err) return console.error('Error reading input directory:', err);

  files.filter(file => path.extname(file) === '.json')
    .forEach(file => {
      const inputFilePath = path.join(inputDir, file);
      
      // Modify file name to include _s before the extension
      const fileInfo = path.parse(file);
      const outputFilePath = path.join(outputDir, `${fileInfo.name}_s${fileInfo.ext}`);

      fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) return console.error('Error reading input file:', err);

        try {
          const jsonData = JSON.parse(data);
          const serializedData = serialize(jsonData);
          const sequenceAnalysis = analyzeSequences(jsonData);

          console.log(`Sequence Analysis for ${file}:`, JSON.stringify(sequenceAnalysis, null, 2));

          fs.writeFile(outputFilePath, JSON.stringify(serializedData), 'utf8', err => {
            if (err) return console.error('Error writing output file:', err);

            const compressedFilePath = `${outputFilePath}.gz`;
            fs.createReadStream(outputFilePath)
              .pipe(zlib.createGzip())
              .pipe(fs.createWriteStream(compressedFilePath))
              .on('finish', () => console.log('Compressed data saved to', compressedFilePath));
          });
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
        }
      });
    });
});