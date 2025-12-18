// js/imageLoader.js

const CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
const IPFS_BASE = 'https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images';

// Cache to store confirmed working URLs. 
// Key: ID (string/number), Value: URL (string)
const urlCache = new Map();

// Track ongoing preloads to avoid duplicate requests
const preloading = new Set();

export const imageLoader = {
    
    /**
     * returns the best known URL for an NFT ID.
     * If cached, returns the working URL.
     * If not cached, returns the default Hiro URL (optimistic).
     * @param {string|number} id 
     */
    getUrl: function(id) {
        if (!id) return null;
        const cleanId = String(id).trim();
        if (urlCache.has(cleanId)) {
            return urlCache.get(cleanId);
        }
        return `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${cleanId}.png?cors=1`;
    },

    /**
     * Starts the process of verifying/finding the correct image URL.
     * Tries Hiro first, then IPFS. Updates cache on success.
     * @param {string|number} id 
     */
    preload: function(id) {
        if (!id) return;
        const cleanId = String(id).trim();
        
        if (urlCache.has(cleanId) || preloading.has(cleanId)) return;
        preloading.add(cleanId);

        const hiroUrl = `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${cleanId}.png?cors=1`;
        const ipfsUrl = `${IPFS_BASE}/%23${cleanId}.png?cors=1`;

        // Attempt to load Hiro
        this._checkImage(hiroUrl)
            .then(working => {
                if (working) {
                    this._cache(cleanId, hiroUrl);
                } else {
                    // Fallback to IPFS
                    console.log(`[ImageLoader] Hiro failed for #${cleanId}, trying IPFS...`);
                    return this._checkImage(ipfsUrl).then(ipfsWorking => {
                        if (ipfsWorking) {
                            this._cache(cleanId, ipfsUrl);
                            console.log(`[ImageLoader] IPFS success for #${cleanId}`);
                        } else {
                            console.warn(`[ImageLoader] All sources failed for #${cleanId}`);
                            // Optional: Cache a transparent pixel or error placeholder?
                            // For now, we don't cache failures so retries might happen or generic error handling takes over.
                        }
                    });
                }
            })
            .finally(() => {
                preloading.delete(cleanId);
            });
    },

    _checkImage: function(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Enable CORS for COEP
            img.referrerPolicy = 'no-referrer'; // Important for Hiro/IPFS
            img.src = src;
            
            // Use decode() to ensure the image is fully loaded and can be painted
            img.decode()
                .then(() => resolve(true))
                .catch((err) => {
                    console.warn(`[ImageLoader] Decode failed for ${src}:`, err);
                    resolve(false);
                });
        });
    },

    _cache: function(id, url) {
        urlCache.set(id, url);
        // Optional: Notify UI to rerender if needed? 
        // For now, next render call will pick it up.
    }
};
