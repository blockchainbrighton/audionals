// colourSettingsLevel1INDEX.js
console.log("Colour settings level 1 loaded");

// Cache the hex colors by their index, precomputed from the palette
const hexCache = {};
const colorNameCache = {};
const hslCache = {};
const rgbCache = {};


function initializeHexCache(palette) {
    for (const category in palette) {
        for (const color of palette[category]) {
            hexCache[color.index] = color.hex;
        }
    }
}

initializeHexCache(colorPalette);


// Retrieve hex color from index
function getHexFromIndex(index, palette) {
    const hex = hexCache[index];
    if (hex) {
        return hex;
    }
    throw new Error(`Color with index ${index} not found in provided palette.`);
}

// Function to get conditional color using cached indices
function getConditionalColorWithIndex(x, y, divisor, trueColorIndex, falseColorIndex, palette) {
    const trueColorHex = getHexFromIndex(trueColorIndex, palette);
    const falseColorHex = getHexFromIndex(falseColorIndex, palette);
    const condition = (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0;
    return condition ? trueColorHex : falseColorHex;
}


// Function to get a random color from a palette
function getRandomColor(palette) {
    const colors = palette.flat();
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}


// Function to get RGB from the color palette
function getColorFromPalette(index, palette) {
    const color = palette[index % palette.length].hex;
    return hexToRgb(color);
}

// Function to get HSL color
function getHslColor(a, factor) {
    const key = `${a}-${factor}`;
    if (hslCache[key]) {
        return hslCache[key];
    }

    const hsl = `hsl(${(a % factor) * 360}, 100%, 50%)`;
    hslCache[key] = hsl;
    return hsl;
}

// Convert hex to RGB with caching
// Helper function to convert hex to RGB
function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}


