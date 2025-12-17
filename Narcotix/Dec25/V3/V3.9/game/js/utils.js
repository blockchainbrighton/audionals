import { MAX_MESSAGES, TUTORIAL_DISPLAY_TIME } from './config.js';

let gameMessages = [];
let tutorialQueue = [];
let currentTutorial = null;
let tutorialTimer = 0;
let activeTutorialDisplayTime = TUTORIAL_DISPLAY_TIME;


export function AABBCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function showTutorial(message, duration = TUTORIAL_DISPLAY_TIME) {
    const popup = document.getElementById('tutorialPopup');
    if (!popup) return;
    popup.textContent = message;
    popup.style.display = 'block';
    activeTutorialDisplayTime = duration;
    tutorialTimer = Date.now();

    setTimeout(() => {
        if (popup.textContent === message && Date.now() - tutorialTimer >= duration) { // Check if it's still the same message
             popup.style.display = 'none';
        }
    }, duration);
}

export function queueTutorial(message, conditionFunction) {
    tutorialQueue.push({ message, conditionFunction, shown: false });
}

export function processTutorialQueue(game) { // game instance might be needed for conditionFunction
    const popup = document.getElementById('tutorialPopup');
    if (!popup) return;

    if (currentTutorial && Date.now() - tutorialTimer < activeTutorialDisplayTime) return;
    if (currentTutorial) {
        popup.style.display = 'none';
        currentTutorial = null;
    }
    for (let i = 0; i < tutorialQueue.length; i++) {
        if (!tutorialQueue[i].shown && tutorialQueue[i].conditionFunction(game)) {
            currentTutorial = tutorialQueue[i];
            showTutorial(currentTutorial.message);
            tutorialQueue[i].shown = true;
            break; 
        }
    }
}

export function addMessage(text) {
    gameMessages.unshift(`[SYS] ${text}`);
    if (gameMessages.length > MAX_MESSAGES) gameMessages.pop();
    renderMessages();
}

export function renderMessages() {
    const log = document.getElementById('messageLog');
    if (!log) return;
    log.innerHTML = gameMessages.map(msg => `<div>${msg.replace(/</g, "<").replace(/>/g, ">")}</div>`).join('');
    log.scrollTop = 0; 
}

export function resetTutorials() {
    tutorialQueue.forEach(t => t.shown = false);
    currentTutorial = null;
    const popup = document.getElementById('tutorialPopup');
    if (popup) popup.style.display = 'none';
    tutorialTimer = 0;
}

export function clearMessages() {
    gameMessages = [];
    renderMessages();
}

export function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const obj = {};
        let currentField = '';
        let inQuotes = false;
        let fieldIndex = 0;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                if (fieldIndex < headers.length) {
                    obj[headers[fieldIndex]] = currentField.trim();
                }
                currentField = '';
                fieldIndex++;
            } else {
                currentField += char;
            }
        }
        // Add the last field
        if (fieldIndex < headers.length) {
             obj[headers[fieldIndex]] = currentField.trim();
        }

        result.push(obj);
    }
    return result;
}

export function generateId(prefix = 'id_') {
    return `${prefix}${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Validates if a string is a valid 3-digit or 6-digit hexadecimal color code.
 * @param {string} hex - The string to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function isValidHexColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Renders a capsule-shaped pill on the canvas with a gradient fill and stroke.
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} x - The x-coordinate of the top-left corner of the pill's bounding box.
 * @param {number} y - The y-coordinate of the top-left corner of the pill's bounding box.
 * @param {number} width - The width of the pill's bounding box.
 * @param {number} height - The height of the pill's bounding box.
 * @param {object} itemData - The item data object containing color information.
 * @param {object} [itemData.colors] - Optional. An object containing primary and secondary colors.
 * @param {string} [itemData.colors.primary='#00FFFF'] - The primary color (left side of gradient).
 * @param {string} [itemData.colors.secondary='#0000FF'] - The secondary color (right side of gradient).
 */
export function renderPill(ctx, x, y, width, height, itemData) {
    ctx.save();

    // Determine colors with fallback
    const primaryColor = itemData?.colors?.primary || '#00FFFF'; // Default to Cyan
    const secondaryColor = itemData?.colors?.secondary || '#0000FF'; // Default to Blue

    // Golden Glow Effect for "Goldie" pills
    if (primaryColor === '#FFD700') {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
    }

    // Calculate radius for rounded ends (half of the lesser dimension for a perfect circle)
    const radius = Math.min(width, height) / 2;

    // Begin drawing the capsule path
    ctx.beginPath();
    
    // Move to the start of the top line (after the left semicircle)
    ctx.moveTo(x + radius, y);
    
    // Top line
    ctx.lineTo(x + width - radius, y);
    
    // Right semicircle
    ctx.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, Math.PI * 0.5);
    
    // Bottom line
    ctx.lineTo(x + radius, y + height);
    
    // Left semicircle
    ctx.arc(x + radius, y + radius, radius, Math.PI * 0.5, Math.PI * 1.5);
    
    ctx.closePath();

    // Create linear gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, secondaryColor);

    // Fill the path with gradient
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add semi-transparent black stroke
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1; // A thin line for definition
    ctx.stroke();

    ctx.restore();
}

/*
 * Example Usage for renderPill:
 *
 * // Assume 'game.ctx' is your 2D rendering context and TILE_SIZE is defined.
 * // For demonstration, let's use dummy values for x, y, width, height.
 * // These calls would typically be made within a game's render loop.
 * const TILE_SIZE = 32; // Example tile size
 * const exampleCtx = document.createElement('canvas').getContext('2d'); // Dummy context for example
 *
 * // 1. Rendering a Unique NFT Pill (with specific colors from metadata)
 * const uniqueNftPillData = {
 *     colors: {
 *         primary: '#FF00FF', // Magenta
 *         secondary: '#FFFF00' // Yellow
 *     },
 *     name: "Chrono-Shifter"
 * };
 * // Call: renderPill(exampleCtx, 10, 10, TILE_SIZE, TILE_SIZE / 2, uniqueNftPillData);
 * // console.log(`Rendered NFT Pill: ${uniqueNftPillData.name}`);
 *
 * // 2. Rendering a Generic Pill (using fallback colors)
 * const genericPillData = {
 *     name: "Standard Issue NarcotiX"
 *     // No 'colors' property, so it will use the default Cyan to Blue gradient.
 * };
 * // Call: renderPill(exampleCtx, 50, 10, TILE_SIZE, TILE_SIZE / 2, genericPillData);
 * // console.log(`Rendered Generic Pill: ${genericPillData.name}`);
 *
 * // To integrate into the game's actual rendering, you would typically call this
 * // within a manager's render function (e.g., itemManager.renderItemsOnMap())
 * // when iterating through items that are pill-shaped.
 */