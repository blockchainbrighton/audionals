# Project Context: Stacks Login Game

## Overview
This project is a **web-based authentication and NFT verification system** built on the **Stacks blockchain**. It serves as a "login gate" for a game or application, requiring users to connect their Stacks wallet and possess a specific NFT to gain access.

## Tech Stack
- **Framework/Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** JavaScript (ES Modules)
- **Blockchain Integration:**
  - `@stacks/connect`: For wallet connection UI.
  - `@stacks/auth`: For user session management.
  - **Hiro API:** Used to fetch NFT holdings (`https://api.hiro.so`).
- **Polyfills:** Uses `vite-plugin-node-polyfills` to support Stacks.js libraries in the browser environment (handling `Buffer`, `process`, etc.).

## Key Files
- **`main.js`**: The core logic file.
  - **Global Polyfills:** Sets up `Buffer` and `process` for browser compatibility.
  - **Configuration:** Defines `MY_NFT_CONTRACT` (currently set to `bitcoin-monkeys`).
  - **Auth Logic:** Handles `connect-wallet-btn` and `sign-out-btn` events using `UserSession`.
  - **Verification:** `checkHoldings()` queries the Hiro API to check if the connected wallet owns the required NFT.
- **`index.html`**: The entry point. Contains the HTML structure and inline CSS styles for the login UI.
- **`vite.config.js`**: Configuration for Vite. Crucially, it includes the `nodePolyfills` plugin to ensure compatibility with Stacks.js dependencies.
- **`package.json`**: Defines scripts and dependencies.

## Usage & Commands

### Prerequisites
- Node.js and npm installed.
- A Stacks wallet extension (e.g., Leather, Xverse).

### Development
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start Dev Server:**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173` (default Vite port).

### Building
To create a production build:
```bash
npm run build
```
To preview the build locally:
```bash
npm run preview
```

## Configuration
To change the NFT required for access, modify the `MY_NFT_CONTRACT` constant in `main.js`:
```javascript
// Example: Change to a different contract ID
const MY_NFT_CONTRACT = 'SP...YOUR_CONTRACT_ADDRESS.your-nft-name'; 
```
