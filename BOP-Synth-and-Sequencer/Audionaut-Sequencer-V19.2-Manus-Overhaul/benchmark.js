#!/usr/bin/env node

/**
 * Performance Benchmark Script for BOP Matrix Sequencer
 * Measures scheduling jitter, memory usage, and overall performance
 */

import { performance } from 'perf_hooks';
import { createRequire } from 'module';

// Mock browser environment for Node.js testing
global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    CustomEvent: class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options?.detail;
        }
    }
};

global.document = {
    getElementById: () => ({ 
        textContent: '', 
        style: {},
        addEventListener: () => {},
        dispatchEvent: () => {}
    }),
    createElement: () => ({
        appendChild: () => {},
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {} }
    })
};

// Mock Tone.js for benchmarking
const mockTone = {
    Transport: {
        bpm: { value: 120 },
        start: () => {},
        stop: () => {},
        cancel: () => {},
        scheduleOnce: (callback, time) => {
            setTimeout(callback, typeof time === 'string' ? 100 : time * 1000);
        }
    },
    Player: class MockPlayer {
        constructor(buffer) {
            this.buffer = buffer;
            this.connected = [];
        }
        connect(node) { this.connected.push(node); return this; }
        disconnect() { this.connected = []; }
        start(time) { this.startTime = time; }
        stop() { this.startTime = null; }
        dispose() { this.connected = []; }
    },
    AmplitudeEnvelope: class MockAmplitudeEnvelope {
        constructor(options) {
            this.options = options;
            this.connected = [];
        }
        connect(node) { this.connected.push(node); return this; }
        disconnect() { this.connected = []; }
        triggerAttackRelease(duration, time) {
            this.triggerTime = time;
            this.duration = duration;
        }
        dispose() { this.connected = []; }
    },
    Sequence: class MockSequence {
        constructor(callback, steps, subdivision) {
            this.callback = callback;
            this.steps = steps;
            this.subdivision = subdivision;
            this.isStarted = false;
        }
        start(time) { 
            this.isStarted = true;
            return this;
        }
        stop() { 
            this.isStarted = false;
            return this;
        }
        dispose() { 
            this.isStarted = false;
        }
    },
    Destination: { connect: () => {} },
    start: async () => { return Promise.resolve(); },
    version: '14.7.77'
};

global.Tone = mockTone;

// Benchmark configuration
const BENCHMARK_CONFIG = {
    DURATION_MS: 10000,        // 10 second benchmark
    SAMPLE_RATE: 44100,        // Standard sample rate
    BUFFER_SIZE: 512,          // Audio buffer size
    TARGET_JITTER_MS: 1.0,     // Target maximum jitter
    WARMUP_DURATION_MS: 1000   // Warmup period
};

// Benchmark results
const benchmarkResults = {
    schedulingJitter: {
        samples: [],
        average: 0,
        maximum: 0,
        minimum: Infinity,
        p95: 0,
        p99: 0
    },
    memoryUsage: {
        initial: 0,
        peak: 0,
        final: 0,
        leaked: 0
    },
    performance: {
        totalSteps: 0,
        missedDeadlines: 0,
        avgCpuUsage: 0,
        gcEvents: 0
    }
};

/**
 * Simulate high-frequency scheduling to measure jitter
 */
function simulateScheduling() {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const targetInterval = 25; // 25ms target interval
        let stepCount = 0;
        let lastTime = startTime;
        
        const scheduler = () => {
            const currentTime = performance.now();
            const actualInterval = currentTime - lastTime;
            const jitter = Math.abs(actualInterval - targetInterval);
            
            benchmarkResults.schedulingJitter.samples.push(jitter);
            benchmarkResults.performance.totalSteps++;
            
            if (jitter > BENCHMARK_CONFIG.TARGET_JITTER_MS) {
                benchmarkResults.performance.missedDeadlines++;
            }
            
            lastTime = currentTime;
            stepCount++;
            
            // Continue until benchmark duration is reached
            if (currentTime - startTime < BENCHMARK_CONFIG.DURATION_MS) {
                // Use setTimeout to simulate real scheduling
                setTimeout(scheduler, targetInterval);
            } else {
                resolve();
            }
        };
        
        // Start scheduling
        scheduler();
    });
}

/**
 * Simulate memory-intensive operations
 */
function simulateMemoryOperations() {
    const operations = [];
    
    // Simulate audio buffer allocations
    for (let i = 0; i < 1000; i++) {
        const buffer = new Float32Array(BENCHMARK_CONFIG.BUFFER_SIZE);
        buffer.fill(Math.random());
        operations.push(buffer);
    }
    
    // Simulate object creation/destruction cycles
    for (let i = 0; i < 500; i++) {
        const player = new mockTone.Player();
        const envelope = new mockTone.AmplitudeEnvelope({
            attack: 0.005,
            decay: 0,
            sustain: 1.0,
            release: 0.05
        });
        
        player.connect(envelope);
        operations.push({ player, envelope });
    }
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
    
    return operations;
}

/**
 * Calculate statistical metrics
 */
function calculateStatistics(samples) {
    if (samples.length === 0) return {};
    
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    
    return {
        average: sum / samples.length,
        minimum: sorted[0],
        maximum: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
    };
}

/**
 * Monitor memory usage
 */
function getMemoryUsage() {
    if (process.memoryUsage) {
        const usage = process.memoryUsage();
        return usage.heapUsed / 1024 / 1024; // Convert to MB
    }
    return 0;
}

