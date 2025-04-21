// --- START OF FILE instanceManager.js ---
import { generateUniqueId } from './utils.js';

const STORAGE_KEY = 'audionalArtInstanceRegistry';
// Timeout threshold in milliseconds (e.g., 15 seconds)
// Instances older than this without updating might be considered stale/crashed
const STALE_TIMEOUT_MS = 15 * 1000;
// How often to update timestamp to signal activity (e.g., 5 seconds)
const HEARTBEAT_INTERVAL_MS = 5 * 1000;

let instanceUUID = null;
let instanceSequence = -1; // -1 indicates not yet assigned
let heartbeatIntervalId = null;
let isUnloading = false; // Flag to prevent race conditions during unload

/**
 * Reads the registry from localStorage, parsing JSON safely.
 * @returns {object} The registry object (mapping UUIDs to {seq, ts}) or an empty object.
 */
function getRegistry() {
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) return {};
        const registry = JSON.parse(rawData);
        // Basic validation: ensure it's an object
        if (typeof registry === 'object' && registry !== null && !Array.isArray(registry)) {
            return registry;
        }
        console.warn('Instance Manager: Invalid data found in localStorage, resetting.');
        return {};
    } catch (error) {
        console.error('Instance Manager: Error reading or parsing registry from localStorage:', error);
        return {}; // Return empty on error
    }
}

/**
 * Writes the registry to localStorage, handling potential errors.
 * @param {object} registry - The registry object to save.
 */
function setRegistry(registry) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    } catch (error) {
        console.error('Instance Manager: Error writing registry to localStorage:', error);
        // Potentially handle quota exceeded errors if necessary
    }
}

/**
 * Removes stale entries from the registry.
 * @param {object} registry - The current registry object.
 * @param {number} now - The current timestamp (performance optimization).
 * @returns {object} The cleaned registry object.
 */
function cleanupRegistry(registry, now) {
    let changed = false;
    const cleanedRegistry = {};
    for (const uuid in registry) {
        if (Object.prototype.hasOwnProperty.call(registry, uuid)) {
            const entry = registry[uuid];
            if (entry && typeof entry === 'object' && typeof entry.ts === 'number') {
                if (now - entry.ts < STALE_TIMEOUT_MS) {
                    cleanedRegistry[uuid] = entry;
                } else {
                    console.log(`Instance Manager: Removing stale instance ${uuid} (last seen ${new Date(entry.ts).toLocaleTimeString()})`);
                    changed = true;
                }
            } else {
                 console.warn(`Instance Manager: Removing invalid entry for ${uuid}`);
                 changed = true; // Invalid entry, remove it
            }
        }
    }
    // Return original if no changes needed, otherwise the new cleaned object
    // This avoids unnecessary writes if nothing was cleaned
    return changed ? cleanedRegistry : registry;
}

/**
 * Updates the timestamp for the current instance in the registry.
 */
function updateTimestamp() {
    if (!instanceUUID || isUnloading) return;

    const registry = getRegistry();
    if (registry[instanceUUID]) {
        registry[instanceUUID].ts = Date.now();
        setRegistry(registry);
         // console.log(`Instance Manager (${instanceSequence}): Heartbeat updated.`);
    } else {
        // Instance was removed unexpectedly (maybe by cleanup in another tab?), re-register?
        // For simplicity now, just log it. Could trigger re-initialization.
        console.warn(`Instance Manager (${instanceSequence}): Own entry missing during heartbeat. Attempting re-register might be needed.`);
        // Optionally, try to re-register:
        // clearInterval(heartbeatIntervalId);
        // init(); // Be careful of infinite loops
    }
}


/**
 * Registers the current instance, assigns a sequence number, and sets up cleanup.
 * @returns {number} The assigned sequence number (1-based).
 */
export function init() {
    if (instanceUUID) {
        console.warn("Instance Manager: Already initialized.");
        return instanceSequence;
    }

    isUnloading = false; // Reset unload flag on init
    instanceUUID = generateUniqueId();
    const now = Date.now();

    let registry = getRegistry();

    // 1. Clean up potentially stale entries from previous sessions/crashes
    registry = cleanupRegistry(registry, now);

    // 2. Determine the next sequence number
    let maxSeq = 0;
    for (const uuid in registry) {
         if (registry[uuid]?.seq) {
            maxSeq = Math.max(maxSeq, registry[uuid].seq);
         }
    }
    instanceSequence = maxSeq + 1;

    // 3. Add self to the registry
    registry[instanceUUID] = { seq: instanceSequence, ts: now };
    console.log(`Instance Manager: Registering instance ${instanceUUID} as #${instanceSequence}`);

    // 4. Write the updated registry back (this triggers 'storage' event in other tabs)
    setRegistry(registry);

    // 5. Set up heartbeat to keep timestamp fresh
    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId); // Clear previous if any
    heartbeatIntervalId = setInterval(updateTimestamp, HEARTBEAT_INTERVAL_MS);

    // 6. Set up cleanup on unload
    // Use 'pagehide' for better reliability on mobile and for BFCache scenarios
    window.addEventListener('pagehide', handleUnload);
    // Keep 'beforeunload' as a fallback, though 'pagehide' is preferred
    window.addEventListener('beforeunload', handleUnload);


    return instanceSequence;
}

/**
 * Unregisters the instance (removes it from the registry).
 * Intended to be called via event listeners ('pagehide', 'beforeunload').
 */
function unregisterInstance() {
    if (!instanceUUID) return; // Not initialized or already unregistered

    clearInterval(heartbeatIntervalId); // Stop heartbeat
    heartbeatIntervalId = null;

    console.log(`Instance Manager: Unregistering instance ${instanceUUID} (#${instanceSequence})`);
    let registry = getRegistry();
    if (registry[instanceUUID]) {
        delete registry[instanceUUID];
        setRegistry(registry); // Write removal back
    }
    instanceUUID = null; // Mark as unregistered locally
    instanceSequence = -1;
}

/**
 * Event handler wrapper for unloading events.
 * Sets a flag to prevent race conditions and calls unregister.
 */
function handleUnload(event) {
    // Check the persisted property for pagehide to avoid running on BFCache restoration
    if (event.type === 'pagehide' && event.persisted) {
        return;
    }

    if (!isUnloading) {
        isUnloading = true;
        unregisterInstance();
    }
}


/**
 * Gets the unique UUID of this instance.
 * @returns {string | null}
 */
export function getInstanceUUID() {
    return instanceUUID;
}

/**
 * Gets the assigned sequence number of this instance.
 * @returns {number} (1-based, or -1 if not initialized)
 */
export function getInstanceSequence() {
    return instanceSequence;
}

/**
 * (Optional) Gets the current list of active instances from the registry.
 * Note: This performs a read and cleanup.
 * @returns {object} A snapshot of the current active instances registry.
 */
export function getActiveInstances() {
    const now = Date.now();
    let registry = getRegistry();
    registry = cleanupRegistry(registry, now); // Clean before returning
    return registry;
}

// --- END OF FILE instanceManager.js ---