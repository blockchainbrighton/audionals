#!/usr/bin/env node

/**
 * Bundle Size Check Script
 * Validates that the total compressed payload is ≤ 35 kB
 */

import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Files to include in size calculation
const sourceFiles = [
    'modules/sequencer-main.js',
    'modules/sequencer-config.js',
    'modules/sequencer-state.js',
    'modules/sequencer-ui.js',
    'modules/sequencer-audio-time-scheduling.js',
    'modules/sequencer-sampler-playback.js',
    'modules/sequencer-sample-loader.js',
    'modules/sequencer-instrument.js',
    'modules/sequencer-save-load.js',
    'modules/sequencer-state-probe.js',
    'modules/sequencer-styles.css',
    'sequencer.html'
];

const improvedFiles = [
    'src/sequencer-main.js',
    'src/sequencer-state.js',
    'src/sequencer-audio-time-scheduling.js',
    'src/sequencer-sampler-playback.js',
    'src/sequencer-plugin-api.js'
];

/**
 * Calculate file sizes and compression ratios
 */
function calculateSizes(files, basePath = '') {
    let totalUncompressed = 0;
    let totalCompressed = 0;
    const fileDetails = [];

    for (const file of files) {
        try {
            const filePath = join(projectRoot, basePath, file);
            const content = readFileSync(filePath, 'utf8');
            const uncompressed = Buffer.byteLength(content, 'utf8');
            const compressed = gzipSync(content).length;
            
            totalUncompressed += uncompressed;
            totalCompressed += compressed;
            
            fileDetails.push({
                file,
                uncompressed,
                compressed,
                ratio: ((1 - compressed / uncompressed) * 100).toFixed(1)
            });
        } catch (error) {
            console.warn(`⚠️  Could not read ${file}: ${error.message}`);
        }
    }

    return {
        totalUncompressed,
        totalCompressed,
        fileDetails,
        overallRatio: ((1 - totalCompressed / totalUncompressed) * 100).toFixed(1)
    };
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Display size analysis
 */
function displaySizeAnalysis(title, analysis) {
    console.log(`\n📦 ${title}`);
    console.log('─'.repeat(60));
    
    // File details
    analysis.fileDetails.forEach(({ file, uncompressed, compressed, ratio }) => {
        const status = compressed > 10240 ? '⚠️ ' : '✅'; // Warn if > 10KB compressed
        console.log(`${status} ${file.padEnd(35)} ${formatBytes(compressed).padStart(8)} (${ratio}% compression)`);
    });
    
    console.log('─'.repeat(60));
    console.log(`📊 Total Uncompressed: ${formatBytes(analysis.totalUncompressed)}`);
    console.log(`📦 Total Compressed:   ${formatBytes(analysis.totalCompressed)} (${analysis.overallRatio}% compression)`);
    
    return analysis.totalCompressed;
}

/**
 * Main size check function
 */
function checkBundleSize() {
    console.log('🔍 Bundle Size Analysis');
    console.log('═'.repeat(60));
    
    // Analyze original files
    const originalAnalysis = calculateSizes(sourceFiles);
    const originalSize = displaySizeAnalysis('ORIGINAL FILES', originalAnalysis);
    
    // Analyze improved files
    const improvedAnalysis = calculateSizes(improvedFiles);
    const improvedSize = displaySizeAnalysis('IMPROVED FILES', improvedAnalysis);
    
    // Calculate combined size (original files not replaced + improved files)
    const unchangedFiles = sourceFiles.filter(file => 
        !improvedFiles.some(improved => improved.includes(file.split('/').pop()))
    );
    const unchangedAnalysis = calculateSizes(unchangedFiles);
    const combinedSize = unchangedAnalysis.totalCompressed + improvedSize;
    
    console.log(`\n🎯 COMBINED SIZE ANALYSIS`);
    console.log('═'.repeat(60));
    console.log(`Original Bundle:     ${formatBytes(originalSize)}`);
    console.log(`Improved Bundle:     ${formatBytes(combinedSize)}`);
    console.log(`Size Difference:     ${formatBytes(combinedSize - originalSize)} (${((combinedSize - originalSize) / originalSize * 100).toFixed(1)}%)`);
    
    // Check against target
    const targetSize = 35 * 1024; // 35 KB
    const withinTarget = combinedSize <= targetSize;
    
    console.log(`\n📏 SIZE TARGET VALIDATION`);
    console.log('═'.repeat(60));
    console.log(`Target Size:         ${formatBytes(targetSize)}`);
    console.log(`Actual Size:         ${formatBytes(combinedSize)}`);
    console.log(`Remaining Budget:    ${formatBytes(targetSize - combinedSize)}`);
    console.log(`Status:              ${withinTarget ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!withinTarget) {
        console.log(`\n⚠️  RECOMMENDATIONS:`);
        console.log(`   • Remove unused code and comments`);
        console.log(`   • Minify JavaScript and CSS`);
        console.log(`   • Consider code splitting for non-critical features`);
        console.log(`   • Use shorter variable names in production`);
        
        const overage = combinedSize - targetSize;
        console.log(`   • Need to reduce size by ${formatBytes(overage)} (${(overage / combinedSize * 100).toFixed(1)}%)`);
    }
    
    // Performance insights
    console.log(`\n⚡ PERFORMANCE INSIGHTS`);
    console.log('═'.repeat(60));
    console.log(`Gzip Compression:    ${originalAnalysis.overallRatio}% (original) / ${improvedAnalysis.overallRatio}% (improved)`);
    console.log(`Load Time (3G):      ~${Math.ceil(combinedSize / (50 * 1024))} seconds`);
    console.log(`Load Time (4G):      ~${Math.ceil(combinedSize / (100 * 1024))} seconds`);
    console.log(`Parse Time:          ~${Math.ceil(combinedSize / (1024 * 1024))} ms (estimated)`);
    
    // File-specific recommendations
    const largeFiles = [...originalAnalysis.fileDetails, ...improvedAnalysis.fileDetails]
        .filter(f => f.compressed > 5120) // > 5KB
        .sort((a, b) => b.compressed - a.compressed);
    
    if (largeFiles.length > 0) {
        console.log(`\n📋 LARGEST FILES (>5KB compressed):`);
        largeFiles.forEach(({ file, compressed }) => {
            console.log(`   • ${file}: ${formatBytes(compressed)}`);
        });
    }
    
    return withinTarget;
}

// Export for programmatic use
export { checkBundleSize, calculateSizes, formatBytes };

// Run check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = checkBundleSize();
    process.exit(success ? 0 : 1);
}