// Function to get dynamic RGB color using cached indices
function getDynamicRgbWithIndex(x1, y1, x2, y2, colorIndex, palette) {
    const hex = getHexFromIndex(colorIndex, palette);
    const { r, g, b } = hexToRgb(hex);
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(${r}, ${g}, ${b}, ${Math.min(distance, 1)})`; // Ensure alpha does not exceed 1
}



const fallbackColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
const modulatorNumbers = [1, 10, 100, 250, 500, 1000, 2000, 3000, 4000, 5000, 10000, 25000, 50000];

// Function to initialize and cache the fallback color and modulator
const initializeSelections = (function() {
    let selections = null; // Cached selections

    return function() {
        if (selections === null) { // Execute only once
            // Convert seed to BigInt for handling large numbers
            const seed = BigInt(window.seed);
            if (typeof seed !== 'bigint' || seed < 0n) {
                throw new Error("[Seed] Seed must be a valid positive BigInt.");
            }

            const fallbackIndex = Number(seed % BigInt(fallbackColors.length));
            const modulatorIndex = Number(seed % BigInt(modulatorNumbers.length));

            const fallbackColor = fallbackColors[fallbackIndex];
            const modulator = modulatorNumbers[modulatorIndex];

            // Log the seed and selected values once
            console.log(`[Seed] Seed value: ${seed}`);
            console.log(`[Seed] Calculated fallback index: ${fallbackIndex}`);
            console.log(`[Seed] Selected fallback color using seed: ${fallbackColor}`);
            console.log(`[Seed] Calculated modulator index: ${modulatorIndex}`);
            console.log(`[Seed] Selected modulator value: ${modulator}`);

            selections = { fallbackColor, modulator };
        }
        return selections;
    };
})();

// Function to get the fallback color
function getFallbackColor() {
    return initializeSelections().fallbackColor;
}

// Function to get the modulator
function getModulatorByIndex() {
    return initializeSelections().modulator;
}

function getColorSettings(colorSetting) {
    const settings = {
        peach: { rFactor: 1, gFactor: 2, bFactor: 3 },
        blue: { rFactor: 0.5, gFactor: 0.8, bFactor: 1.5 },
        // Add more color settings as needed
        default: {  rFactor: 0.5, gFactor: 0.8, bFactor: 1.5  }
    };
    return settings[colorSetting] || settings.default;
}

// Usage:
// Initialize seed with a specific value or use a random value
// or
// window.seed = Math.floor(Math.random() * 100000); // For random seed testing

const fallbackColor = getFallbackColor();
const modulator = getModulatorByIndex();
console.log(`[Seed] Final fallback color: ${fallbackColor}`);
console.log(`[Seed] Final modulator value: ${modulator}`);


function dynamicRgb(randomValue, baseZ, factor, colorSetting) {
    const { rFactor, gFactor, bFactor } = getColorSettings(colorSetting);
    const r = Math.floor(randomValue * ((baseZ + 255) / (factor * rFactor) * 255)) % 256;
    const g = Math.floor(randomValue * ((baseZ + 255) / (factor * gFactor) * 255)) % 256;
    const b = Math.floor(randomValue * ((baseZ + 255) / (factor * bFactor) * 255)) % 256;

    const fallbackColor = getFallbackColor(); // Get cached fallback color

    return (r > 0.01 || g > 0.01 || b > 0.01) ? `rgb(${r}, ${g}, ${b})` : fallbackColor;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2, r, g, b) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
}

{
    const R = 100; // Set a default or required value for R in this context
  
    // Function to get colors
    function getColors1(o, a, l) {
      const v = l; // Alias for clarity, where l represents vertices
  
      // Cache values of x, y, z for reuse
      const { x: x0, y: y0, z: z0 } = l[0];
      const { x: x1, y: y1 } = l[1];
      const { x: x2, y: y2 } = l[2];
  
      // Precompute z values
      const l0zR = z0 + R;
      const l1zR = l[1].z + R;
      const l2zR = l[2].z + R;
  
      // Pre-generate random values for reuse
      const randomValues = Array.from({ length: 24 }, () => Math.random());
  
      // Compute sine values for dynamic colors
      const now = Date.now();
      const sinNow = Math.sin(now);
  

    
      // Use a complete range of color indexes from 1 to 23
      const colorIndexes = Array.from({ length: 23 }, (_, i) => i + 1);

  
      // Return dynamic color settings
      return [

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS
   

            // (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            // `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            // "#FF0000",
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



  
        // 4 stripe close scatters
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(x0, y0, 3, [15, 18, 1, 5, 4][i], 1, window.colorPalette)
        ),
  
        // 4 stripe Wide Scatters
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(x1, y1, 3, [15, 18, 1, 5, 4][i], 1, window.colorPalette)
        ),
  
        // Repeated close and wide scatters with different divisors
        ...[10, 1.77].flatMap(divisor =>
          Array.from({ length: 5 }, (_, i) =>
            getConditionalColorWithIndex(l[0].x, l[0].y, divisor, [15, 18, 1, 5, 4][i], 1, window.colorPalette)
          )
        ),
  
        // Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 3, [3, 7, 6, 2, 16][i], 1, window.colorPalette)
        ),
  
        // Dark Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 3, [3, 7, 14, 19, 9][i], 1, window.colorPalette)
        ),
  
        // 3 stripe wide scatters
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 5, [16, 19, 2, 6, 5, 4, 8, 7, 3, 17][i], 1, window.colorPalette)
        ),
  
        // 1 stripe wide scatters NO BACKGROUND
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 10, [16, 19, 2, 6, 5, 4, 8, 19, 3, 19][i], 1, window.colorPalette)
        ),
  
        // Dark Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 10, [4, 8, 15, 20, 10][i], 1, window.colorPalette)
        ),
  
        // Wide 4 Row Scatter
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 10, [4, 8, 7, 3, 17, 16, 19, 19, 6, 2][i], 1, window.colorPalette)
        ),
  
        // Additional color variation
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[0].x, l[1].y, 10, [4, 8, 7, 3, 17, 16, 19, 19, 6, 2][i], 1, window.colorPalette)
        ),
  
        // Repeated patterns with different positions
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[0].y, 10, [4, 8, 7, 3, 17, 16, 19, 19, 6, 2][i], 1, window.colorPalette)
        )
      ];
    }
  
    // Function to return the length of the array generated by getColors1
    function getColors1Length() {
      // Safely generate a default color array for length calculation
      const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
      const length = getColors1(null, null, defaultL).length;
      console.log(`getColors1 length: ${length}`);
      return length;
    }
  
    // Log the length of the colors array when the file is loaded
    getColors1Length();
  }