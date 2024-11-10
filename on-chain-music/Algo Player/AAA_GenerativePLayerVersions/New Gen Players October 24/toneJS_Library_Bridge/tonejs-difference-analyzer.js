// tonejs-difference-analyzer.js

const fs = require('fs');
const diff = require('diff');

// Paths to the inscribed (on-chain) and latest Tone.js libraries
const INSCRIBED_FILE_PATH = 'path/to/inscribed/tone.js';
const LATEST_FILE_PATH = 'path/to/latest/tone.js';

// Load both files
const loadFile = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`Error loading file: ${filePath}`, error);
        process.exit(1);
    }
};

// Function to generate the patch file based on differences
const generatePatch = (inscribed, latest) => {
    const changes = diff.diffLines(inscribed, latest);
    const patch = changes.map((change, index) => {
        return {
            part: index,
            added: change.added || false,
            removed: change.removed || false,
            value: change.value.trim(),
        };
    });

    // Filter only the added/modified parts
    return patch.filter(part => part.added || part.removed);
};

// Function to write the patch to JSON
const writePatchToFile = (patch) => {
    const patchFilePath = './tonejs_patch.json';
    fs.writeFileSync(patchFilePath, JSON.stringify(patch, null, 2), 'utf-8');
    console.log(`Patch successfully written to ${patchFilePath}`);
};

// Main execution
const inscribedCode = loadFile(INSCRIBED_FILE_PATH);
const latestCode = loadFile(LATEST_FILE_PATH);
const patch = generatePatch(inscribedCode, latestCode);
writePatchToFile(patch);
