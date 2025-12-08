# Simple Stacks NFT Viewer

A lightweight, single-file web application that allows users to view Non-Fungible Tokens (NFTs) held by any Stacks (STX) wallet address. It utilizes the [Hiro API](https://docs.hiro.so/api) to fetch real-time blockchain data.

## 🚀 Features

* **Zero Installation:** Runs entirely in the browser using a single HTML file.
* **Real-Time Data:** Fetches live data directly from the Stacks Mainnet.
* **User Friendly:** Simple interface to paste an address and scan.
* **Data Parsing:** Automatically formats the raw asset identifiers into readable Collection Names and Token IDs.
* **Error Handling:** Provides clear feedback for invalid addresses or API connection issues.

## 📋 Prerequisites

* A modern web browser (Chrome, Firefox, Safari, Edge).
* An active internet connection (to query the Hiro API).
* No Node.js, Python, or server backend is required.

## 🛠️ How to Use

1.  **Download/Create the File:**
    * Create a new file on your computer named `stacks-nft-viewer.html`.
    * Paste the source code into this file and save it.
2.  **Open the App:**
    * Double-click `stacks-nft-viewer.html`. It will open in your default web browser.
3.  **Scan a Wallet:**
    * Locate a Stacks wallet address (starts with `SP...`).
    * Paste the address into the input field.
    * Click **Scan**.
4.  **View Results:**
    * The app will list the first 50 NFTs held by that address, including the Collection Name and Token ID.

## 🧩 How it Works

The application uses standard HTML5, CSS3, and Vanilla JavaScript.

1.  **Input:** The user provides a Stacks Principal address (e.g., `SP2...`).
2.  **Fetch:** The app sends a `GET` request to the Hiro Mainnet API:
    ```
    [https://api.mainnet.hiro.so/extended/v1/tokens/nft/holdings](https://api.mainnet.hiro.so/extended/v1/tokens/nft/holdings)
    ```
3.  **Parse:** The JSON response is parsed to extract:
    * `asset_identifier`: Split to separate the contract address from the collection name.
    * `value.repr`: The specific Token ID (e.g., `u256`).
4.  **Render:** The DOM is updated dynamically to display the list of items.

## ⚙️ Configuration

Currently, the application is set to retrieve a maximum of **50 items** per scan to ensure fast load times.

To change this limit, find the following line in the `script` section of the HTML file and adjust the `limit` parameter:

```javascript
const apiUrl = `https://api.mainnet.hiro.so/extended/v1/tokens/nft/holdings?principal=${addressInput}&limit=50`;