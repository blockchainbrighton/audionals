// jsonAnalysis.js

const fs = require('fs');
const path = require('path');

/**
 * Analyze a JSON file and generate a configuration file.
 * @param {string} inputFilePath - Path to the JSON file to analyze.
 * @param {string} outputFilePath - Path to save the generated configuration file.
 */
function analyzeJsonFile(inputFilePath, outputFilePath) {
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

        const analysisResult = analyzeObject(jsonData, '');

        const config = {
            file: inputFilePath,
            analyzedTraits: analysisResult,
        };

        fs.writeFile(outputFilePath, JSON.stringify(config, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing configuration file:', writeErr);
            } else {
                console.log('Configuration file saved to', outputFilePath);
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
        };
        obj.forEach((item, index) => {
            const itemPath = path ? `${path}[${index}]` : `[${index}]`;
            Object.assign(result, analyzeObject(item, itemPath));
        });
    } else if (typeof obj === 'object' && obj !== null) {
        result[path] = {
            type: 'object',
            keys: Object.keys(obj),
        };
        Object.entries(obj).forEach(([key, value]) => {
            const valuePath = path ? `${path}.${key}` : key;
            Object.assign(result, analyzeObject(value, valuePath));
        });
    } else {
        result[path] = {
            type: typeof obj,
            value: obj,
        };
    }

    return result;
}

// Example usage
const inputFilePath = 'TRUTH.json'; // Your JSON file path
const outputFilePath = 'jsonAnalysisFiles/config.json'; // Desired output file path
analyzeJsonFile(inputFilePath, outputFilePath);

module.exports = { analyzeJsonFile, analyzeObject };
