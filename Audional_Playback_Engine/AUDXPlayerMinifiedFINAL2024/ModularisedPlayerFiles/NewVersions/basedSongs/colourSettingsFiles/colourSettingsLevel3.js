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
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS

            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes

            getConditionalColor(x1, y0, 14, "orange", "black"), 

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#422000",
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

// #67 Dynamic alternative-color based on lightness - GREY SCALE CRAZY ONE
((lightness) => lightness > 128 ? `rgb(${lightness}, ${lightness}, ${lightness})` : 'dark-mode-color')(Math.random() * Math.floor((v[0].z + R) / (2 * R) * 255)),

// #72
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 64 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #73
(() => {
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 32 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
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




// #82 Mixing thresholds for an unpredictable pattern
(() => {
    const threshold = [64, 128, 32, 16].sort(() => 0.5 - Math.random())[0];
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > threshold ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #83 Dynamic range with a random factor affecting lightness
(() => {
    const randomFactor = Math.random() < 0.5 ? 2 : 3;
    const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (randomFactor * R) * 255));
    return colorValue > 50 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'dark-mode-color';
})(),

// #84 Using a cosine function for a cyclic grayscale effect
(() => {
    const colorValue = Math.floor((Math.cos(Date.now() / 1000) + 1) / 2 * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 100 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
})(),

// #85 Incorporating sine for alternating dark and light cycles
(() => {
    const colorValue = Math.floor((Math.sin(Date.now() / 2000) + 1) / 2 * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 75 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'dark-mode-color';
})(),

// #86 Adjusting color based on a quadratic curve for depth
(() => {
    const colorValue = Math.floor(Math.pow(Math.random(), 2) * ((v[0].z + R) / (2 * R) * 255));
    return colorValue > 90 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
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

      (randomValues[8] * (l0zR / (2 * R) * 255)) > 32 ? 
          `rgb(${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))})` : 
          "alternative-color",

      (randomValues[9] * (l0zR / (5 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))})` : 
          "red",

      (randomValues[10] * (l0zR / (5 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))})` : 
          "blue",

      (randomValues[11] * (l0zR / (5 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))})` : 
          "orange",

      (randomValues[12] * (l0zR / (5 * R) * 255)) > 0.1 ? 
          `rgb(${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))})` : 
          "green",

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
            `rgb(${Math.floor(100 * Math.sin(Date.now() / 1300) + 155)}, ${Math.floor(200 * Math.sin(Date.now() / 1500) + 55)}, ${Math.floor(255 * Math.sin(Date.now() / 1700) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1100) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1300) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)})`,
            `rgb(${Math.floor(150 * Math.sin(Date.now() / 2000) + 105)}, ${Math.floor(100 * Math.sin(Date.now() / 2200) + 155)}, ${Math.floor(255 * Math.sin(Date.now() / 2500) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 1700) + 55)}, ${Math.floor(150 * Math.sin(Date.now() / 1900) + 105)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 2100) + 128)}, ${Math.floor(100 * Math.sin(Date.now() / 2300) + 155)}, ${Math.floor(255 * Math.sin(Date.now() / 2500) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1800) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 2000) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 2200) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1600) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1800) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 2000) + 55)})`,


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

            getConditionalColor(l[1].x, l[1].y, 1, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 2, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 3, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 4, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 5, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 6, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 7, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 8, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 9, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 10, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 11, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 12, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 13, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 14, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 15, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 16, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 17, randomColor6, "black"), // Rainbow scatter

            // Scatter with SOLID BG  // TICKER TAPE PARADE

            getConditionalColor(l[1].x, l[1].y, 3, "grey", "red"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "white"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "green"), // Wide 4 Row Scatter
            getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // cycle scatter

            randomColor1, // Using precomputed random color

          


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