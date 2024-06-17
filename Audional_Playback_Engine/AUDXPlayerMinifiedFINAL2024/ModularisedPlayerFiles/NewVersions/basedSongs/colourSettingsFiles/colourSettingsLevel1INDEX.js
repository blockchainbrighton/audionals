// colourSettingsLevel1INDEX.js
console.log("Colour settings level 1 loaded");

// Cache the hex colors by their index, precomputed from the palette
const hexCache = {};

function initializeHexCache(palette) {
    for (const category in palette) {
        for (const color of palette[category]) {
            hexCache[color.index] = color.hex;
        }
    }
}

initializeHexCache(colorPalette);

function getHexFromIndex(index) {
    const hex = hexCache[index];
    if (hex) {
        return hex;
    }
    throw new Error(`Color with index ${index} not found in palette.`);
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


// Function to retrieve color hex from the palette
function getColorFromPalette(colorName, palette) {
    for (const category in palette) {
        for (const color of palette[category]) {
            if (color.class.includes(`color-${colorName}`)) {
                return color.hex;
            }
        }
    }
    throw new Error(`Color ${colorName} not found in palette.`);
}



// Function to get HSL color
function getHslColor(a, factor) {
    return `hsl(${a % factor * 360}, 100%, 50%)`;
}

// Cache for RGB values
const rgbCache = {};

// Convert hex to RGB with caching
function hexToRgb(hex) {
    if (rgbCache[hex]) {
        return rgbCache[hex];
    }

    hex = hex.replace("#", "");
    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }
    const bigint = parseInt(hex, 16);
    const rgb = {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
    rgbCache[hex] = rgb;
    return rgb;
}

// Function to get dynamic RGB color using cached indices
function getDynamicRgbWithIndex(x1, y1, x2, y2, colorIndex, palette) {
    const hex = getHexFromIndex(colorIndex, palette);
    const { r, g, b } = hexToRgb(hex);
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2, r, g, b) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColor : falseColor;
}


// Function to get conditional color using the palette
function getConditionalColor2(x, y, divisor, trueColor, falseColor, palette) {
    const trueColorHex = getColorFromPalette(trueColor, palette);
    const falseColorHex = getColorFromPalette(falseColor, palette);
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColorHex : falseColorHex;
}

