// colourSettingsLevel3.js

console.log("Colour settings level 3 loaded");


{
    const R = 100; // Set a default or required value for R in this context
    
// Main function to get colors
function getColors3(o, a, l) {
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

    const hslFactor1 = 1;
    const hslFactor2 = 72 * 5;
    const hslFactor3 = 18 * 20;
    const hslFactor4 = 360;
    const hslFactor5 = 0.0005 * 180;
    const hslFactor6 = 0.09 * 0.88;

    // Store Date.now() in a variable to avoid multiple calls
    const now = Date.now();
    const sinNow = Math.sin(now);
    const sinNowDiv1000 = Math.sin(now / 1000);
    const sinNowDiv2000 = Math.sin(now / 2000);
    const sinNowDiv10 = Math.sin(now / 10);
    const sinNowDiv5000 = Math.sin(now / 5000);
    const sinNowDiv100 = Math.sin(now / 100);
    const sinNowDivMinus17 = Math.sin(now / -17);

    const redYellowTrippyEyes = `rgb(${Math.floor(127 * sinNow + 512)}, ${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 8)})`;


    return [

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CRAWLERS ON BLACK BACKGROUND
   
   
   
   
   
    getConditionalColorWithIndex(x0, y0, 345, 15, 1, window.colorPalette), // Red -> index 15, Black -> index 1
    getConditionalColorWithIndex(x0, y0, 345, 21, 1, window.colorPalette), // White -> index 21, Black -> index 1
    getConditionalColorWithIndex(x0, y0, 345, 10, 1, window.colorPalette), // Very dark blue -> index 10, Black -> index 1
    getConditionalColorWithIndex(x0, y0, 345, 5, 1, window.colorPalette),  // Orange -> index 5, Black -> index 1
    getConditionalColorWithIndex(x0, y0, 345, 4, 1, window.colorPalette),  // Green -> index 4, Black -> index 1
    getConditionalColorWithIndex(x0, y0, 500, 15, 1, window.colorPalette), // Red, Small dots
    getConditionalColorWithIndex(x0, y0, 100, 21, 1, window.colorPalette), // White, Large squares
    getConditionalColorWithIndex(x0, y0, 250, 10, 1, window.colorPalette), // Very dark blue, Medium triangles

    getConditionalColorWithIndex(x0, y0, 90, 14, 1, window.colorPalette),  // Dark orange, Large rectangles
    getConditionalColorWithIndex(x0, y0, 140, 15, 1, window.colorPalette), // Red, Medium stars
    getConditionalColorWithIndex(x0, y0, 450, 16, 1, window.colorPalette), // Teal, Tiny circles
    getConditionalColorWithIndex(x0, y0, 60, 17, 1, window.colorPalette),  // Navy, Large ovals
    getConditionalColorWithIndex(x0, y0, 220, 18, 1, window.colorPalette), // Silver, Medium squares
    getConditionalColorWithIndex(x0, y0, 330, 19, 1, window.colorPalette), // Indigo, Small triangles
    getConditionalColorWithIndex(x0, y0, 410, 21, 1, window.colorPalette), // White, Tiny Xs
    getConditionalColorWithIndex(x0, y0, 70, 6, 1, window.colorPalette),   // Gold, Large stars
    getConditionalColorWithIndex(x0, y0, 180, 10, 1, window.colorPalette), // Very dark blue, Medium hexagons
    getConditionalColorWithIndex(x0, y0, 420, 2, 1, window.colorPalette),  // Purple, Tiny circles
    getConditionalColorWithIndex(x0, y0, 80, 5, 1, window.colorPalette),   // Orange, Large waves

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


                // IGUANA EYES
                getDynamicRgb(x2, y2, x2, y0, 255, 215, 0),   // Gold
                getDynamicRgb(x2, y2, x2, y0, 192, 192, 192), // Silver
                getDynamicRgb(x2, y2, x2, y0, 255, 165, 0),   // Orange
                getDynamicRgb(x2, y2, x2, y0, 128, 0, 128),   // Purple
                getDynamicRgb(x2, y2, x2, y0, 255, 0, 0),     // Red
                getDynamicRgb(x2, y2, x2, y0, 0, 128, 0),     // Green
                getDynamicRgb(x2, y2, x2, y0, 0, 0, 255),     // Blue


               // #0 Original Crazy One
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 128 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),



// #74
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 16 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #75
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 8 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #76
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (3 * R) * 255));
    return colorValue > 64 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #77
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (4 * R) * 255));
    return colorValue > 32 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #78
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (5 * R) * 255));
    return colorValue > 16 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #79
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (6 * R) * 255));
    return colorValue > 8 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),



