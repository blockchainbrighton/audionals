// deserializer.js
const fs = require('fs');
const path = require('path');

// Reverse mapping for deserialization
const reverseKeyMap = {
  pN: 'projectName',
  aN: 'artistName',
  pB: 'projectBPM',
  cS: 'currentSequence',
  cU: 'channelURLs',
  cV: 'channelVolume',
  cP: 'channelPlaybackSpeed',
  tS: 'trimSettings',
  pCN: 'projectChannelNames',
  sS: 'startSliderValue',
  eS: 'endSliderValue',
  tD: 'totalSampleDuration',
  st: 'steps',
  en: 'end',
  pS: 'projectSequences'
};

// Helper function to expand compressed steps
const expandSteps = (compressedSteps) => {
  const steps = [];
  for (const entry of compressedSteps) {
    if (typeof entry === 'number') {
      steps.push(entry);
    } else if (typeof entry === 'string' && entry.endsWith('r')) {
      const index = parseInt(entry.slice(0, -1), 10);
      steps.push({ index, reverse: true });
    } else if (entry.range) {
      const [start, end] = entry.range;
      for (let i = start; i <= end; i++) {
        steps.push(i);
      }
    }
  }
  return steps;
};

// Deserialize JSON
const deserialize = (data) => {
  const deserializedData = {};

  for (const [key, value] of Object.entries(data)) {
    const longKey = reverseKeyMap[key] || key;

    if (Array.isArray(value)) {
      deserializedData[longKey] = value.map(v => typeof v === 'object' ? deserialize(v) : v);
    } else if (typeof value === 'object' && value !== null) {
      if (key === 'pS') {
        const deserializedSequences = {};
        for (const [seqKey, channels] of Object.entries(value)) {
          const longSeqKey = seqKey.replace('s', 'Sequence');
          const deserializedChannels = {};
          for (const [chKey, chValue] of Object.entries(channels)) {
            if (chValue.st) {
              deserializedChannels[chKey] = { steps: expandSteps(chValue.st) };
            }
          }
          deserializedSequences[longSeqKey] = deserializedChannels;
        }
        deserializedData[longKey] = deserializedSequences;
      } else {
        deserializedData[longKey] = deserialize(value);
      }
    } else {
      deserializedData[longKey] = value;
    }
  }

  return deserializedData;
};

// Read the serialized JSON file
const inputFilePath = path.join(__dirname, 'serializedFiles', 'TRUTH_serialized.json');
const outputFilePath = path.join(__dirname, 'deserializedFiles', 'TRUTH_deserialized.json');
const outputDir = path.dirname(outputFilePath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading input file:', err);
    return;
  }

  try {
    const serializedData = JSON.parse(data);
    const deserializedData = deserialize(serializedData);

    // Write the deserialized data to a new file
    fs.writeFile(outputFilePath, JSON.stringify(deserializedData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing output file:', err);
        return;
      }

      console.log('Deserialized data saved to', outputFilePath);
    });
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});
