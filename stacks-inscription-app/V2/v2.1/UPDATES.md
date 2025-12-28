# Update Log - Universal File Type Support

## Date: 2025-12-22

### Fixes
*   **MIME Type Sniffing (Magic Bytes)**: Added a `sniffMimeType` function.
    *   **Problem**: Legacy inscriptions (like Inscription 0) were minted with hardcoded `application/json` even if they contained binary media (WebM/WAV), causing them to render as text garbage.
    *   **Solution**: If the on-chain MIME is `application/json` or `application/octet-stream`, the app now checks the first 4 bytes of the data.
    *   **Supported Signatures**:
        *   `1A 45 DF A3` -> `audio/webm`
        *   `52 49 46 46` -> `audio/wav` (RIFF)
        *   `89 50 4E 47` -> `image/png`
        *   `FF D8 FF` -> `image/jpeg`
        *   `47 49 46 38` -> `image/gif`
        *   `25 50 44 46` -> `application/pdf`
*   **MIME Type Extraction Bug**: Fixed a runtime error where `mimeType` was undefined because the `cvToValue` return structure varies. Added robust checking for `.data`, `.value`, or string types on the metadata object.

### Key Changes

#### 1. Dynamic MIME Type Detection (`src/main.js`)
*   **Old Behavior**: Hardcoded `application/json` or `audio/wav` assumptions.
*   **New Behavior**: 
    *   Captures `file.type` from the `<input type="file">` event.
    *   Defaults to `application/octet-stream` if undetectable.
    *   Passes the correct MIME type to the `begin-inscription` contract call.

#### 2. Universal Viewer Logic (`src/main.js`)
*   Refactored `fetchInscriptionData` to return `{ data, mimeType }` metadata.
*   Replaced "Play Single Audio" logic with a conditional renderer:
    *   **Audio**: Uses Web Audio API (existing logic).
    *   **Image**: Renders `<img>` tag with Blob URL.
    *   **Video**: Renders `<video>` tag with Blob URL.
    *   **HTML / PDF**: Renders `<iframe>`.
    *   **Text / Code**: Renders raw text in a `<pre>` block.

#### 3. UI Updates (`index.html`)
*   Renamed "Recursive Audio Player" to "Universal Viewer".
*   Renamed "Play Single Audio" to "View / Play Single".
*   Added a generic `#media-container` div for rendering content.
*   Expanded `iframe` height for better PDF/HTML viewing.

### Testing
*   Verified build success with `npm run build`.
*   Verified Inscription 0 (WebM) now correctly plays as audio despite incorrect metadata.
