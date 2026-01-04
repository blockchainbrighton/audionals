# Stacks Inscription Proto

## Project Overview
This project is a functional prototype for inscribing arbitrary files onto the Stacks blockchain. It supports 8KB chunking, cryptographic verification via Merkle roots, on-chain storage via a Clarity smart contract, and client-side reconstruction + rendering (audio/images/video/docs/text) in the browser.

## Architecture
*   **Frontend**: Vanilla JavaScript + Vite.
*   **Blockchain**: Clarity Smart Contract (`contracts/inscription-core.clar`).
*   **Key Modules**:
    *   `src/lib/merkle.js`: Handles 8KB chunking and SHA-256 Merkle root generation.
    *   `src/lib/audio-engine.js`: Decodes binary audio data and concatenates clips.
    *   `src/main.js`: Main application logic, including Stacks Connect integration and deep auth/debug logging.

## Features Added During Setup
*   **Dynamic Configuration**: Target any deployed contract via the UI.
*   **Contract Deployer**: Deploy the inscription core contract directly from the browser.
*   **Journey Log**: A real-time debug console for tracking wallet handshakes and data processing.
*   **Universal Viewer**: Fetches chunks, reconstructs the file, then renders based on detected MIME (with magic-byte sniffing fallbacks).
*   **Playback Modes**: Supports both single-ID viewing and "Recursive Manifest" (JSON-based) playback.
*   **Resumable Minting**: A Resume / Retry flow scans missing chunks on-chain, uploads only what’s missing, then seals.
*   **Auth Diagnostics (UI + Journey Log)**:
    *   Wallet status messaging (connected/disconnected + why it matters).
    *   Verbose auth logging toggle.
    *   “Dump Auth Debug” button (provider/session/manifest checks).
    *   “Reset Wallet Selection” (clears stale provider selection).
    *   “Auth Monitor” (polls for auth/provider/storage state transitions).

## Building and Running

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Manifest Requirement (Stacks Connect)
This project serves `public/manifest.json` at `/manifest.json`. Stacks Connect uses this during authentication. If you deploy behind a different web server, ensure the manifest is available at the site root.

## Production Deployment Address (Testnet)
The current default contract is:
`ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.inscription-core`

## Usage Flow
1.  **Connect**: Click “Connect Wallet”. (Viewing works without a wallet; deploy/mint requires a wallet.)
2.  **Deploy (Optional)**: Use “Deploy 'inscription-core'”.
3.  **Inscribe**:
    - Select any file.
    - Click “Begin Inscription”.
    - The UI guides Step 1 (begin), Step 2 (chunk uploads), Step 3 (seal).
    - If interrupted, use the “Resume / Retry Inscription” tool in Mint Mode.
4.  **View / Play**:
    - Go to “Inscription Viewer”.
    - Enter an ID and click “Load & View”, or use “Process Recursive Manifest (JSON)”.

## Implementation Notes
*   **Data Handling**: The app handles the conversion of Stacks hex-string buffers back into binary `Uint8Array` for the Web Audio API.
*   **Reliability**: Includes `AnchorMode.Any` and `PostConditionMode.Allow` to ensure smooth transaction broadcasting on Testnet.
*   **Logging Safety**: Journey Log output is redacted to avoid leaking secrets/tokens, but treat logs as sensitive when sharing externally.
