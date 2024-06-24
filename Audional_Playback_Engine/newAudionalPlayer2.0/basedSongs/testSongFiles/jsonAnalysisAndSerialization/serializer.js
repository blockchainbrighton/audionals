const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Numerical key mapping
const keyMap = {
  0: 'projectName',
  1: 'artistName',
  2: 'projectBPM',
  3: 'currentSequence',
  4: 'channelURLs', // keep full URLs in the serialized output
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
const channelMap = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [letter, i]));

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

const serializeAndDeduplicatePatterns = data => {
  const serializedData = {};
  const patternMap = {};
  let patternId = 0;

  const findOrAddPattern = pattern => {
    const patternString = JSON.stringify(pattern);
    if (patternMap[patternString] !== undefined) {
      return patternMap[patternString];
    }
    const id = patternId++;
    patternMap[patternString] = id;
    return id;
  };

  const serialize = (data, isSteps = false) => {
    if (isSteps) {
      return findOrAddPattern(data);
    }

    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      const shortKey = reverseKeyMap[key] ?? key;

      if (Array.isArray(value)) {
        if (key === 'channelURLs') {
          // Preserve the full channel URLs
          serialized[shortKey] = value;
        } else if (key === 'projectChannelNames') {
          // Map channel numbers to letters
          serialized[shortKey] = value.map((v, i) => reverseChannelMap[i] ?? v);
        } else {
          serialized[shortKey] = value.map(v => typeof v === 'number' ? roundToFourDecimals(v) : serialize(v, shortKey === reverseKeyMap['steps']));
        }
      } else if (typeof value === 'object' && value !== null) {
        serialized[shortKey] = key === 'projectSequences'
          ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
              const shortSeqKey = seqKey.replace('Sequence', 's');
              const filteredChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                const letter = channelMap[chKey] ?? chKey;
                if (chValue.steps?.length) {
                  chAcc[letter] = { [reverseKeyMap['steps']]: serialize(chValue.steps, true) };
                }
                return chAcc;
              }, {});
              if (Object.keys(filteredChannels).length) acc[shortSeqKey] = filteredChannels;
              return acc;
            }, {})
          : serialize(value);
      } else {
        serialized[shortKey] = typeof value === 'number' ? roundToFourDecimals(value) : value;
      }
    }
    return serialized;
  };

  const serializedContent = serialize(data);
  return { serializedContent, patternMap: Object.fromEntries(Object.entries(patternMap).map(([pattern, id]) => [id, JSON.parse(pattern)])) };
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
      const baseFileName = path.basename(file, '.json');
      const outputFilePath = path.join(outputDir, `${baseFileName}_serialized.json`);

      fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) return console.error('Error reading input file:', err);

        try {
          const jsonData = JSON.parse(data);
          const { serializedContent, patternMap } = serializeAndDeduplicatePatterns(jsonData);
          const sequenceAnalysis = analyzeSequences(jsonData);

          console.log(`Sequence Analysis for ${file}:`, JSON.stringify(sequenceAnalysis, null, 2));

          fs.writeFile(outputFilePath, JSON.stringify(serializedContent), 'utf8', err => {
            if (err) return console.error('Error writing output file:', err);

            const patternMapFilePath = path.join(outputDir, `${baseFileName}_patterns.json`);
            fs.writeFile(patternMapFilePath, JSON.stringify(patternMap), 'utf8', err => {
              if (err) return console.error('Error writing pattern map file:', err);

              const compressedFilePath = `${outputFilePath}.gz`;
              fs.createReadStream(outputFilePath)
                .pipe(zlib.createGzip())
                .pipe(fs.createWriteStream(compressedFilePath))
                .on('finish', () => console.log('Compressed data saved to', compressedFilePath));
            });
          });
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
        }
      });
    });
});
