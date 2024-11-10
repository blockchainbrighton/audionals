/**
 * ToneJS Bridge Module by Audionals (Updated for On-Chain Execution)
 *
 * Fetches the Tone.js library from an external HTML file (e.g., on-chain resource),
 * extracts the decompression functions and the Base64-encoded GZIP data,
 * decompresses the library, and injects it into the global scope.
 *
 * Usage:
 * Include this script in your HTML file:
 * <script src="path/to/tonejs-bridge.js"></script>
 *
 * Replace "path/to/" with the actual URL where this script is hosted.
 */

(async function () {
    if (typeof Tone !== 'undefined') {
        // Tone.js is already loaded
        console.log('Tone.js is already loaded.');
        return;
    }

    // URL of the external HTML file containing the Tone.js library and decompression functions
    const externalLibraryURL = '/content/1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0';

    /**
     * Fetches the external HTML file containing the Tone.js library and decompression functions.
     * @returns {Promise<{ base64Data: string, decompressionScript: string }>}
     */
    async function fetchExternalLibrary() {
        try {
            const response = await fetch(externalLibraryURL);
            if (!response.ok) {
                throw new Error(`Failed to fetch external library: ${response.status} ${response.statusText}`);
            }
            const htmlText = await response.text();

            // Parse the fetched HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // Extract the Base64-encoded GZIP data
            const textarea = doc.querySelector('#base64Input');
            if (!textarea) {
                throw new Error('No <textarea id="base64Input"> found in the external HTML.');
            }
            let base64EncodedGzip = textarea.value.trim().replace(/\n/g, '').replace(/\s/g, '');

            if (!base64EncodedGzip) {
                throw new Error('Base64 encoded content is empty.');
            }

            // Extract the decompression script
            const scriptTag = doc.querySelector('tonejsgzipbase64texttogziptojsconversion > script');
            if (!scriptTag) {
                throw new Error('Decompression script not found in the external HTML.');
            }
            const decompressionScript = scriptTag.textContent;

            return { base64Data: base64EncodedGzip, decompressionScript };
        } catch (error) {
            console.error('Error fetching external library:', error);
            throw error;
        }
    }

    /**
     * Injects the decompression functions and Base64 data into the current context.
     * @param {string} decompressionScript - The script containing decompression functions.
     * @param {string} base64Data - The Base64-encoded GZIP data of the library.
     * @returns {Promise<void>}
     */
    async function injectDecompressionFunctions(decompressionScript, base64Data) {
        // Create a temporary element to hold the base64 data
        const textarea = document.createElement('textarea');
        textarea.id = 'base64Input';
        textarea.style.display = 'none';
        textarea.value = base64Data;
        document.body.appendChild(textarea);

        // Create a script tag for the decompression functions
        const script = document.createElement('script');
        script.textContent = decompressionScript;
        document.body.appendChild(script);

        // Wait for the script to execute
        await new Promise((resolve) => {
            script.onload = resolve;
            // In case onload doesn't fire, resolve after a short delay
            setTimeout(resolve, 50);
        });
    }

    /**
     * Decompresses and injects the Tone.js library into the global scope.
     * @returns {Promise<void>}
     */
    async function decompressAndInjectLibrary() {
        try {
            const { base64Data, decompressionScript } = await fetchExternalLibrary();
            await injectDecompressionFunctions(decompressionScript, base64Data);

            // Use the decompression functions to get the library text
            if (window.libraryAPI && typeof window.libraryAPI.executeLibrary === 'function') {
                await window.libraryAPI.executeLibrary();
                console.log('Tone.js loaded successfully.');
            } else {
                throw new Error('Decompression functions not available.');
            }
        } catch (error) {
            console.error('Error decompressing and injecting library:', error);
        }
    }

    // Start the process
    await decompressAndInjectLibrary();
})();