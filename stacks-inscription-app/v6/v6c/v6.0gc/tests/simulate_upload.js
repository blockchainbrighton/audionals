
// Simulation of Upload Times based on transaction counts and latency

function simulateUpload(fileSizeBytes, chunkSize, latencyPerTxMs, concurrentBatches = 1) {
    const totalChunks = Math.ceil(fileSizeBytes / chunkSize);
    
    // Inscription Steps:
    // 1. Begin Inscription (1 tx)
    // 2. Upload Chunks (totalChunks txs)
    // 3. Seal Inscription (1 tx)
    
    // Note: The current app does sequential uploads (await one then next) to be safe.
    // It does not currently implement parallel batches for writes to avoid sequence issues with the wallet.
    
    const setupTx = 1;
    const sealTx = 1;
    const uploadTxs = totalChunks;
    const totalTx = setupTx + uploadTxs + sealTx;

    // Time Calculation
    // Sequential: Total TX * Latency
    const sequentialTimeMs = totalTx * latencyPerTxMs;

    // Parallel (Theoretical): If we could fire 'concurrentBatches' txs at once
    // (Stacks wallets often queue these, but block inclusion is the real bottleneck)
    // For "Safe Mode" (wait for anchor block), latency is ~10 minutes (600,000ms) per tx!
    // For "Mempool Mode" (wait for acceptance), latency is ~2-5 seconds.
    
    const batchTimeMs = (Math.ceil(uploadTxs / concurrentBatches) * latencyPerTxMs) + ((setupTx + sealTx) * latencyPerTxMs);

    return {
        fileSizeMB: (fileSizeBytes / 1024 / 1024).toFixed(2),
        chunkSize,
        totalChunks,
        totalTx,
        latencyPerTxMs,
        estimatedTimeSeconds: (sequentialTimeMs / 1000).toFixed(1),
        estimatedTimeMinutes: (sequentialTimeMs / 1000 / 60).toFixed(2)
    };
}

console.log("--- Upload Simulation Report ---");
console.log("Scenario A: Fast Mode (Mempool acceptance ~3s/tx)");
const fastLatency = 3000;

console.table([
    simulateUpload(100 * 1024, 8192, fastLatency),       // 100KB
    simulateUpload(1024 * 1024, 8192, fastLatency),      // 1MB
    simulateUpload(1024 * 1024, 16384, fastLatency),     // 1MB (Larger Chunks)
    simulateUpload(5 * 1024 * 1024, 8192, fastLatency),  // 5MB
]);

console.log("\nScenario B: Safe Mode (Block Confirmation ~10m/tx)");
// This shows why Safe Mode is impossible for large files without massive patience
const safeLatency = 600 * 1000; 

console.table([
    simulateUpload(50 * 1024, 8192, safeLatency),        // 50KB
]);

console.log("\nScenario C: Optimized Batching (Theoretical 5 Concurrent Txs)");
// If we could blast 5 txs at once and the wallet handled it.
const parallelLatency = 3000;

console.log("Comparing 1MB upload:");
console.log("Sequential (8KB chunks):", simulateUpload(1024 * 1024, 8192, parallelLatency).estimatedTimeMinutes, "min");
console.log("Parallel x5 (8KB chunks):", simulateUpload(1024 * 1024, 8192, parallelLatency, 5).estimatedTimeMinutes, "min (Theoretical)");
console.log("Sequential (16KB chunks):", simulateUpload(1024 * 1024, 16384, parallelLatency).estimatedTimeMinutes, "min");


