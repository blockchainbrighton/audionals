const fs = require('fs').promises;
const zlib = require('zlib');
const util = require('util');
const path = require('path');

const gunzip = util.promisify(zlib.gunzip);

// Key mappings (same as in serialization)
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

// Channel mappings
const channelMap = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [letter, i]));

// Utility function to decompress step ranges
const decompressSteps = (steps) => {
  const decompressed = [];
  steps.forEach(step => {
    if (typeof step === 'number') {
      decompressed.push(step);
    } else if (typeof step === 'string' && step.endsWith('r')) {
      decompressed.push({ index: parseInt(step), reverse: true });
    } else if (step.r) {
      const [start, end] = step.r;
      for (let i = start; i <= end; i++) {
        decompressed.push(i);
      }
    }
  });
  return decompressed;
};

// Utility function to reverse the key mapping
const reverseMapping = (data, map) => {
  return Object.keys(data).reduce((acc, key) => {
    const originalKey = keyMap[key] || key;
    acc[originalKey] = data[key];
    return acc;
  }, {});
};

// Utility function to reverse the channel mapping
const reverseChannelMapping = (data) => {
  return Object.keys(data).reduce((acc, key) => {
    const originalKey = reverseChannelMap[key] !== undefined ? reverseChannelMap[key] : key;
    acc[originalKey] = data[key];
    return acc;
  }, {});
};

// Function to reconstruct the original data structure
const reconstructData = (data, patternMap, isSteps = false) => {
  if (isSteps) {
    return decompressSteps(patternMap[data]);
  }

  const reconstructed = {};
  for (const [key, value] of Object.entries(data)) {
    const originalKey = keyMap[key] || key;

    if (Array.isArray(value)) {
      if (originalKey === 'channelURLs') {
        reconstructed[originalKey] = value;
      } else if (originalKey === 'projectChannelNames') {
        reconstructed[originalKey] = value.map(v => reverseChannelMap[v] ?? v);
      } else {
        reconstructed[originalKey] = value.map(v => {
          return typeof v === 'number' ? v : reconstructData(v, patternMap, originalKey === 'steps');
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      reconstructed[originalKey] = originalKey === 'projectSequences'
        ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
            const originalSeqKey = `Sequence${seqKey.slice(1)}`;
            const originalChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
              const originalChKey = reverseChannelMap[chKey] !== undefined ? reverseChannelMap[chKey] : chKey;
              if (chValue.steps) {
                chAcc[originalChKey] = {
                  steps: reconstructData(chValue.steps, patternMap, true)
                };
              }
              return chAcc;
            }, {});
            acc[originalSeqKey] = originalChannels;
            return acc;
          }, {})
        : reconstructData(value, patternMap);
    } else {
      reconstructed[originalKey] = value;
    }
  }
  return reconstructed;
};

// Function to load and decompress serialized data
const loadSerializedData = async (serializedFilePath, patternMapFilePath) => {
  const [compressedData, patternData] = await Promise.all([
    fs.readFile(serializedFilePath),
    fs.readFile(patternMapFilePath, 'utf8')
  ]);
  const decompressedData = await gunzip(compressedData);
  return {
    serializedContent: JSON.parse(decompressedData.toString()),
    patternMap: JSON.parse(patternData)
  };
};

// Main deserialization function
const deserialize = async (serializedFilePath, patternMapFilePath) => {
  const { serializedContent, patternMap } = await loadSerializedData(serializedFilePath, patternMapFilePath);
  return reconstructData(serializedContent, patternMap);
};

// Usage example
const main = async () => {
  try {
    const serializedFilePath = path.join(__dirname, 'serializedFiles', 'TRUTH_AUDX_17_serialized.json.gz');
    const patternMapFilePath = path.join(__dirname, 'serializedFiles', 'TRUTH_AUDX_17_patterns.json');

    const originalData = await deserialize(serializedFilePath, patternMapFilePath);
    console.log('Deserialized Data:', JSON.stringify(originalData, null, 2));
  } catch (err) {
    console.error('Error deserializing data:', err);
  }
};

main();
