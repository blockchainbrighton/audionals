Here's a detailed and comprehensive README file explaining the serialization process. This document outlines every element involved in the serialization to aid in building a deserialization process that ensures the output document matches the original exactly.

---

# **Serialization Process for Project Data**

## **Overview**

This project involves serializing and compressing project data stored in JSON files. The primary goal is to convert the data into a more compact format while preserving its structure and content. The serialization process includes compressing steps, deduplicating patterns, and mapping data into a format suitable for efficient storage and retrieval.

This document describes each component and process in detail to aid in creating a corresponding deserialization process that reconstructs the original document accurately.

---

## **File Structure**

- **Key Mapping (`keyMap`)**: Maps numerical indices to descriptive string keys.
- **Channel Mapping (`channelMap`)**: Maps channel numbers to alphabetical letters.
- **Serialization Functions**: Processes to serialize data including deduplication and step compression.
- **Sequence Analysis**: Analyzes project sequences to extract summary information.

---

## **Key Mappings**

### **Numerical Key Mapping**

**Purpose**: Convert numerical keys to descriptive strings for easier understanding and reverse the mapping during serialization.

```javascript
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
```

### **Channel Mapping**

**Purpose**: Convert channel indices to letters for compact representation and reverse the mapping.

```javascript
const channelMap = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [letter, i]));
```

---

## **Functions**

### **Rounding to Four Decimals**

**Purpose**: Standardize numerical values to four decimal places.

```javascript
const roundToFourDecimals = num => Math.round(num * 10000) / 10000;
```

### **Compressing Steps**

**Purpose**: Convert step sequences into a compact range format for efficiency.

**Logic**:
- Iterate over the `steps` array.
- Group consecutive numbers into ranges.
- Handle step objects with `index` and `reverse` properties.

```javascript
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
```

### **Serializing and Deduplicating Patterns**

**Purpose**: Convert project data into a serialized format while eliminating duplicate patterns.

**Logic**:
- Use `reverseKeyMap` to shorten keys.
- Deduplicate step patterns using a `Map` to store unique patterns and assign them IDs.
- Serialize arrays and objects while handling special cases for URLs and channel names.

```javascript
const serializeAndDeduplicatePatterns = data => {
  const serializedData = {};
  const patternMap = new Map();
  let patternId = 0;

  const findOrAddPattern = pattern => {
    const patternString = JSON.stringify(pattern);
    if (patternMap.has(patternString)) {
      return patternMap.get(patternString);
    }
    const id = patternId++;
    patternMap.set(patternString, id);
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
          serialized[shortKey] = value;
        } else if (key === 'projectChannelNames') {
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
  return {
    serializedContent,
    patternMap: Object.fromEntries([...patternMap].map(([pattern, id]) => [id, JSON.parse(pattern)]))
  };
};
```

### **Analyzing Sequences**

**Purpose**: Extract summary information from project sequences for diagnostics.

**Logic**:
- Iterate through sequences and channels.
- Count total sequences, channels, and steps.

```javascript
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
```

---

## **File Processing**

### **Main Function**

**Purpose**: Read, serialize, and write project files, including compressing the output.

**Logic**:
- Create output directory if it doesn't exist.
- Read JSON files from the input directory.
- Serialize each file's content and write serialized data to the output directory.
- Write the pattern map and compress the serialized data.

```javascript
const processFiles = (inputDir, outputDir) => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  fs.readdir(inputDir, (err, files) => {
    if (err) return console.error('Error reading input directory:', err);

    files.filter(file => path.extname(file) === '.json').forEach(file => {
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
            if (err) return console.error('Error writing output

 file:', err);

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
};

const inputDir = __dirname; // Enclosing folder
const outputDir = path.join(__dirname, 'serializedFiles');

processFiles(inputDir, outputDir);
```

---

## **Deserialization**

To accurately deserialize the data:

1. **Read and Decompress**: Read the compressed file and decompress it using `zlib`.
2. **Rebuild JSON**: Use the pattern map to replace pattern IDs with their original patterns.
3. **Reverse Serialization**: Convert serialized short keys back to their original keys using `keyMap`.
4. **Reconstruct Arrays and Objects**: Ensure arrays and objects match their original structure.

### Example Deserialization Steps:

1. **Load Compressed Data**: Read and decompress the `.gz` file.
2. **Parse Pattern Map**: Load the pattern map from the JSON file.
3. **Replace Patterns**: Replace pattern IDs in the serialized content with their corresponding patterns from the map.
4. **Reverse Key Mapping**: Convert shortened keys to their full descriptive counterparts.

---

## **Conclusion**

This README provides a comprehensive guide to the serialization process, including key mappings, function logic, and file processing. Follow these guidelines to build a deserialization process that reconstructs the original JSON documents accurately.

If you have any questions or need further clarification, please refer to the code comments or contact the project maintainers.

--- 

This detailed explanation should give you a clear understanding of the serialization process and assist in building a precise deserialization process.