4/1/26 Okay, so v5.4-g is working really well. I'm just writing this as a log to let you know where we're up to on the latest version. It's working well. I'm just trying to do the first larger file, and I've hit an API limit again of some sort during the actual inscribing or, yeah, during the minting process, and I got to the fourth or the last chunk of a five or six chunk process. So we need to look into this. Just need to make sure we're being as efficient as possible with these API calls. And I will come back with some more notes when I think of them.

Here are the console logs whowing up to when we ran into issues: main.js:23 [7:04:13 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
Navigated to http://localhost:5173/
client.ts:19 [vite] connecting...
main.js:23 [7:04:13 AM] App loading... 
main.js:23 [7:04:13 AM] Network configured {url: 'https://api.testnet.hiro.so'}
client.ts:155 [vite] connected.
main.js:23 [7:04:13 AM] AUTH DEBUG DUMP {reason: 'init', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:04:13 AM] Updating UI. User signed in: true 
main.js:23 [7:04:13 AM] User address: ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA 
main.js:23 [7:04:24 AM] Switching to page: play 
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:24 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:27 AM] User clicked 'Load & View' for ID: 0 
main.js:23 [7:04:27 AM] Player: Fetching metadata and chunks... 
main.js:23 [7:04:27 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:27 AM] Fetching inscription data for ID: 0 from ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.gtest3 
main.js:23 [7:04:27 AM] Meta Object: {type: '(tuple (chunk-count uint) (data-hash (buff 32)) (m…owner principal) (sealed bool) (total-size uint))', value: {…}}
main.js:23 [7:04:27 AM] Meta.value: {chunk-count: {…}, data-hash: {…}, merkle-root: {…}, mime-type: {…}, owner: {…}, …}
main.js:23 [7:04:27 AM] Inscription found. ID: 0, Chunks: 1, Size: 5250 bytes 
main.js:23 [7:04:27 AM] Fetching Chunk 0... 
main.js:23 [7:04:27 AM] All chunks fetched. Reconstructing... 
main.js:23 [7:04:27 AM] Downloaded 5250 bytes. Header: ff d8 ff e0 00 10 4a 46 49 46 00 01 01 01 00 60 
main.js:23 [7:04:27 AM] Raw MIME object: {type: '(string-ascii 10)', value: 'image/jpeg'}
main.js:23 [7:04:27 AM] Data fetched successfully. Size: 5250 bytes. MIME: image/jpeg 
main.js:23 [7:04:27 AM] Player: Detected Image. Rendering... 
main.js:23 [7:04:36 AM] User clicked 'Load & View' for ID: 1 
main.js:23 [7:04:36 AM] Player: Fetching metadata and chunks... 
main.js:23 [7:04:36 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:36 AM] Fetching inscription data for ID: 1 from ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.gtest3 
main.js:23 [7:04:36 AM] ERROR: Inscription 1 not found on-chain. 
main.js:23 [7:04:36 AM] Fetch Error {error: 'Not found'}
main.js:23 [7:04:36 AM] Player Error {error: 'Not found'}
main.js:23 [7:04:36 AM] Player: Error: Not found 
main.js:23 [7:04:42 AM] Switching to page: mint 
main.js:23 [7:04:42 AM] Fee rates auto-updated {currentNetwork: {…}, mainnet: {…}}
main.js:23 [7:04:44 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:04:50 AM] File selected: stacks-rectangle-tile-text-logo-black.jpeg (4612 bytes) 
main.js:23 [7:04:50 AM] Detected MIME: image/jpeg 
main.js:23 [7:04:50 AM] File read into ArrayBuffer. Starting chunking... 
main.js:23 [7:04:50 AM] File chunked into 1 pieces. 
main.js:23 [7:04:50 AM] Merkle Root calculated {root: '9b49fad3c1a79a25398dc7e64f991d56a5fbe08337e06b87ddf845f85d711c8f'}
main.js:23 [7:04:50 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:50 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:04:53 AM] User clicked 'Begin / Resume Inscription' 
main.js:23 [7:04:53 AM] Ensuring auth before action... {action: 'inscribe a file'}
main.js:23 [7:04:53 AM] Auth verified. 
main.js:23 [7:04:53 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:53 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:04:54 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:04:59 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:04:59 AM] Initialization TX sent: d276381f7f077acf2c4cd83f1bdd217b46a391e637e51f41673e838541e8f77c 
main.js:23 [7:04:59 AM] Polling for TX: d276381f7f077acf2c4cd83f1bdd217b46a391e637e51f41673e838541e8f77c 
main.js:23 [7:05:01 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:05:01 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:05:04 AM] Initialization Confirmed! 
main.js:23 [7:05:04 AM] Starting sequential chunk uploads for Hash: 9b49fad3c1a79a25398dc7e64f991d56a5fbe08337e06b87ddf845f85d711c8f 
main.js:23 [7:05:04 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:04 AM] Preparing Chunk 0: size=4612, hash=9b49fad3c1a79a25398dc7e64f991d56a5fbe08337e06b87ddf845f85d711c8f 
main.js:23 [7:05:05 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:05:09 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:05:09 AM] Chunk 0 TX Sent: 29810e042b57e8f5af195149edeee1c50c97e3dc777c38c93cd4245b23e57c88 
main.js:23 [7:05:09 AM] Polling for TX: 29810e042b57e8f5af195149edeee1c50c97e3dc777c38c93cd4245b23e57c88 
main.js:23 [7:05:10 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:05:10 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:05:14 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:14 AM] Sealing inscription... {hash: '9b49fad3c1a79a25398dc7e64f991d56a5fbe08337e06b87ddf845f85d711c8f'}
main.js:23 [7:05:14 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:05:18 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:05:18 AM] Polling for TX: dd698432d1ebe39ef4c96056c97e625ccc40cd99ec42e7bb7eb08e5019f8c221 
main.js:23 [7:05:19 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:05:19 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:05:26 AM] Switching to page: play 
main.js:23 [7:05:29 AM] User clicked 'Load & View' for ID: 0 
main.js:23 [7:05:29 AM] Player: Fetching metadata and chunks... 
main.js:23 [7:05:29 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:29 AM] Fetching inscription data for ID: 0 from ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.gtest3 
main.js:23 [7:05:29 AM] Meta Object: {type: '(tuple (chunk-count uint) (data-hash (buff 32)) (m…owner principal) (sealed bool) (total-size uint))', value: {…}}
main.js:23 [7:05:29 AM] Meta.value: {chunk-count: {…}, data-hash: {…}, merkle-root: {…}, mime-type: {…}, owner: {…}, …}
main.js:23 [7:05:29 AM] Inscription found. ID: 0, Chunks: 1, Size: 5250 bytes 
main.js:23 [7:05:29 AM] Fetching Chunk 0... 
main.js:23 [7:05:29 AM] All chunks fetched. Reconstructing... 
main.js:23 [7:05:29 AM] Downloaded 5250 bytes. Header: ff d8 ff e0 00 10 4a 46 49 46 00 01 01 01 00 60 
main.js:23 [7:05:29 AM] Raw MIME object: {type: '(string-ascii 10)', value: 'image/jpeg'}
main.js:23 [7:05:29 AM] Data fetched successfully. Size: 5250 bytes. MIME: image/jpeg 
main.js:23 [7:05:29 AM] Player: Detected Image. Rendering... 
main.js:23 [7:05:30 AM] User clicked 'Load & View' for ID: 1 
main.js:23 [7:05:30 AM] Player: Fetching metadata and chunks... 
main.js:23 [7:05:30 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:30 AM] Fetching inscription data for ID: 1 from ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.gtest3 
main.js:23 [7:05:30 AM] Meta Object: {type: '(tuple (chunk-count uint) (data-hash (buff 32)) (m…owner principal) (sealed bool) (total-size uint))', value: {…}}
main.js:23 [7:05:30 AM] Meta.value: {chunk-count: {…}, data-hash: {…}, merkle-root: {…}, mime-type: {…}, owner: {…}, …}
main.js:23 [7:05:30 AM] Inscription found. ID: 1, Chunks: 1, Size: 4612 bytes 
main.js:23 [7:05:30 AM] Fetching Chunk 0... 
main.js:23 [7:05:30 AM] All chunks fetched. Reconstructing... 
main.js:23 [7:05:30 AM] Downloaded 4612 bytes. Header: ff d8 ff e0 00 10 4a 46 49 46 00 01 01 01 00 60 
main.js:23 [7:05:30 AM] Raw MIME object: {type: '(string-ascii 10)', value: 'image/jpeg'}
main.js:23 [7:05:30 AM] Data fetched successfully. Size: 4612 bytes. MIME: image/jpeg 
main.js:23 [7:05:30 AM] Player: Detected Image. Rendering... 
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:05:54 AM] Switching to page: mint 
main.js:23 [7:05:54 AM] Fee rates auto-updated {currentNetwork: {…}, mainnet: {…}}
main.js:23 [7:05:56 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:06:25 AM] File selected: AudionalsLogo.jpg (32681 bytes) 
main.js:23 [7:06:25 AM] Detected MIME: image/jpeg 
main.js:23 [7:06:25 AM] File read into ArrayBuffer. Starting chunking... 
main.js:23 [7:06:25 AM] File chunked into 4 pieces. 
main.js:23 [7:06:25 AM] Merkle Root calculated {root: '4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63'}
main.js:23 [7:06:25 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:06:25 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:06:39 AM] User clicked 'Begin / Resume Inscription' 
main.js:23 [7:06:39 AM] Ensuring auth before action... {action: 'inscribe a file'}
main.js:23 [7:06:39 AM] Auth verified. 
main.js:23 [7:06:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:06:39 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:06:39 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:06:45 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:06:45 AM] Initialization TX sent: 77df65f837705a44e8e5bdf300cd59ff8e7552d269f72c32359036c0af75f174 
main.js:23 [7:06:45 AM] Polling for TX: 77df65f837705a44e8e5bdf300cd59ff8e7552d269f72c32359036c0af75f174 
main.js:23 [7:06:47 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:06:47 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:07:05 AM] Initialization Confirmed! 
main.js:23 [7:07:05 AM] Starting sequential chunk uploads for Hash: 4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63 
main.js:23 [7:07:05 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:07:05 AM] Preparing Chunk 0: size=8192, hash=4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63 
main.js:23 [7:07:06 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:07:11 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:07:11 AM] Chunk 0 TX Sent: 4999a1f932a5c673ca58f6c8ba44ea4f8f45781f7632b721164bddd0b02262d6 
main.js:23 [7:07:11 AM] Polling for TX: 4999a1f932a5c673ca58f6c8ba44ea4f8f45781f7632b721164bddd0b02262d6 
main.js:23 [7:07:12 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:07:12 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:07:16 AM] Preparing Chunk 1: size=8192, hash=4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63 
main.js:23 [7:07:17 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:07:20 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:07:20 AM] Chunk 1 TX Sent: b7fbb05b7b696d5126c8ad972b1ab1778df391558d6b133b3bb4d5d1e386fd11 
main.js:23 [7:07:20 AM] Polling for TX: b7fbb05b7b696d5126c8ad972b1ab1778df391558d6b133b3bb4d5d1e386fd11 
main.js:23 [7:07:25 AM] Preparing Chunk 2: size=8192, hash=4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63 
main.js:23 [7:07:29 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:07:29 AM] Chunk 2 TX Sent: ebd70025a6ef9b3cbb120e93e7ac8c76abbe3f87d4100a9576214e3395ae9d1c 
main.js:23 [7:07:29 AM] Polling for TX: ebd70025a6ef9b3cbb120e93e7ac8c76abbe3f87d4100a9576214e3395ae9d1c 
main.js:23 [7:07:35 AM] Preparing Chunk 3: size=8105, hash=4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63 
main.js:23 [7:07:38 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…0041c139d4394e910afa…(hex truncated)"\n    }\n  }\n}'}
main.js:23 [7:07:38 AM] Chunk 3 TX Sent: fdf133b1f8c76d5170ef0ca548d14c45bba2c1517d661e9384b25b613b870ce0 
main.js:23 [7:07:38 AM] Polling for TX: fdf133b1f8c76d5170ef0ca548d14c45bba2c1517d661e9384b25b613b870ce0 
main.js:23 [7:07:40 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:07:41 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:07:42 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:23 [7:07:42 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:07:44 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:07:44 AM] Sealing inscription... {hash: '4f4e6d4d92ee488692339fb3ed8ce19ed2e18bf9158adc7d61035c0a80e7ac63'}
main.js:23 [7:07:44 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:07:45 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "jsonrpc": "2.0",\n  "id": "",\n  "error": {\n   …ternal error."\n  },\n  "source": "xverse-wallet"\n}'}
main.js:23 [7:07:49 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:07:49 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:360 [Connect] Error during transaction request cancel
console.error @ main.js:360
Pt @ @stacks_connect.js?v=d7baf0da:15458
await in Pt
N @ @stacks_connect.js?v=d7baf0da:15499
await in N
Y @ @stacks_connect.js?v=d7baf0da:15504
(anonymous) @ main.js:1526
openContractCallWrapper @ main.js:1524
sealInscriptionTransaction @ main.js:1730
(anonymous) @ main.js:1700Understand this error
main.js:23 [7:07:49 AM] [console.error] {args: '[\n  "[Connect] Error during transaction request",\n  "cancel"\n]'}
main.js:23 [7:07:49 AM] Minting Process Error {error: 'User cancelled transaction'}
main.js:23 [7:07:52 AM] User clicked 'Begin / Resume Inscription' 
main.js:23 [7:07:52 AM] Ensuring auth before action... {action: 'inscribe a file'}
main.js:23 [7:07:52 AM] Auth verified. 
main.js:23 [7:07:52 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:07:52 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
(index):1 Access to fetch at 'https://api.testnet.hiro.so/v2/contracts/call-read/ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA/gtest3/get-pending-inscription' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
main.js:23 [7:07:52 AM] Read-only call failed {attempt: 0, error: 'Failed to fetch', functionName: 'get-pending-inscription'}
(index):1 Access to fetch at 'https://api.testnet.hiro.so/v2/contracts/call-read/ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA/gtest3/get-pending-inscription' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
main.js:23 [7:07:53 AM] Read-only call failed {attempt: 1, error: 'Failed to fetch', functionName: 'get-pending-inscription'}
(index):1 Access to fetch at 'https://api.testnet.hiro.so/v2/contracts/call-read/ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA/gtest3/get-pending-inscription' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
main.js:23 [7:07:54 AM] Read-only call failed {attempt: 2, error: 'Failed to fetch', functionName: 'get-pending-inscription'}
(index):1 Access to fetch at 'https://api.testnet.hiro.so/v2/contracts/call-read/ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA/gtest3/get-pending-inscription' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
main.js:23 [7:07:55 AM] Read-only call failed {attempt: 3, error: 'Failed to fetch', functionName: 'get-pending-inscription'}
main.js:360 Error checking pending status: TypeError: Failed to fetch
    at fetchWrapper (chunk-QU2XZKUR.js?v=0155f259:572:29)
    at StacksTestnet.fetchFn (chunk-QU2XZKUR.js?v=0155f259:615:26)
    at callReadOnlyFunction (@stacks_transactions.js?v=d7baf0da:3085:34)
    at callReadOnlyFunctionWithRetry (main.js:682:26)
    at async checkPendingStatus (main.js:868:21)
    at async HTMLButtonElement.<anonymous> (main.js:1621:29)
console.error @ main.js:360
checkPendingStatus @ main.js:880
await in checkPendingStatus
(anonymous) @ main.js:1621Understand this error
main.js:23 [7:07:55 AM] [console.error] {args: '[\n  "Error checking pending status:",\n  {\n    "nam…http://localhost:5173/src/main.js:1621:29)"\n  }\n]'}
main.js:23 [7:07:55 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:07:56 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "jsonrpc": "2.0",\n  "id": "",\n  "error": {\n   …ternal error."\n  },\n  "source": "xverse-wallet"\n}'}
main.js:23 [7:08:01 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:08:01 AM] [window.message] {origin: 'http://localhost:5173', data: '{\n  "source": "xverse-wallet",\n  "method": "transa…cted]",\n    "transactionResponse": "cancel"\n  }\n}'}
main.js:360 [Connect] Error during transaction request cancel
console.error @ main.js:360
Pt @ @stacks_connect.js?v=d7baf0da:15458
await in Pt
N @ @stacks_connect.js?v=d7baf0da:15499
await in N
Y @ @stacks_connect.js?v=d7baf0da:15504
(anonymous) @ main.js:1526
openContractCallWrapper @ main.js:1524
(anonymous) @ main.js:1669Understand this error
main.js:23 [7:08:01 AM] [console.error] {args: '[\n  "[Connect] Error during transaction request",\n  "cancel"\n]'}
main.js:23 [7:08:01 AM] Minting Process Error {error: 'User cancelled transaction'}
main.js:23 [7:08:19 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'hidden', hasFocus: false, …}
main.js:23 [7:08:19 AM] AUTH DEBUG DUMP {reason: 'visibilitychange', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'hidden', hasFocus: false, …}
main.js:23 [7:10:10 AM] AUTH DEBUG DUMP {reason: 'visibilitychange', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:10:10 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}
main.js:23 [7:10:17 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}
main.js:23 [7:10:40 AM] AUTH DEBUG DUMP {reason: 'window.focus', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: true, …}



Then inscribed some new files and got this trying to view ID #3 which is the first HTML file:
[7:12:55 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:12:55 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:12:57 AM] User clicked 'Load & View' for ID: 3 
main.js:23 [7:12:57 AM] Player: Fetching metadata and chunks... 
main.js:23 [7:12:57 AM] Contract details parsed {address: 'ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA', name: 'gtest3'}
main.js:23 [7:12:57 AM] Fetching inscription data for ID: 3 from ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA.gtest3 
(index):1 Access to fetch at 'https://api.testnet.hiro.so/v2/contracts/call-read/ST10W2EEM757922QTVDZZ5CSEW55JEFNN33V2E7YA/gtest3/get-inscription' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
main.js:23 [7:12:57 AM] Fetch Error {error: 'Failed to fetch'}
main.js:23 [7:12:57 AM] Player Error {error: 'Failed to fetch'}
main.js:23 [7:12:57 AM] Player: Error: Failed to fetch 
main.js:23 [7:13:06 AM] AUTH DEBUG DUMP {reason: 'window.blur', origin: 'http://localhost:5173', href: 'http://localhost:5173/', visibilityState: 'visible', hasFocus: false, …}