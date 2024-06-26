console.log("Colour settings level 1 loaded");

// Caches using Map for efficient lookups
const hexCache = new Map();
const hslCache = new Map();
const rgbCache = new Map();

let cachedSelections = null;

// Initialize and cache the fallback color and modulator
function initializeSelections() {
    if (!cachedSelections) {
        const seed = BigInt(window.seed);
        if (typeof seed !== 'bigint' || seed < 0n) {
            throw new Error("[Seed] Seed must be a valid positive BigInt.");
        }

        const fallbackIndex = Number(seed % BigInt(fallbackColors.length));
        const modulatorIndex = Number(seed % BigInt(modulatorNumbers.length));
        
        cachedSelections = {
            fallbackColor: fallbackColors[fallbackIndex],
            modulator: modulatorNumbers[modulatorIndex]
        };

        // Add logging here
        console.log(`[Seed] Seed value: ${seed}`);
        console.log(`[Seed] Calculated fallback index: ${fallbackIndex}`);
        console.log(`[Seed] Selected fallback color using seed: ${cachedSelections.fallbackColor}`);
        console.log(`[Seed] Calculated modulator index: ${modulatorIndex}`);
        console.log(`[Seed] Selected modulator value: ${cachedSelections.modulator}`);
    }
    return cachedSelections;
}

// Initialize hex cache from the palette
function initializeHexCache(palette) {
    for (const category in palette) {
        for (const color of palette[category]) {
            hexCache.set(color.index, color.hex);
        }
    }
}

// Call the function to initialize hex cache with the provided color palette
initializeHexCache(colorPalette);

// Retrieve hex color from index
function getHexFromIndex(index) {
    if (hexCache.has(index)) {
        return hexCache.get(index);
    }
    throw new Error(`Color with index ${index} not found in provided palette.`);
}

// Function to get HSL color with caching
function getHslColor(a, factor) {
    const key = `${a}-${factor}`;
    if (hslCache.has(key)) {
        return hslCache.get(key);
    }

    const hsl = `hsl(${(a % factor) * 360}, 100%, 50%)`;
    hslCache.set(key, hsl);
    return hsl;
}

// Convert hex to RGB with caching
function hexToRgb(hex) {
    if (rgbCache.has(hex)) return rgbCache.get(hex);
    
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const bigint = parseInt(hex, 16);
    const rgb = {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
    rgbCache.set(hex, rgb);
    return rgb;
}

// Function to get conditional color using cached indices
function getConditionalColorWithIndex(x, y, divisor, trueColorIndex, falseColorIndex) {
    const trueColorHex = getHexFromIndex(trueColorIndex);
    const falseColorHex = getHexFromIndex(falseColorIndex);
    const condition = ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0;
    return condition ? trueColorHex : falseColorHex;
}

// Function to get a random color from a palette
function getRandomColor(palette) {
    const randomIndex = Math.floor(Math.random() * palette.length);
    return palette[randomIndex];
}

// Function to get RGB from the color palette
function getColorFromPalette(index, palette) {
    const color = palette.find(c => c.index === index);
    if (!color) throw new Error(`Color with index ${index} not found in provided palette.`);
    return hexToRgb(color.hex);
}

// Function to get dynamic RGB color using cached indices
function getDynamicRgbWithIndex(x1, y1, x2, y2, colorIndex) {
    const hex = getHexFromIndex(colorIndex);
    const { r, g, b } = hexToRgb(hex);
    const distance = Math.min(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50, 1);
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}

// Function to get the fallback color
function getFallbackColor() {
    return initializeSelections().fallbackColor;
}

// Function to get the modulator
function getModulatorByIndex() {
    return initializeSelections().modulator;
}

// Function to get color settings
function getColorSettings(colorSetting) {
    const settings = {
        peach: { rFactor: 1, gFactor: 2, bFactor: 3 },
        blue: { rFactor: 0.5, gFactor: 0.8, bFactor: 1.5 },
        // Add more color settings as needed
        default: { rFactor: 0.5, gFactor: 0.8, bFactor: 1.5 }
    };
    return settings[colorSetting] || settings.default;
}

// Function to get dynamic RGB color
function dynamicRgb(randomValue, baseZ, factor, colorSetting) {
    const { rFactor, gFactor, bFactor } = getColorSettings(colorSetting);
    const r = Math.floor(randomValue * ((baseZ + 255) / (factor * rFactor) * 255)) % 256;
    const g = Math.floor(randomValue * ((baseZ + 255) / (factor * gFactor) * 255)) % 256;
    const b = Math.floor(randomValue * ((baseZ + 255) / (factor * bFactor) * 255)) % 256;

    return (r > 0.01 || g > 0.01 || b > 0.01) ? `rgb(${r}, ${g}, ${b})` : getFallbackColor();
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2, r, g, b) {
    const distance = Math.min(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50, 1);
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
}

