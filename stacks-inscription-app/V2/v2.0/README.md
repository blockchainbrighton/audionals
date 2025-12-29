# Stacks Inscription Protocol (SIP-Proto)

> A robust, open-source protocol for inscribing, storing, and composing generic data on the Stacks blockchain (Bitcoin L2).

## 🚀 Overview

This project provides a complete end-to-end system for permanently storing data on the Stacks blockchain. Unlike simple text storage or expensive Layer 1 Ordinals, this protocol utilizes Stacks smart contracts to enable **high-capacity, verifiable, and programmable data storage**.

It supports **any file type** (Images, Audio, Video, Code, PDFs) and introduces **Recursive Inscriptions**—the ability to compose complex applications or media by referencing existing on-chain data.

## ✨ Key Features

*   **📦 Smart Chunking**: Automatically splits large files into 8KB chunks to bypass transaction size limits, enabling the storage of high-fidelity media (MBs in size).
*   **🔒 Cryptographic Verification**: Generates a SHA-256 Merkle Root for every file. The smart contract seals the inscription with this root, ensuring data integrity.
*   **⏯️ Resumable Uploads**: The client checks on-chain state before uploading. If a transaction fails or the browser closes, you can resume exactly where you left off without paying for the same chunk twice.
*   **🎼 Universal Renderer**: The built-in viewer automatically detects and renders:
    *   **Audio** (WebM, WAV, OGG) with a Web Audio API engine.
    *   **Images** (PNG, JPG, GIF, SVG).
    *   **Video** (MP4, WebM).
    *   **Documents** (PDF, HTML) in sandboxed frames.
    *   **Code/Data** (JSON, Text).
*   **🔄 Recursive Composability**: Supports "Manifest" inscriptions (JSON) that reference other inscription IDs. The player can fetch these dependencies and combine them dynamically (e.g., stitching audio clips into a seamless track).

## 🛠 Architecture

### The Smart Contract (`contracts/inscription-core.clar`)
A generic storage engine that:
1.  **Registers** an inscription (MIME type, size, chunk count).
2.  **Stores** raw data chunks (up to 8KB each) in a `Chunks` map.
3.  **Seals** the record with a Merkle Root, preventing further modification.

### The Client (`src/main.js`)
A vanilla JavaScript + Vite application that handles:
1.  **File Processing**: Reads files into `ArrayBuffers`, calculates hashes/Merkle roots.
2.  **Wallet Interaction**: Manages Stacks Connect authentication and transaction signing.
3.  **Data Reconstruction**: Fetches chunks from the chain, validates integrity, and rebuilds the original file for playback.

## 🏁 Getting Started

### Prerequisites
*   Node.js (v16+)
*   A Stacks Wallet (e.g., Leather, Xverse) configured for **Testnet**.

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd stacks-inscription-app

# Install dependencies
npm install
```

### Running the App

```bash
npm run dev
```

Open `http://localhost:5173` (or the port shown in your terminal).

## 📖 Usage Guide

### 1. Deploy the Contract (Optional)
If you want to run your own instance of the registry:
1.  Connect your wallet.
2.  Click **"Deploy Contract"**.
3.  Wait for the transaction to confirm. The app will automatically target your new contract.

*Note: You can also use the default provided Testnet contract.*

### 2. Inscribe Data
1.  Select a file (e.g., a `.png` or `.wav`).
2.  The app will calculate the Merkle Root and chunk count.
3.  Click **"Start Inscription"**.
4.  **Step 1 (Init)**: Confirms the ID on-chain.
5.  **Step 2 (Upload)**: Automatically signs transactions for each chunk.
6.  **Step 3 (Seal)**: Finalizes the inscription.

### 3. View / Play
1.  Copy the **Inscription ID** (provided after minting).
2.  Go to the **Player** tab.
3.  Paste the ID and click **"Play Single Audio"** (or View).
4.  The content will be fetched from the blockchain and rendered.

### 4. Recursive Audio (Advanced)
1.  Create a JSON file containing a list of Inscription IDs: `[12, 15, 22]`.
2.  Inscribe this JSON file.
3.  Load the resulting ID in the player using **"Load Manifest"**.
4.  The engine will fetch all referenced audio tracks and play them sequentially.

## 🤝 Contributing

We welcome contributions! Please see `contracts/` for the Clarity logic and `src/` for the frontend integration.

## 📄 License

MIT