// #87 Leveraging a logarithmic scale for fine-tuned shades
(() => {
    const colorValue = Math.floor(Math.log(Math.random() * 10 + 1) / Math.log(11) * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 60 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #88 Utilizing exponential growth for sharp contrast
(() => {
    const colorValue = Math.floor(Math.pow(Math.random() * 2, 2) * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 120 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #89 Blending thresholds for a subtle grayscale dance
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (9 * R) * 255));
    return colorValue > 10 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'light-mode-color';
})(),


          // CRAZY EYES
        
          (randomValues[1] * (l0zR / (3 * R) * 75)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))})` : 
          "#000a39",


      (randomValues[2] * (l1zR / (111 * R) * 299999)) > 32 ? 
          `rgb(${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))}, ${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))}, ${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))})` : 
          "alternative-color",

      (randomValues[3] * (l0zR / (0.01 * R) * 0.17)) > 32 ? 
          `rgb(${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))}, ${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))}, ${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))})` : 
          "alternative-color",

      (randomValues[4] * (l0zR / (0.1 * R) * 255)) > 32 ? 
          `rgb(${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))}, ${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))}, ${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))})` : 
          "alternative-color",

      (randomValues[5] * (l0zR / (4 * R) * 255)) > 32 ? 
          `rgb(${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))}, ${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))}, ${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))})` : 
          "alternative-color",

      (randomValues[6] * (l0zR / (0.01 * R) * 255)) > 32 ? 
          `rgb(${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))}, ${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))}, ${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))})` : 
          "alternative-color",

      (randomValues[7] * (l0zR / (2.5 * R) * 55)) > 32 ? 
          `rgb(${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))}, ${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))}, ${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))})` : 
          "alternative-color",

      (randomValues[13] * (l0zR / (5 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))})` : 
          "grey",

      (randomValues[14] * (l0zR / (111 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))})` : 
          "#5a0000",

      (randomValues[15] * (l0zR / (111 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))})` : 
          "blue",

      (randomValues[16] * (l0zR / (111 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))})` : 
          "green",

      (randomValues[17] * (l0zR / (111 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))})` : 
          "grey",

      (randomValues[18] * (l0zR / (111 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))})` : 
          "#1f1f1f",

      (randomValues[19] * (l0zR / (3 * R) * 75)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))})` : 
          "#390000",

      (randomValues[20] * (l0zR / (3 * R) * 75)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))})` : 
          "#00390e",

      `rgb(${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))})`, // Disco Eyes

            // STROBES
            getHslColor(a, hslFactor1), // STROBE
            getHslColor(a + 1, hslFactor1), // STROBE
            getHslColor(a, hslFactor2), // STROBE
            getHslColor(a + 18, hslFactor3), // Strobe  
            getHslColor(a + 18, hslFactor2), // Yellow Strobe
            getHslColor(7 * a % hslFactor4, hslFactor4), // colour changing strobe
            getHslColor(a - 1, hslFactor5), // red/orange flicker
            getHslColor(a % hslFactor6, 0.76), // red/orange flicker

            // SLIGHT RIPPLES IN SOLID COLOURS
            `rgb(${Math.floor(506 * sinNow + 750)}, ${Math.floor(sinNowDivMinus17 / -750 * 127)}, ${Math.floor(2000 * sinNowDiv2000 + 10002)})`, // PINK 
            // SLOWLY ROTATING AND FADING COLOURS
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1200) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 1400) + 55)}, ${Math.floor(150 * Math.sin(Date.now() / 1600) + 105)})`,
            `rgb(${Math.floor(200 * Math.sin(Date.now() / 1000) + 55)}, ${Math.floor(200 * Math.sin(Date.now() / 1300) + 55)}, ${Math.floor(200 * Math.sin(Date.now() / 1700) + 55)})`,
            `rgb(${Math.floor(100 * Math.sin(Date.now() / 1100) + 155)}, ${Math.floor(150 * Math.sin(Date.now() / 1900) + 105)}, ${Math.floor(255 * Math.sin(Date.now() / 2100) + 128)})`,
            `rgb(${Math.floor(150 * Math.sin(Date.now() / 1800) + 105)}, ${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)}, ${Math.floor(100 * Math.sin(Date.now() / 1900) + 155)})`,
        

            // RAINBOW Cycle Scatters
            getConditionalColor(l[0].x, l[0].y, 0.1, randomColor1, "black"), // Cycle Scatter
            getConditionalColor(l[1].x, l[0].y, 0.1, randomColor2, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.2, randomColor3, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.3, randomColor4, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.5, randomColor5, "black"), // Rainbow scatter

            getConditionalColor(l[0].x, l[1].y, 0.05, randomColor1, "black"), // Cycle Scatter
            getConditionalColor(l[1].x, l[1].y, 0.05, randomColor2, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.01, randomColor3, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.001, randomColor4, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.0001, randomColor5, "black"), // Rainbow scatter



            // Spinning Eyes
            `rgb(${Math.floor(127 * sinNow + 4)}, ${Math.floor(127 * sinNowDiv10 + 128)}, ${Math.floor(127 * sinNowDiv5000 + 32)})`, // Trippy Eyes
            redYellowTrippyEyes, // Red/Yellow trippy eyes
            `rgb(${Math.floor(111 * sinNow + 200000)}, ${Math.floor(127 * sinNow + 12)}, ${Math.floor(127 * sinNowDiv100 + 4)})`, // Trippy Eyes Red/orange
            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes full spectrum
            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes
        ];

    }

// Function to return the length of the array generated by getColors3
function getColors3Length() {
    const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
    const length = getColors3(null, null, defaultL).length;
    console.log(`getColors3 length: ${length}`);
    return length;
}

// Log the length of the colors array when the file is loaded
getColors3Length();
}


