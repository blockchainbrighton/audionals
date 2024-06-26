// analyzeAndSerialize.js

const fs = require('fs');
const path = require('path');

/**
 * Ensure the directory exists; if not, create it.
 * @param {string} dirPath - Path to the directory.
 */
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Analyze and compress a JSON file, then decompress it to validate.
 * @param {string} inputFilePath - Path to the JSON file to analyze and compress.
 */
function analyzeAndProcessJsonFile(inputFilePath) {
    const baseDir = path.dirname(inputFilePath);
    const fileName = path.basename(inputFilePath, '.json');
    const outputConfigPath = path.join(baseDir, 'jsonAnalysisFiles', `${fileName}-config.json`);
    const compressedFilePath = path.join(baseDir, 'compressed', `${fileName}-compressed.json`);
    const decompressedDir = path.join(baseDir, 'decompressed');
    const decompressedFilePath = path.join(decompressedDir, `${fileName}-decompressed.json`);

    console.log(`Reading JSON file from: ${inputFilePath}`);
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing JSON file:', parseErr);
            return;
        }

        console.log('Analyzing JSON data...');
        const analysisResult = analyzeObject(jsonData, '');

        const config = {
            file: inputFilePath,
            traits: analysisResult,
        };

        // Ensure the directories for the output files exist
        ensureDirectoryExistence(path.dirname(outputConfigPath));
        ensureDirectoryExistence(path.dirname(compressedFilePath));
        ensureDirectoryExistence(decompressedDir);

        console.log('Writing configuration file...');
        fs.writeFile(outputConfigPath, JSON.stringify(config, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing configuration file:', writeErr);
            } else {
                console.log('Configuration file saved to', outputConfigPath);
            }
        });

        console.log('Serializing (compressing) JSON data...');
        const serializedData = serializeSettings(jsonData, analysisResult);

        console.log('Writing compressed JSON file...');
        fs.writeFile(compressedFilePath, JSON.stringify(serializedData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing compressed file:', writeErr);
            } else {
                console.log('Compressed JSON file saved to', compressedFilePath);

                // Deserialize the compressed data
                console.log('Deserializing JSON data...');
                const deserializedData = deserializeSettings(serializedData);

                console.log('Writing decompressed JSON file...');
                fs.writeFile(decompressedFilePath, JSON.stringify(deserializedData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing decompressed file:', writeErr);
                    } else {
                        console.log('Decompressed JSON file saved to', decompressedFilePath);
                    }
                });
            }
        });
    });
}

/**
 * Recursively analyze a JSON object to find serialization traits.
 * @param {Object} obj - JSON object to analyze.
 * @param {string} path - Current path within the JSON structure.
 * @returns {Object} Analysis results.
 */
function analyzeObject(obj, path) {
    const result = {};

    if (Array.isArray(obj)) {
        result[path] = {
            type: 'array',
            length: obj.length,
            large: obj.length > 10 // Threshold for large arrays
        };
        obj.slice(0, 3).forEach((item, index) => { // Analyze first 3 items
            const itemPath = path ? `${path}[${index}]` : `[${index}]`;
            Object.assign(result, analyzeObject(item, itemPath));
        });
    } else if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj);
        result[path] = {
            type: 'object',
            keys: keys.length,
            deep: path.split('.').length > 3 // Threshold for deep nesting
        };
        keys.slice(0, 3).forEach(key => { // Analyze first 3 keys
            const valuePath = path ? `${path}.${key}` : key;
            Object.assign(result, analyzeObject(obj[key], valuePath));
        });
    } else {
        result[path] = {
            type: typeof obj
        };
    }

    return result;
}

/**
 * Serialize the settings object to a compressed format based on traits.
 * @param {Object} settings - The settings object to serialize.
 * @param {Object} traits - Analysis traits of the settings.
 * @returns {Object} Serialized settings.
 */
