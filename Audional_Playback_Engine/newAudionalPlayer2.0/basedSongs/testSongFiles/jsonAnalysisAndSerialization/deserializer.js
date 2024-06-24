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

// Channel letter to number mapping
const channelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [letter, i]));

// Decompress steps function
const decompressSteps = compressedSteps => {
  const steps = [];

  compressedSteps.forEach(step => {
    if (typeof step === 'number') {
      steps.push(step);
    } else if (typeof step === 'object' && 'r' in step) {
      const [start, end] = step.r;
      for (let i = start; i <= end; i++) {
        steps.push(i);
      }
    } else if (typeof step === 'string' && step.endsWith('r')) {
      steps.push({ index: parseInt(step.slice(0, -1), 10), reverse: true });
    }
  });

  return steps;
};

// Deserialization function
const deserialize = serializedData => {
  const data = {};

  for (const [shortKey, value] of Object.entries(serializedData)) {
    const fullKey = keyMap[shortKey] ?? shortKey;

    if (Array.isArray(value)) {
      data[fullKey] = value.map(v => typeof v === 'object' ? deserialize(v) : v);
    } else if (typeof value === 'object' && value !== null) {
      data[fullKey] = fullKey === 'projectSequences'
        ? Object.entries(value).reduce((acc, [shortSeqKey, channels]) => {
            const seqKey = shortSeqKey.replace('s', 'Sequence');
            const expandedChannels = Object.entries(channels).reduce((chAcc, [letter, chValue]) => {
              const chKey = `ch${reverseChannelMap[letter]}`;
              chAcc[chKey] = { steps: decompressSteps(chValue[reverseKeyMap['steps']] || []) };
              return chAcc;
            }, {});
            acc[seqKey] = expandedChannels;
            return acc;
          }, {})
        : deserialize(value);
    } else {
      data[fullKey] = value;
    }
  }

  return data;
};

// Directory paths
const inputDir = path.join(__dirname, 'serializedFiles');
const outputDir = path.join(__dirname, 'deserializedFiles');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Decompress and deserialize each .gz file
fs.readdir(inputDir, (err, files) => {
  if (err) return console.error('Error reading input directory:', err);

  files.filter(file => path.extname(file) === '.gz')
    .forEach(file => {
      const inputFilePath = path.join(inputDir, file);
      const outputFilePath = path.join(outputDir, file.replace('.gz', '-deserialized.json'));

      const gunzip = zlib.createGunzip();
      const inputStream = fs.createReadStream(inputFilePath);
      const outputStream = fs.createWriteStream(outputFilePath);

      inputStream.pipe(gunzip).pipe(outputStream).on('finish', () => {
        fs.readFile(outputFilePath, 'utf8', (err, data) => {
          if (err) return console.error('Error reading decompressed file:', err);

          try {
            const serializedData = JSON.parse(data);
            const originalData = deserialize(serializedData);

            fs.writeFile(outputFilePath, JSON.stringify(originalData, null, 2), 'utf8', err => {
              if (err) return console.error('Error writing original JSON file:', err);
              console.log('Deserialized data saved to', outputFilePath);
            });
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        });
      });
    });
});