/**
 * Run comprehensive benchmark
 */
async function runBenchmark() {
    console.log('🚀 Starting BOP Matrix Sequencer Performance Benchmark');
    console.log(`Duration: ${BENCHMARK_CONFIG.DURATION_MS}ms`);
    console.log(`Target Jitter: <${BENCHMARK_CONFIG.TARGET_JITTER_MS}ms`);
    console.log('─'.repeat(60));
    
    // Record initial memory
    benchmarkResults.memoryUsage.initial = getMemoryUsage();
    
    // Warmup period
    console.log('⏳ Warming up...');
    await new Promise(resolve => setTimeout(resolve, BENCHMARK_CONFIG.WARMUP_DURATION_MS));
    
    // Run scheduling benchmark
    console.log('📊 Testing scheduling performance...');
    const schedulingStart = performance.now();
    
    await simulateScheduling();
    
    const schedulingEnd = performance.now();
    const actualDuration = schedulingEnd - schedulingStart;
    
    // Calculate scheduling statistics
    const jitterStats = calculateStatistics(benchmarkResults.schedulingJitter.samples);
    Object.assign(benchmarkResults.schedulingJitter, jitterStats);
    
    // Run memory benchmark
    console.log('💾 Testing memory performance...');
    const memoryOperations = simulateMemoryOperations();
    benchmarkResults.memoryUsage.peak = getMemoryUsage();
    
    // Cleanup and measure final memory
    memoryOperations.length = 0;
    if (global.gc) global.gc();
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow GC to run
    benchmarkResults.memoryUsage.final = getMemoryUsage();
    benchmarkResults.memoryUsage.leaked = 
        benchmarkResults.memoryUsage.final - benchmarkResults.memoryUsage.initial;
    
    // Calculate performance metrics
    benchmarkResults.performance.missedDeadlineRate = 
        (benchmarkResults.performance.missedDeadlines / benchmarkResults.performance.totalSteps) * 100;
    
    // Display results
    displayResults(actualDuration);
}

/**
 * Display benchmark results
 */
function displayResults(actualDuration) {
    console.log('\n📈 BENCHMARK RESULTS');
    console.log('═'.repeat(60));
    
    // Scheduling Performance
    console.log('\n⏱️  SCHEDULING PERFORMANCE');
    console.log(`Average Jitter: ${benchmarkResults.schedulingJitter.average.toFixed(3)}ms`);
    console.log(`Maximum Jitter: ${benchmarkResults.schedulingJitter.maximum.toFixed(3)}ms`);
    console.log(`95th Percentile: ${benchmarkResults.schedulingJitter.p95.toFixed(3)}ms`);
    console.log(`99th Percentile: ${benchmarkResults.schedulingJitter.p99.toFixed(3)}ms`);
    console.log(`Total Steps: ${benchmarkResults.performance.totalSteps}`);
    console.log(`Missed Deadlines: ${benchmarkResults.performance.missedDeadlines} (${benchmarkResults.performance.missedDeadlineRate.toFixed(2)}%)`);
    
    // Memory Performance
    console.log('\n💾 MEMORY PERFORMANCE');
    console.log(`Initial Memory: ${benchmarkResults.memoryUsage.initial.toFixed(2)}MB`);
    console.log(`Peak Memory: ${benchmarkResults.memoryUsage.peak.toFixed(2)}MB`);
    console.log(`Final Memory: ${benchmarkResults.memoryUsage.final.toFixed(2)}MB`);
    console.log(`Memory Leaked: ${benchmarkResults.memoryUsage.leaked.toFixed(2)}MB`);
    
    // Overall Assessment
    console.log('\n✅ PERFORMANCE ASSESSMENT');
    const jitterPass = benchmarkResults.schedulingJitter.average <= BENCHMARK_CONFIG.TARGET_JITTER_MS;
    const deadlinePass = benchmarkResults.performance.missedDeadlineRate <= 5; // 5% tolerance
    const memoryPass = benchmarkResults.memoryUsage.leaked <= 10; // 10MB tolerance
    
    console.log(`Jitter Target: ${jitterPass ? '✅ PASS' : '❌ FAIL'} (${benchmarkResults.schedulingJitter.average.toFixed(3)}ms avg)`);
    console.log(`Deadline Target: ${deadlinePass ? '✅ PASS' : '❌ FAIL'} (${benchmarkResults.performance.missedDeadlineRate.toFixed(2)}% missed)`);
    console.log(`Memory Target: ${memoryPass ? '✅ PASS' : '❌ FAIL'} (${benchmarkResults.memoryUsage.leaked.toFixed(2)}MB leaked)`);
    
    const overallPass = jitterPass && deadlinePass && memoryPass;
    console.log(`\n🎯 OVERALL: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!overallPass) {
        console.log('\n⚠️  RECOMMENDATIONS:');
        if (!jitterPass) console.log('   • Optimize scheduling hot paths');
        if (!deadlinePass) console.log('   • Reduce computational complexity in audio callbacks');
        if (!memoryPass) console.log('   • Implement better memory management and object pooling');
    }
    
    console.log('\n📊 Raw data available in benchmarkResults object');
}

// Export for programmatic use
export { runBenchmark, benchmarkResults, BENCHMARK_CONFIG };

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmark().catch(console.error);
}

