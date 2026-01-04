# 📋 Project Roadmap & Evolution (gv4.1+)

This document outlines the strategic technical objectives and feature enhancements for the Stacks Inscription App. Following the modularization in v4.1, we are now positioned to tackle complex architectural improvements.

---

## ⚡ 1. Transaction Efficiency & Signature UX
**Objective:** Minimize the friction of multi-transaction inscriptions and reduce "signature fatigue."

*   **Batch Signing & Atomic Swaps:** 
    *   *Analysis:* Currently, users must sign for every single chunk (up to 8KB each). For a 1MB file, this is ~128 signatures. 
    *   *Task:* Investigate "Atomic Swaps" or "Bulk Operations" patterns. While Stacks transactions are generally 1-to-1, can we utilize multi-signature or contract-call patterns where a single interaction triggers multiple internal state changes?
    *   *Alternative:* Implement "Auto-Sign" logic via a temporary session-key if protocol-safe, or transition to a "Queue" system that better manages the hand-off between the app and the wallet (Xverse/Leather) to ensure the next pop-up appears immediately after the previous one is broadcast.
*   **Sponsored Transactions:** 
    *   *Task:* Explore allowing a "Sponsor" to pay for the STX fees of the chunks. This would allow the user to only sign the "Begin" and "Seal" transactions (state changes they own), while the heavy lifting of data storage is handled by a background process or service provider.

## 📦 2. Dynamic Chunking & Performance Optimization
**Objective:** Balance network throughput with transaction reliability.

*   **Variable Chunk Size Benchmarking:**
    *   *Task:* Implement a performance testing suite to determine the "Sweet Spot" for chunk sizes. Currently fixed at 8192 bytes.
    *   *Experiments:* Test 4KB, 16KB, and 32KB chunks. Larger chunks reduce the number of transactions but increase the risk of "Block Limit" errors or wallet timeout issues.
    *   *Responsive Chunking:* Develop an algorithm that adjusts chunk size based on the user's internet speed or the current congestion levels of the Stacks network.
*   **Parallel Broadcasting:**
    *   *Task:* Move from purely sequential (wait for A to confirm before starting B) to "Aggressive Concurrent" broadcasting. If `Safe Mode` is off, the app should be able to broadcast 5–10 chunk transactions at once with incrementing nonces, significantly reducing total upload time.

## 🖼️ 3. Enhanced Gallery & Discovery (Universal Viewer)
**Objective:** Transform the viewer from a manual lookup tool into a rich discovery experience.

*   **Paginated Grid Implementation:**
    *   *UI:* Implement a 4x4 grid (16 items) as the default landing view for the Player.
    *   *Logic:* Use the `get-inscription` read-only function to fetch metadata in parallel for a range of IDs. 
    *   *Navigation:* Add "Jump to ID" and "Next/Prev" controls.
    *   *Selection Logic:* When a user clicks a card in the grid, it should seamlessly populate the "Main Viewer" and trigger the `fetchInscriptionData` process without a full page reload.
*   **Metadata Caching & Pre-fetching:**
    *   *Task:* Implement an IndexDB-based cache for inscription metadata. Since inscriptions are immutable, once we fetch the metadata and data for ID #X, we should never need to fetch it from the chain again.

## 🛠️ 4. Architectural Robustness: "Job Numbers" vs. "Inscription IDs"
**Objective:** Prevent "Gaps" and "Fragmented State" on-chain caused by incomplete inscriptions.

*   **The Problem:** Currently, an ID is assigned at `Begin`. If the user stops after 2 chunks, that ID is "stuck" as a draft forever, and the sequence (1, 2, 3...) becomes cluttered with dead entries.
*   **The Solution: Deferred ID Assignment:**
    *   *Proposed Logic:* Replace the early ID assignment with a "Job Tracking" system.
    1.  User starts a "Job" (assigned a random UUID or local-only Job Number).
    2.  Chunks are uploaded into a `PendingChunks` map keyed by `(Principal, JobNumber, ChunkIndex)`.
    3.  Only when the user calls `Seal`, the contract generates the final `InscriptionID`, moves the data to the permanent store, and clears the temporary Job data.
*   **Concurrent Minting:**
    *   *Task:* Ensure the contract supports multiple users minting simultaneously without ID collisions. Using the "Job Number" approach (scoped to the `tx-sender`) solves this inherently.

## 🧪 5. Future-Proofing & Testing
**Objective:** Ensure the platform can scale to larger files and more complex MIME types.

*   **Unit & Integration Tests:**
    *   *Task:* Expand `tests/merkle_test.js` to include full-flow simulations.
    *   *Stacks-Provider Mocks:* Create a mock wallet provider to test the "Resume" logic without spending real/testnet STX.
*   **Large File Stress Tests:**
    *   *Task:* Attempt to inscribe a 5MB+ file to find the breaking points of the current `Buffer` management and UI rendering.
*   **Smart Contract Security Audit:**
    *   *Task:* Review the `inscription-core.clar` for edge cases—specifically around the `asserts!` checks in `add-chunk` to ensure unauthorized users cannot "poison" someone else's incomplete inscription.

---
*Created gv4.1 - Modular Architecture Edition*
