// colourSettingsLevel3.js

console.log("Colour settings level 3 loaded");


{
    const R = 100; // Set a default or required value for R in this context
    
// Main function to get colors
function getColors3(o, a, l) {
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


                 // MIDDLE LINE CRAWLER TOP LEFT
                 getConditionalColor(x3, y0, 100, "red", "blue"),
                 getConditionalColor(x3, y0, 100, "red", "green"),
                 getConditionalColor(x3, y0, 100, "red", "orange"),
                 getConditionalColor(x3, y0, 100, "red", "white"),
                 getConditionalColor(x3, y0, 100, "blue", "red"),
                 getConditionalColor(x3, y0, 100, "blue", "green"),
                 getConditionalColor(x3, y0, 100, "blue", "orange"),
                 getConditionalColor(x3, y0, 100, "blue", "white"),
                 getConditionalColor(x3, y0, 100, "green", "blue"),
                 getConditionalColor(x3, y0, 100, "green", "red"),
                 getConditionalColor(x3, y0, 100, "green", "orange"),
                 getConditionalColor(x3, y0, 100, "green", "white"),
                 getConditionalColor(x3, y0, 100, "orange", "red"),
                 getConditionalColor(x3, y0, 100, "orange", "green"),
                 getConditionalColor(x3, y0, 100, "orange", "blue"),
                 getConditionalColor(x3, y0, 100, "orange", "white"),


            // MIDDLE LINE CRAWLER BOTTOM RIGHT
            getConditionalColor(x1, y0, -100, "red", "blue"),
            getConditionalColor(x1, y0, -100, "red", "green"),
            getConditionalColor(x1, y0, -100, "red", "orange"),
            getConditionalColor(x1, y0, -100, "red", "white"),
            getConditionalColor(x1, y0, -100, "blue", "red"),
            getConditionalColor(x1, y0, -100, "blue", "green"),
            getConditionalColor(x1, y0, -100, "blue", "orange"),
            getConditionalColor(x1, y0, -100, "blue", "white"),
            getConditionalColor(x1, y0, -100, "green", "blue"),
            getConditionalColor(x1, y0, -100, "green", "red"),
            getConditionalColor(x1, y0, -100, "green", "orange"),
            getConditionalColor(x1, y0, -100, "green", "white"),
            getConditionalColor(x1, y0, -100, "orange", "red"),
            getConditionalColor(x1, y0, -100, "orange", "green"),
            getConditionalColor(x1, y0, -100, "orange", "blue"),
            getConditionalColor(x1, y0, -100, "orange", "white"),

                 // 3 SQUARE MIDDLE CRAWLER
                 getConditionalColor(x2, y0, -300, "red", "blue"),
                 getConditionalColor(x2, y0, -300, "red", "green"),
                 getConditionalColor(x2, y0, -300, "red", "orange"),
                 getConditionalColor(x2, y0, -300, "red", "white"),
                 getConditionalColor(x2, y0, -300, "blue", "red"),
                 getConditionalColor(x2, y0, -300, "blue", "green"),
                 getConditionalColor(x2, y0, -300, "blue", "orange"),
                 getConditionalColor(x2, y0, -300, "blue", "white"),
                 getConditionalColor(x2, y0, -300, "green", "blue"),
                 getConditionalColor(x2, y0, -300, "green", "red"),
                 getConditionalColor(x2, y0, -300, "green", "orange"),
                 getConditionalColor(x2, y0, -300, "green", "white"),
                 getConditionalColor(x2, y0, -300, "orange", "red"),
                 getConditionalColor(x2, y0, -300, "orange", "green"),
                 getConditionalColor(x2, y0, -300, "orange", "blue"),
                 getConditionalColor(x2, y0, -300, "orange", "white"),


            // BOTTOM RIGHT CORNER 
            getConditionalColor(x2, y0, 600, "red", "blue"),
            getConditionalColor(x2, y0, 600, "red", "green"),
            getConditionalColor(x2, y0, 600, "red", "orange"),
            getConditionalColor(x2, y0, 600, "red", "white"),
            getConditionalColor(x2, y0, 600, "blue", "red"),
            getConditionalColor(x2, y0, 600, "blue", "green"),
            getConditionalColor(x2, y0, 600, "blue", "orange"),
            getConditionalColor(x2, y0, 600, "blue", "white"),
            getConditionalColor(x2, y0, 600, "green", "blue"),
            getConditionalColor(x2, y0, 600, "green", "red"),
            getConditionalColor(x2, y0, 600, "green", "orange"),
            getConditionalColor(x2, y0, 600, "green", "white"),
            getConditionalColor(x2, y0, 600, "orange", "red"),
            getConditionalColor(x2, y0, 600, "orange", "green"),
            getConditionalColor(x2, y0, 600, "orange", "blue"),
            getConditionalColor(x2, y0, 600, "orange", "white"),
            getConditionalColor(x2, y0, 600, "orange", "black"),

            // EU Flag Styles
            getConditionalColor(x0, y0, 15, "orange", "blue"),
            getConditionalColor(x0, y0, 15, "red", "blue"), 
            getConditionalColor(x0, y0, 15, "red", "white"), 
            getConditionalColor(x0, y0, 15, "white", "blue"), 
            getConditionalColor(x0, y0, 15, "blue", "white"), 
            getConditionalColor(x0, y0, 15, "white", "red"), 
            getConditionalColor(x0, y0, 15, "orange", "blue"), 
            getConditionalColor(x0, y0, 15, "red", "orange"),
            getConditionalColor(x0, y0, 15, "orange", "white"), 
            getConditionalColor(x0, y0, 15, "white", "orange"),
            getConditionalColor(x0, y0, 15, "grey", "red"),
            getConditionalColor(x0, y0, 15, "grey", "blue"),
            getConditionalColor(x0, y0, 15, "grey", "green"),
            getConditionalColor(x0, y0, 15, "grey", "orange"),
            getConditionalColor(x0, y0, 15, "red", "grey"),
            getConditionalColor(x0, y0, 15, "blue", "grey"),
            getConditionalColor(x0, y0, 15, "green", "grey"),
            getConditionalColor(x0, y0, 15, "orange", "grey"),

            getConditionalColor(x1, y0, 8, "orange", "black"),
            getConditionalColor(x2, y0, 9, "red", "black"), 
            getConditionalColor(x3, y0, 10, "white", "black"), 
            getConditionalColor(x1, y0, 11, "purple", "black"), 
            getConditionalColor(x2, y0, 12, "blue", "black"), 
            getConditionalColor(x3, y0, 13, "white", "black"), 
            getConditionalColor(x2, y0, 15, "red", "black"),
            getConditionalColor(x3, y0, 16, "orange", "black"), 
            getConditionalColor(x1, y0, 17, "white", "black"),
            getConditionalColor(x2, y0, 16, "grey", "black"),
            getConditionalColor(x3, y0, 15, "grey", "black"),
            getConditionalColor(x1, y0, 14, "grey", "black"),
            getConditionalColor(x2, y0, 13, "grey", "black"),
            getConditionalColor(x3, y0, 12, "red", "black"),
            getConditionalColor(x1, y0, 11, "blue", "black"),
            getConditionalColor(x2, y0, 10, "green", "black"),
            getConditionalColor(x3, y0, 9, "orange", "black"),

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