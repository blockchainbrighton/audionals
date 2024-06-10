// colourSettingsLevel2.js
console.log("Colour settings level 2 loaded");

{
  const R = 100; // Set a default or required value for R in this context
  

// Main function to get colors
function getColors2(o, a, l) {
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

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#422000",
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



           
          
       
            // DISCO BALL
            getRandomColor([colorPalette.hslColors]), // DISCO
            randomValues[22] > 0.5 ? `hsl(${Math.floor(60 * randomValues[23]) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * randomValues[24]) + 10}, 90%, 60%)`, // Disco Ball

         

             // STARING EYES
            `rgb(${randomValues[31] > 0.5 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes


            // FULL SHAPE COLOUR (50/50)
            // sinValue < 0.5 ? "red" : "blue", // Full Shape Colour
            // Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue", // Full Shape Colour

            // getConditionalColor(x, y, 280, "green", "darkorange"), 
            // getConditionalColor(x, y, 111, "white", "red"), 
            // getConditionalColor(x, y, 120, "blue", "blue"), 
            // getConditionalColor(x, y, 111, "red", "darkorange"), 
            // getConditionalColor(x, y, 95, "blue", "blue"),
            // getConditionalColor(x, y, 111, "green", "white"),
            // getConditionalColor(x, y, 111, "darkgreen", "grey"),
            // getConditionalColor(x, y, 111, "lightorange", "darkgrey"),

            // MIDDLE LINE CRAWLER TOP LEFT
            getConditionalColor(x3, y0, 100, "red", "grey"),
            getConditionalColor(x3, y0, 100, "red", "grey"),
            getConditionalColor(x3, y0, 100, "red", "gray"),
            getConditionalColor(x3, y0, 100, "red", "white"),
            getConditionalColor(x3, y0, 100, "blue", "red"),
            getConditionalColor(x3, y0, 100, "blue", "gray"),
            getConditionalColor(x3, y0, 100, "blue", "orange"),
            getConditionalColor(x3, y0, 100, "blue", "white"),
            getConditionalColor(x3, y0, 100, "green", "blue"),
            getConditionalColor(x3, y0, 100, "green", "red"),
            getConditionalColor(x3, y0, 100, "black", "red"),
            getConditionalColor(x3, y0, 100, "purple", "orange"),
            getConditionalColor(x3, y0, 100, "black", "white"),
            getConditionalColor(x3, y0, 100, "orange", "red"),
            getConditionalColor(x3, y0, 100, "purple", "gray"),
            getConditionalColor(x3, y0, 100, "black", "blue"),
            getConditionalColor(x3, y0, 100, "gray", "white"),


            // MIDDLE LINE CRAWLER BOTTOM RIGHT
            getConditionalColor(x1, y0, -100, "red", "blue"),
            getConditionalColor(x1, y0, -100, "red", "grey"),
            getConditionalColor(x1, y0, -100, "red", "orange"),
            getConditionalColor(x1, y0, -100, "red", "white"),
            getConditionalColor(x1, y0, -100, "blue", "red"),
            getConditionalColor(x1, y0, -100, "blue", "purple"),
            getConditionalColor(x1, y0, -100, "blue", "orange"),
            getConditionalColor(x1, y0, -100, "blue", "white"),
            getConditionalColor(x1, y0, -100, "green", "blue"),
            getConditionalColor(x1, y0, -100, "green", "red"),
            getConditionalColor(x1, y0, -100, "green", "orange"),
            getConditionalColor(x1, y0, -100, "green", "white"),
            getConditionalColor(x1, y0, -100, "orange", "red"),
            getConditionalColor(x1, y0, -100, "orange", "maroon"), 
            getConditionalColor(x1, y0, -100, "orange", "blue"),
            getConditionalColor(x1, y0, -100, "orange", "white"),

            // 3 SQUARE MIDDLE CRAWLER
            getConditionalColor(x2, y0, -300, "red", "blue"),
            getConditionalColor(x2, y0, -300, "red", "black"),
            getConditionalColor(x2, y0, -300, "red", "orange"),
            getConditionalColor(x2, y0, -300, "red", "white"),
            getConditionalColor(x2, y0, -300, "blue", "red"),
            getConditionalColor(x2, y0, -300, "blue", "red"),
            getConditionalColor(x2, y0, -300, "blue", "orange"),
            getConditionalColor(x2, y0, -300, "blue", "white"),
            getConditionalColor(x2, y0, -300, "green", "blue"),
            getConditionalColor(x2, y0, -300, "green", "red"),
            getConditionalColor(x2, y0, -300, "green", "orange"),
            getConditionalColor(x2, y0, -300, "green", "white"),
            getConditionalColor(x2, y0, -300, "orange", "red"),
            getConditionalColor(x2, y0, -300, "orange", "black"),
            getConditionalColor(x2, y0, -300, "orange", "blue"),
            getConditionalColor(x2, y0, -300, "orange", "white"),


            // BOTTOM RIGHT CORNER 
            getConditionalColor(x2, y0, 600, "red", "blue"),
            getConditionalColor(x2, y0, 600, "red", "black"),
            getConditionalColor(x2, y0, 600, "red", "orange"),
            getConditionalColor(x2, y0, 600, "red", "white"),
            getConditionalColor(x2, y0, 600, "blue", "red"),
            getConditionalColor(x2, y0, 600, "blue", "gray"),
            getConditionalColor(x2, y0, 600, "blue", "orange"),
            getConditionalColor(x2, y0, 600, "blue", "white"),
            getConditionalColor(x2, y0, 600, "green", "blue"),
            getConditionalColor(x2, y0, 600, "green", "red"),
            getConditionalColor(x2, y0, 600, "green", "orange"),
            getConditionalColor(x2, y0, 600, "green", "white"),
            getConditionalColor(x2, y0, 600, "orange", "red"),
            getConditionalColor(x2, y0, 600, "orange", "black"),
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
            getConditionalColor(x0, y0, 15, "grey", "black"),
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


            // IGUANA EYES

            getDynamicRgb(x2, y2, x2, y0, 132, 80, 17),   // Very dark orange
            getDynamicRgb(x2, y2, x2, y0, 0, 25, 0),      // Very dark green
            getDynamicRgb(x2, y2, x2, y0, 255, 140, 0),   // Darkorange
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 30),      // Very dark blue
            getDynamicRgb(x2, y2, x2, y0, 77, 0, 0),      // Dark red


            // getDynamicRgb(x2, y2, x2, y0, 255, 87, 51),   // Coral
            // getDynamicRgb(x2, y2, x2, y0, 255, 127, 80),  // Coral2
            // getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime
            // getDynamicRgb(x2, y2, x2, y0, 0, 255, 255),   // Cyan
            // getDynamicRgb(x2, y2, x2, y0, 32, 178, 170),  // Lightseagreen


            // getDynamicRgb(x2, y2, x2, y0, 255, 0, 255),   // Magenta
            // getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime (repeated)
            // getDynamicRgb(x2, y2, x2, y0, 0, 128, 128),   // Teal
            // getDynamicRgb(x2, y2, x2, y0, 128, 0, 0),     // Maroon
            // getDynamicRgb(x2, y2, x2, y0, 0, 0, 128),     // Navy
            // // getDynamicRgb(x2, y2, x2, y0, 128, 128, 0),   // Olive
            // getDynamicRgb(x2, y2, x2, y0, 75, 0, 130),    // Indigo

            // LIQUID GRAVITY 
            // TOP LEFT CORNER
            // getConditionalColor(x0, y0, 444, "verydarkred", "darkblue"),
            // getConditionalColor(x0, y0, 444, "verydarkred", "darkgreen"),
            // getConditionalColor(x0, y0, 444, "verydarkred", "darkorange"),
            // getConditionalColor(x0, y0, 444, "verydarkred", "white"),
            // getConditionalColor(x0, y0, 444, "verydarkred", "black"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "darkred"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "darkgreen"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "darkorange"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "white"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "black"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "verydarkblue"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "verydarkred"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "orange"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "white"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "black"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "red"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "green"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "blue"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "white"),
            // getConditionalColor(x0, y0, 444, "verydarkblue", "black"),

            // getConditionalColor(x2, y0, 600, "green", "black"),
            // getConditionalColor(x2, y0, 600, "blue", "black"),
            // getConditionalColor(x2, y0, 600, "red", "black"),

            // getConditionalColor(x2, y0, -300, "orange", "black"),
            // getConditionalColor(x2, y0, -300, "green", "black"),
            // getConditionalColor(x2, y0, -300, "blue", "black"),
            // getConditionalColor(x2, y0, -300, "red", "black"),



            // getConditionalColor(x1, y0, -100, "orange", "black"),
            // getConditionalColor(x1, y0, -100, "green", "black"),
            // getConditionalColor(x1, y0, -100, "blue", "black"),
            // getConditionalColor(x1, y0, -100, "red", "black"),

       
            // getConditionalColor(x3, y0, 100, "orange", "black"),
            // getConditionalColor(x3, y0, 100, "green", "black"),
            // getConditionalColor(x3, y0, 100, "blue", "black"),
            // getConditionalColor(x3, y0, 100, "red", "black"),

                    //   // CRAWLERS ON BLACK BACKGROUND
                    //   getConditionalColor(x0, y0, 345, "red", "black"), // Top Left Edge Crawler
                    //   getConditionalColor(x0, y0, 345, "white", "black"), // Top Left Edge Crawler
                    //   getConditionalColor(x0, y0, 345, "blue", "black"), // Top Left Edge Crawler
                    //   getConditionalColor(x0, y0, 345, "orange", "black"), // Top Left Edge Crawler
                    //   getConditionalColor(x0, y0, 345, "green", "black"), // Top Left Edge Crawler

              ];

    }



// Function to return the length of the array generated by getColors2
function getColors2Length() {
    const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
    const length = getColors2(null, null, defaultL).length;
    console.log(`getColors2 length: ${length}`);
    return length;
}

// Log the length of the colors array when the file is loaded
getColors2Length();
}