{
const R = 100; // Set a default or required value for R in this context

// Function to get colors
function getColors1(o, a, l) {
    const v = l; // Alias for clarity, where l represents vertices

    const randomValues = Array.from({ length: 24 }, () => Math.random());
    const l0zR = l[0].z + R;
    const l2zR = l[2].z + R;
    const l1zR = l[1].z + R;
    const primaryAndSecondaryColors = [...colorPalette.primary, ...colorPalette.secondary];
    const randomColor1 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor2 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor3 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor4 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor5 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor6 = getRandomColor(primaryAndSecondaryColors).hex;

    // Variables using the input `a` and `l`
    const sinValue = Math.abs(Math.sin(a / 3000));
    const x = l[0].x;
    const y = l[0].y;
    const divisor = 1000;
    const zR255 = Math.floor((l[0].z + R) / (2 * R) * 255);
    const y2 = l[2].y;
    const x0 = l[0].x;
    const y0 = l[0].y;
    const x1 = l[1].x - 1500;
    const x2 = l[2].x - 1500;
    const x3 = l[1].x - 555;

    // Date-based variables
    const now = Date.now();
    const sinNow = Math.sin(now);
    const sinNowDiv1000 = Math.sin(now / 1000);
    const sinNowDiv2000 = Math.sin(now / 2000);
    const sinNowDiv10 = Math.sin(now / 10);
    const sinNowDiv5000 = Math.sin(now / 5000);
    const sinNowDiv100 = Math.sin(now / 100);
    const sinNowDivMinus17 = Math.sin(now / -17);

    const redYellowTrippyEyes = `rgb(${Math.floor(127 * sinNow + 512)}, ${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 8)})`;

    // Return dynamic color settings
    return [
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS
   

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#FF0000",
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


           // 4 stripe close scatters
            getConditionalColorWithIndex(l[0].x, l[0].y, 3, 15, 1, colorPalette), // "red" -> index 15
            getConditionalColorWithIndex(l[0].x, l[0].y, 3, 18, 1, colorPalette), // "white" -> index 18
            getConditionalColorWithIndex(l[0].x, l[0].y, 3, 1, 1, colorPalette),  // "blue" -> index 1
            getConditionalColorWithIndex(l[0].x, l[0].y, 3, 5, 1, colorPalette),  // "orange" -> index 5
            getConditionalColorWithIndex(l[0].x, l[0].y, 3, 4, 1, colorPalette),  // "green" -> index 4

            // 4 stripe Wide Scatters
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 15, 1, colorPalette), // "red" -> index 15
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 18, 1, colorPalette), // "white" -> index 18
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 1, 1, colorPalette),  // "blue" -> index 1
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 5, 1, colorPalette),  // "orange" -> index 5
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 4, 1, colorPalette),  // "green" -> index 4

            // Dramatic Colors
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 3, 1, colorPalette),  // "magenta" -> index 3
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 7, 1, colorPalette),  // "cyan" -> index 7
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 6, 1, colorPalette),  // "yellow" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 2, 1, colorPalette),  // "purple" -> index 2
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 16, 1, colorPalette), // "lime" -> index 16

            // Dark Dramatic Colors
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 3, 1, colorPalette),  // "darkmagenta" -> index 3 (same as magenta for demonstration)
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 7, 1, colorPalette),  // "darkcyan" -> index 7 (same as cyan for demonstration)
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 14, 1, colorPalette), // "goldenrod" -> index 14
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 19, 1, colorPalette), // "indigo" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 9, 1, colorPalette),  // "darkolivegreen" -> index 91
                        
            // 3 stripe wide scatters
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 2, 1, colorPalette),  // "blue" -> index 2
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 5, 1, colorPalette),  // "green" -> index 5

            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 4, 1, colorPalette),   // "magenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 8, 1, colorPalette),   // "cyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 7, 1, colorPalette),   // "yellow" -> index 7
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 3, 1, colorPalette),   // "purple" -> index 3
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 17, 1, colorPalette),  // "lime" -> index 17

            // Dark Dramatic Colors
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 4, 1, colorPalette),   // "darkmagenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 8, 1, colorPalette),   // "darkcyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 15, 1, colorPalette),  // "goldenrod" -> index 15
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 20, 1, colorPalette),  // "indigo" -> index 20
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 10, 1, colorPalette),  // "darkolivegreen" -> index 10

            // 1 stripe wide scatters NO BACKGROUND
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 2, 1, colorPalette),  // "blue" -> index 2
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 5, 1, colorPalette),  // "green" -> index 5

            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 4, 1, colorPalette),  // "magenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 8, 1, colorPalette),  // "cyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 19, 1, colorPalette), // "grey" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 3, 1, colorPalette),  // "purple" -> index 3
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 19, 1, colorPalette), // "white" -> index 19

            // Dark Dramatic Colors
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 4, 1, colorPalette),  // "darkmagenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 8, 1, colorPalette),  // "darkcyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 15, 1, colorPalette), // "goldenrod" -> index 15
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 20, 1, colorPalette), // "indigo" -> index 20
            getConditionalColorWithIndex(l[1].x, l[1].y, 10, 10, 1, colorPalette), // "darkolivegreen" -> index 10

            // 3 stripe wide scatters
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 2, 1, colorPalette),  // "blue" -> index 2
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 5, 1, colorPalette),  // "green" -> index 5

            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 4, 1, colorPalette),  // "magenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 8, 1, colorPalette),  // "cyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 7, 1, colorPalette),  // "yellow" -> index 7
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 3, 1, colorPalette),  // "purple" -> index 3
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 17, 1, colorPalette), // "lime" -> index 17

            // Dark Dramatic Colors
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 4, 1, colorPalette),  // "darkmagenta" -> index 4
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 8, 1, colorPalette),  // "darkcyan" -> index 8
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 15, 1, colorPalette), // "goldenrod" -> index 15
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 20, 1, colorPalette), // "indigo" -> index 20
            getConditionalColorWithIndex(l[1].x, l[1].y, 0.1, 10, 1, colorPalette), // "darkolivegreen" -> index 10

            getConditionalColorWithIndex(l[0].x, l[0].y, 0.1, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[0].x, l[0].y, 0.05, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[0].x, l[0].y, 0.0111, 19, 1, colorPalette), // "#444444" -> index 19

            // 1 stripe scatter on DARK RED BG
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 19, 1, colorPalette), // "0b0b0b" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 20, 1, colorPalette), // "indigo" -> index 20

            // 1 stripe scatter on DARK BLUE BG
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 19, 1, colorPalette), // "0b0b0b" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 3, 20, 1, colorPalette), // "indigo" -> index 20

            // 1 stripe scatter on DARK PURPLE BG
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 19, 1, colorPalette), // "0b0b0b" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 20, 1, colorPalette), // "indigo" -> index 20

            // 1 stripe scatter on DARK GREEN BG
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 19, 1, colorPalette), // "0b0b0b" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 5, 20, 1, colorPalette), // "indigo" -> index 20

            // 1 stripe scatter on DARK GREY BG
            getConditionalColorWithIndex(l[1].x, l[1].y, 8, 16, 1, colorPalette), // "red" -> index 16
            getConditionalColorWithIndex(l[1].x, l[1].y, 8, 19, 1, colorPalette), // "white" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 8, 19, 1, colorPalette), // "0b0b0b" -> index 19
            getConditionalColorWithIndex(l[1].x, l[1].y, 8, 6, 1, colorPalette),  // "orange" -> index 6
            getConditionalColorWithIndex(l[1].x, l[1].y, 8, 20, 1, colorPalette), // "indigo" -> index 20

            // // Wide 4 Row Scatter
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 4, 1, colorPalette),  // "magenta" -> index 4
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 8, 1, colorPalette),  // "cyan" -> index 8
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 7, 1, colorPalette),  // "yellow" -> index 7
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 3, 1, colorPalette),  // "purple" -> index 3
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 17, 1, colorPalette), // "lime" -> index 17
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 16, 1, colorPalette), // "red" -> index 16
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 19, 1, colorPalette), // "grey" -> index 19
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 19, 1, colorPalette), // "white" -> index 19
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 6, 1, colorPalette),  // "orange" -> index 6
            // getConditionalColorWithIndex(l[1].x, l[1].y, 10, 2, 1, colorPalette),  // "blue" -> index 2

            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 4, 1, colorPalette),  // "magenta" -> index 4
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 8, 1, colorPalette),  // "cyan" -> index 8
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 7, 1, colorPalette),  // "yellow" -> index 7
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 3, 1, colorPalette),  // "purple" -> index 3
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 17, 1, colorPalette), // "lime" -> index 17
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 16, 1, colorPalette), // "red" -> index 16
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 19, 1, colorPalette), // "grey" -> index 19
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 19, 1, colorPalette), // "white" -> index 19
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 6, 1, colorPalette),  // "orange" -> index 6
            // getConditionalColorWithIndex(l[0].x, l[1].y, 10, 2, 1, colorPalette),  // "blue" -> index 2

            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 4, 1, colorPalette),  // "magenta" -> index 4
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 8, 1, colorPalette),  // "cyan" -> index 8
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 7, 1, colorPalette),  // "yellow" -> index 7
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 3, 1, colorPalette),  // "purple" -> index 3
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 17, 1, colorPalette), // "lime" -> index 17
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 16, 1, colorPalette), // "red" -> index 16
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 19, 1, colorPalette), // "grey" -> index 19
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 19, 1, colorPalette), // "white" -> index 19
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 6, 1, colorPalette),  // "orange" -> index 6
            // getConditionalColorWithIndex(l[1].x, l[0].y, 10, 2, 1, colorPalette)   // "blue" -> index 2



  
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