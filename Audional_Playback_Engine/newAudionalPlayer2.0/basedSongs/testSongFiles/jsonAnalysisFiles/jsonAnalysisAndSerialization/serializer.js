// serializer.js
const fs = require('fs');
const path = require('path');

// Mapping for key shortening
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

// Helper function to round numbers
const roundToFourDecimals = (num) => Math.round(num * 10000) / 10000;

// Helper function to compress steps including reverse steps
const compressSteps = (steps) => {
  if (steps.length === 0) return [];

  const compressed = [];
  let start = null;
  let end = null;
  let inRange = false;

  steps.forEach((step, index) => {
    if (typeof step === 'number') {
      if (start === null) {
        start = step;
        end = step;
      } else if (step === end + 1) {
        end = step;
        inRange = true;
      } else {
        if (inRange) {
          compressed.push({ range: [start, end] });
        } else {
          compressed.push(start);
        }
        start = step;
        end = step;
        inRange = false;
      }
    } else if (step.index !== undefined && step.reverse === true) {
      if (start !== null) {
        if (inRange) {
          compressed.push({ range: [start, end] });
        } else {
          compressed.push(start);
        }
        start = null;
        end = null;
        inRange = false;
      }
      compressed.push(`${step.index}r`);
    }
  });

  if (start !== null) {
    if (inRange) {
      compressed.push({ range: [start, end] });
    } else {
      compressed.push(start);
    }
  }

  return compressed;
};

// Serialize JSON
const serialize = (data) => {
  const serializedData = {};

  for (const [key, value] of Object.entries(data)) {
    const shortKey = keyMap[key] || key;

    if (Array.isArray(value)) {
      if (['channelURLs', 'projectChannelNames'].includes(key)) {
        serializedData[shortKey] = value;
      } else {
        serializedData[shortKey] = value.map((v) => typeof v === 'number' ? roundToFourDecimals(v) : serialize(v));
      }
    } else if (typeof value === 'object' && value !== null) {
      if (key === 'projectSequences') {
        const serializedSequences = {};
        for (const [seqKey, channels] of Object.entries(value)) {
          const shortSeqKey = seqKey.replace('Sequence', 's');
          const filteredChannels = {};
          for (const [chKey, chValue] of Object.entries(channels)) {
            if (chValue.steps && chValue.steps.length > 0) {
              filteredChannels[chKey] = {
                st: compressSteps(chValue.steps)
              };
            }
          }
          if (Object.keys(filteredChannels).length > 0) {
            serializedSequences[shortSeqKey] = filteredChannels;
          }
        }
        serializedData[shortKey] = serializedSequences;
      } else {
        serializedData[shortKey] = serialize(value);
      }
    } else if (typeof value === 'number') {
      serializedData[shortKey] = roundToFourDecimals(value);
    } else {
      serializedData[shortKey] = value;
    }
  }

  return serializedData;
};

// Analyze sequence data
const analyzeSequences = (data) => {
  const analysis = {
    totalSequences: 0,
    totalChannels: 0,
    totalSteps: 0,
    sequences: {}
  };

  const sequences = data.projectSequences || data.pS;
  for (const [seqKey, channels] of Object.entries(sequences)) {
    const seqAnalysis = {
      totalChannels: 0,
      totalSteps: 0,
      channels: {}
    };

    for (const [chKey, chValue] of Object.entries(channels)) {
      if (chValue && Array.isArray(chValue.steps) && chValue.steps.length > 0) {
        const numSteps = chValue.steps.length;
        seqAnalysis.totalChannels++;
        seqAnalysis.totalSteps += numSteps;
        analysis.totalSteps += numSteps;
        seqAnalysis.channels[chKey] = {
          totalSteps: numSteps,
          activeSteps: chValue.steps
        };
      }
    }

    if (seqAnalysis.totalChannels > 0) {
      analysis.totalSequences++;
      analysis.totalChannels += seqAnalysis.totalChannels;
      analysis.sequences[seqKey] = seqAnalysis;
    }
  }

  return analysis;
};

// Read the input JSON file
const inputFilePath = path.join(__dirname, 'TRUTH.json');
const outputDir = path.join(__dirname, 'serializedFiles');
const outputFilePath = path.join(outputDir, 'TRUTH_serialized.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading input file:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);
    const serializedData = serialize(jsonData);
    const sequenceAnalysis = analyzeSequences(jsonData);

    // Log the sequence analysis
    console.log('Sequence Analysis:', JSON.stringify(sequenceAnalysis, null, 2));

    // Write the serialized data to a new file
    fs.writeFile(outputFilePath, JSON.stringify(serializedData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing output file:', err);
        return;
      }

      console.log('Serialized data saved to', outputFilePath);
    });
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});
