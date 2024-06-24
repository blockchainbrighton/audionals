const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const keyMap = {
  projectName: 'pN',
  artistName: 'aN',
  projectBPM: 'pB',
  currentSequence: 'cS',
  channelURLs: 'cU',
  channelVolume: 'cV',
  channelPlaybackSpeed: 'cP',
  trimSettings: 'tS',
  projectChannelNames: 'pCN',
  startSliderValue: 'sS',
  endSliderValue: 'eS',
  totalSampleDuration: 'tD',
  start: 'st',
  end: 'en',
  projectSequences: 'pS',
  steps: 'st'
};

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
        compressed.push(inRange ? { range: [start, end] } : start);
        start = end = step;
        inRange = false;
      }
    } else if (step.index !== undefined && step.reverse) {
      if (start !== null) {
        compressed.push(inRange ? { range: [start, end] } : start);
        start = end = null;
        inRange = false;
      }
      compressed.push(`${step.index}r`);
    }
  });

  if (start !== null) compressed.push(inRange ? { range: [start, end] } : start);

  return compressed;
};

const serialize = data => {
  const serializedData = {};

  for (const [key, value] of Object.entries(data)) {
    const shortKey = keyMap[key] || key;

    if (Array.isArray(value)) {
      serializedData[shortKey] = ['channelURLs', 'projectChannelNames'].includes(key)
        ? value
        : value.map(v => typeof v === 'number' ? roundToFourDecimals(v) : serialize(v));
    } else if (typeof value === 'object' && value !== null) {
      serializedData[shortKey] = key === 'projectSequences'
        ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
            const shortSeqKey = seqKey.replace('Sequence', 's');
            const filteredChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
              if (chValue.steps?.length) {
                chAcc[chKey] = { st: compressSteps(chValue.steps) };
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
      const outputFilePath = path.join(outputDir, file);

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