function serializeSettings(settings, traits) {
    const serialized = {};

    // Ensure required properties exist before accessing them
    serialized.pn = settings.projectName || '';
    serialized.bpm = settings.bpm || 0;
    serialized.ch = settings.channelURLs ? settings.channelURLs.length : 0;
    serialized.cu = settings.channelURLs ? settings.channelURLs.map(url => encodeURIComponent(url)) : [];

    serialized.ts = settings.trimTimes || {};
    serialized.vol = settings.channelVolume || [];
    serialized.ps = settings.channelPlaybackSpeed || [];

    // Ensure sequences exist and handle them
    if (settings.sequences) {
        serialized.seq = Object.entries(settings.sequences).reduce((acc, [key, value]) => {
            const seqTraits = traits[`sequences.${key}`] || {};
            acc[key] = {
                n: seqTraits.large ? compressArray(value.normalSteps) : value.normalSteps,
                r: seqTraits.large ? compressArray(value.reverseSteps) : value.reverseSteps
            };
            return acc;
        }, {});
    } else {
        serialized.seq = {};
    }

    return serialized;
}

/**
 * Compress large arrays to a summary.
 * @param {Array} array - Array to compress.
 * @returns {Array} Compressed array or summary.
 */
function compressArray(array) {
    return array.length > 10 ? array.slice(0, 5).concat(['...']) : array;
}

/**
 * Deserialize the settings object back to the original format.
 * @param {Object} serialized - The serialized settings object.
 * @returns {Object} Deserialized settings.
 */
function deserializeSettings(serialized) {
    const settings = {};

    settings.projectName = serialized.pn || '';
    settings.bpm = serialized.bpm || 0;
    settings.channelURLs = serialized.cu ? serialized.cu.map(url => decodeURIComponent(url)) : [];

    settings.trimTimes = serialized.ts || {};
    settings.channelVolume = serialized.vol || [];
    settings.channelPlaybackSpeed = serialized.ps || [];

    settings.sequences = Object.entries(serialized.seq).reduce((acc, [key, value]) => {
        acc[key] = {
            normalSteps: decompressArray(value.n),
            reverseSteps: decompressArray(value.r)
        };
        return acc;
    }, {});

    return settings;
}

/**
 * Decompress summarized arrays.
 * @param {Array} array - Array to decompress.
 * @returns {Array} Decompressed array.
 */
function decompressArray(array) {
    return array.includes('...') ? array.slice(0, -1) : array;
}

/**
 * Check folders and process files accordingly.
 */
function checkAndProcessFiles() {
    const baseDir = path.dirname(__filename);
    const jsonAnalysisDir = path.join(baseDir, 'jsonAnalysisFiles');
    const compressedDir = path.join(baseDir, 'compressed');
    const decompressedDir = path.join(baseDir, 'decompressed');

    // Ensure directories exist
    ensureDirectoryExistence(jsonAnalysisDir);
    ensureDirectoryExistence(compressedDir);
    ensureDirectoryExistence(decompressedDir);

    // Process files in jsonAnalysisFiles for compression
    fs.readdir(jsonAnalysisDir, (err, files) => {
        if (err) {
            console.error('Error reading jsonAnalysisFiles directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(jsonAnalysisDir, file);
            if (path.extname(file) === '.json') {
                console.log(`Processing file for compression: ${file}`);
                analyzeAndProcessJsonFile(filePath);
            }
        });
    });

    // Process files in compressed for decompression
    fs.readdir(compressedDir, (err, files) => {
        if (err) {
            console.error('Error reading compressed directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(compressedDir, file);
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading compressed file ${file}:`, err);
                    return;
                }

                let serializedData;
                try {
                    serializedData = JSON.parse(data);
                } catch (parseErr) {
                    console.error(`Error parsing compressed file ${file}:`, parseErr);
                    return;
                }

                console.log(`Decompressing file: ${file}`);
                const deserializedData = deserializeSettings(serializedData);

                const outputFilePath = path.join(decompressedDir, file.replace('-compressed', '-decompressed'));
                fs.writeFile(outputFilePath, JSON.stringify(deserializedData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error(`Error writing decompressed file ${file}:`, writeErr);
                    } else {
                        console.log(`Decompressed JSON file saved to: ${outputFilePath}`);
                    }
                });
            });
        });
    });
}

// Run the check and process files
checkAndProcessFiles();

module.exports = { analyzeAndProcessJsonFile, analyzeObject, serializeSettings, deserializeSettings, compressArray, decompressArray, checkAndProcessFiles };
