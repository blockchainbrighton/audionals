# xStrata Protocol Proto

## Project Overview
This project is a functional prototype for inscribing audio files onto the Stacks blockchain. It supports file chunking, cryptographic verification via Merkle roots, on-chain storage via Clarity smart contracts, and real-time audio reconstruction/playback using the Web Audio API.

## Architecture
*   **Frontend**: Vanilla JavaScript + Vite.
*   **Blockchain**: Clarity Smart Contract (`contracts/inscription-core.clar`).
*   **Key Modules**:
    *   `src/lib/merkle.js`: Handles 8KB chunking and SHA-256 Merkle root generation.
    *   `src/lib/audio-engine.js`: Decodes binary audio data and concatenates clips.
    *   `src/main.js`: Main application logic, including wallet integration and deep debug logging.

## Features Added During Setup
*   **Dynamic Configuration**: Target any deployed contract via the UI.
*   **Contract Deployer**: Deploy the inscription core contract directly from the browser.
*   **Journey Log**: A real-time debug console for tracking wallet handshakes and data processing.
*   **Playback Modes**: Supports both "Single Audio" playback and "Recursive Manifest" (JSON-based) playback.

## Building and Running

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

## Production Deployment Address (Testnet)
The current default contract is:
`ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.inscription-core`

## Usage Flow
1.  **Connect**: Authenticate via Stacks Wallet (Testnet).
2.  **Deploy (Optional)**: If setting up a new environment, use the "Deploy Contract" button.
3.  **Inscribe**: 
    - Select an audio file (WebM/WAV).
    - Click "Start Inscription" (Initialization).
    - Wait for confirmation, then enter the Inscription ID and click "Start Chunk Uploads".
4.  **Play**:
    - Go to the Player.
    - Enter the Inscription ID.
    - Click "Play Single Audio".

## Implementation Notes
*   **Data Handling**: The app handles the conversion of Stacks hex-string buffers back into binary `Uint8Array` for the Web Audio API.
*   **Reliability**: Includes `AnchorMode.Any` and `PostConditionMode.Allow` to ensure smooth transaction broadcasting on Testnet.