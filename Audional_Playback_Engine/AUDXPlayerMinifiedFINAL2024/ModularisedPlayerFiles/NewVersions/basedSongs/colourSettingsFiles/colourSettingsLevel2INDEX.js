// colourSettingsLevel2.js
console.log("Colour settings level 2 loaded");

{
  const R = 100; // Set a default or required value for R in this context
  

// Main function to get colors
function getColors2(o, a, l) {
    const v = l; // Alias for clarity, where l represents vertices


    const x = l[0].x;
    const y = l[0].y;



    const y2 = l[2].y;
    const x0 = l[0].x;
    const y0 = l[0].y;
    const x1 = l[1].x - 1500;
    const x2 = l[2].x - 1500;
    const x3 = l[1].x - 555;


    return [

           
    
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

           // Updated conditional color settings
           getConditionalColorWithIndex(x, y, 280, 4, 14, window.colorPalette), // Green -> 4, DarkOrange -> 14
           getConditionalColorWithIndex(x, y, 111, 21, 15, window.colorPalette), // White -> 21, Red -> 15
           getConditionalColorWithIndex(x, y, 120, 10, 10, window.colorPalette), // VeryDarkBlue -> 10, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x, y, 111, 15, 14, window.colorPalette), // Red -> 15, DarkOrange -> 14
           getConditionalColorWithIndex(x, y, 95, 10, 10, window.colorPalette), // VeryDarkBlue -> 10, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x, y, 111, 4, 21, window.colorPalette), // Green -> 4, White -> 21
           getConditionalColorWithIndex(x, y, 111, 9, 13, window.colorPalette), // VeryDarkGreen -> 9, DimGray -> 13
           getConditionalColorWithIndex(x, y, 111, 5, 13, window.colorPalette), // Orange -> 5, DimGray -> 13

           // MIDDLE LINE CRAWLER TOP LEFT
           getConditionalColorWithIndex(x3, y0, 100, 15, 13, window.colorPalette), // Red -> 15, DimGray -> 13
           getConditionalColorWithIndex(x3, y0, 100, 15, 13, window.colorPalette), // Red -> 15, DimGray -> 13
           getConditionalColorWithIndex(x3, y0, 100, 15, 13, window.colorPalette), // Red -> 15, DimGray -> 13
           getConditionalColorWithIndex(x3, y0, 100, 15, 21, window.colorPalette), // Red -> 15, White -> 21
           getConditionalColorWithIndex(x3, y0, 100, 10, 15, window.colorPalette), // VeryDarkBlue -> 10, Red -> 15
           getConditionalColorWithIndex(x3, y0, 100, 10, 13, window.colorPalette), // VeryDarkBlue -> 10, DimGray -> 13
           getConditionalColorWithIndex(x3, y0, 100, 10, 5, window.colorPalette), // VeryDarkBlue -> 10, Orange -> 5
           getConditionalColorWithIndex(x3, y0, 100, 10, 21, window.colorPalette), // VeryDarkBlue -> 10, White -> 21
           getConditionalColorWithIndex(x3, y0, 100, 4, 10, window.colorPalette), // Green -> 4, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x3, y0, 100, 4, 15, window.colorPalette), // Green -> 4, Red -> 15
           getConditionalColorWithIndex(x3, y0, 100, 1, 15, window.colorPalette), // Black -> 1, Red -> 15
           getConditionalColorWithIndex(x3, y0, 100, 2, 5, window.colorPalette), // Purple -> 2, Orange -> 5
           getConditionalColorWithIndex(x3, y0, 100, 1, 21, window.colorPalette), // Black -> 1, White -> 21
           getConditionalColorWithIndex(x3, y0, 100, 5, 15, window.colorPalette), // Orange -> 5, Red -> 15
           getConditionalColorWithIndex(x3, y0, 100, 2, 13, window.colorPalette), // Purple -> 2, DimGray -> 13
           getConditionalColorWithIndex(x3, y0, 100, 1, 10, window.colorPalette), // Black -> 1, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x3, y0, 100, 13, 21, window.colorPalette), // DimGray -> 13, White -> 21

           // MIDDLE LINE CRAWLER BOTTOM RIGHT
           getConditionalColorWithIndex(x1, y0, -100, 15, 10, window.colorPalette), // Red -> 15, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x1, y0, -100, 15, 13, window.colorPalette), // Red -> 15, DimGray -> 13
           getConditionalColorWithIndex(x1, y0, -100, 15, 5, window.colorPalette), // Red -> 15, Orange -> 5
           getConditionalColorWithIndex(x1, y0, -100, 15, 21, window.colorPalette), // Red -> 15, White -> 21
           getConditionalColorWithIndex(x1, y0, -100, 10, 15, window.colorPalette), // VeryDarkBlue -> 10, Red -> 15
           getConditionalColorWithIndex(x1, y0, -100, 10, 2, window.colorPalette), // VeryDarkBlue -> 10, Purple -> 2
           getConditionalColorWithIndex(x1, y0, -100, 10, 5, window.colorPalette), // VeryDarkBlue -> 10, Orange -> 5
           getConditionalColorWithIndex(x1, y0, -100, 10, 21, window.colorPalette), // VeryDarkBlue -> 10, White -> 21
           getConditionalColorWithIndex(x1, y0, -100, 4, 10, window.colorPalette), // Green -> 4, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x1, y0, -100, 4, 15, window.colorPalette), // Green -> 4, Red -> 15
           getConditionalColorWithIndex(x1, y0, -100, 4, 5, window.colorPalette), // Green -> 4, Orange -> 5
           getConditionalColorWithIndex(x1, y0, -100, 4, 21, window.colorPalette), // Green -> 4, White -> 21
           getConditionalColorWithIndex(x1, y0, -100, 5, 15, window.colorPalette), // Orange -> 5, Red -> 15
           getConditionalColorWithIndex(x1, y0, -100, 5, 12, window.colorPalette), // Orange -> 5, Maroon -> 12
           getConditionalColorWithIndex(x1, y0, -100, 5, 10, window.colorPalette), // Orange -> 5, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x1, y0, -100, 5, 21, window.colorPalette), // Orange -> 5, White -> 21

           // 3 SQUARE MIDDLE CRAWLER
           getConditionalColorWithIndex(x2, y0, -300, 15, 10, window.colorPalette), // Red -> 15, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, -300, 15, 1, window.colorPalette), // Red -> 15, Black -> 1
           getConditionalColorWithIndex(x2, y0, -300, 15, 5, window.colorPalette), // Red -> 15, Orange -> 5
           getConditionalColorWithIndex(x2, y0, -300, 15, 21, window.colorPalette), // Red -> 15, White -> 21
           getConditionalColorWithIndex(x2, y0, -300, 10, 15, window.colorPalette), // VeryDarkBlue -> 10, Red -> 15
           getConditionalColorWithIndex(x2, y0, -300, 10, 15, window.colorPalette), // VeryDarkBlue -> 10, Red -> 15
           getConditionalColorWithIndex(x2, y0, -300, 10, 5, window.colorPalette), // VeryDarkBlue -> 10, Orange -> 5
           getConditionalColorWithIndex(x2, y0, -300, 10, 21, window.colorPalette), // VeryDarkBlue -> 10, White -> 21
           getConditionalColorWithIndex(x2, y0, -300, 4, 10, window.colorPalette), // Green -> 4, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, -300, 4, 15, window.colorPalette), // Green -> 4, Red -> 15
           getConditionalColorWithIndex(x2, y0, -300, 4, 5, window.colorPalette), // Green -> 4, Orange -> 5
           getConditionalColorWithIndex(x2, y0, -300, 4, 21, window.colorPalette), // Green -> 4, White -> 21
           getConditionalColorWithIndex(x2, y0, -300, 5, 15, window.colorPalette), // Orange -> 5, Red -> 15
           getConditionalColorWithIndex(x2, y0, -300, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1
           getConditionalColorWithIndex(x2, y0, -300, 5, 10, window.colorPalette), // Orange -> 5, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, -300, 5, 21, window.colorPalette), // Orange -> 5, White -> 21

           // BOTTOM RIGHT CORNER
           getConditionalColorWithIndex(x2, y0, 600, 15, 10, window.colorPalette), // Red -> 15, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, 600, 15, 1, window.colorPalette), // Red -> 15, Black -> 1
           getConditionalColorWithIndex(x2, y0, 600, 15, 5, window.colorPalette), // Red -> 15, Orange -> 5
           getConditionalColorWithIndex(x2, y0, 600, 15, 21, window.colorPalette), // Red -> 15, White -> 21
           getConditionalColorWithIndex(x2, y0, 600, 10, 15, window.colorPalette), // VeryDarkBlue -> 10, Red -> 15
           getConditionalColorWithIndex(x2, y0, 600, 10, 13, window.colorPalette), // VeryDarkBlue -> 10, DimGray -> 13
           getConditionalColorWithIndex(x2, y0, 600, 10, 5, window.colorPalette), // VeryDarkBlue -> 10, Orange -> 5
           getConditionalColorWithIndex(x2, y0, 600, 10, 21, window.colorPalette), // VeryDarkBlue -> 10, White -> 21
           getConditionalColorWithIndex(x2, y0, 600, 4, 10, window.colorPalette), // Green -> 4, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, 600, 4, 15, window.colorPalette), // Green -> 4, Red -> 15
           getConditionalColorWithIndex(x2, y0, 600, 4, 5, window.colorPalette), // Green -> 4, Orange -> 5
           getConditionalColorWithIndex(x2, y0, 600, 4, 21, window.colorPalette), // Green -> 4, White -> 21
           getConditionalColorWithIndex(x2, y0, 600, 5, 15, window.colorPalette), // Orange -> 5, Red -> 15
           getConditionalColorWithIndex(x2, y0, 600, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1
           getConditionalColorWithIndex(x2, y0, 600, 5, 10, window.colorPalette), // Orange -> 5, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x2, y0, 600, 5, 21, window.colorPalette), // Orange -> 5, White -> 21
           getConditionalColorWithIndex(x2, y0, 600, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1

           // EU Flag Styles
           getConditionalColorWithIndex(x0, y0, 15, 5, 10, window.colorPalette), // Orange -> 5, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x0, y0, 15, 15, 10, window.colorPalette), // Red -> 15, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x0, y0, 15, 15, 21, window.colorPalette), // Red -> 15, White -> 21
           getConditionalColorWithIndex(x0, y0, 15, 21, 10, window.colorPalette), // White -> 21, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x0, y0, 15, 10, 21, window.colorPalette), // VeryDarkBlue -> 10, White -> 21
           getConditionalColorWithIndex(x0, y0, 15, 21, 15, window.colorPalette), // White -> 21, Red -> 15
           getConditionalColorWithIndex(x0, y0, 15, 5, 10, window.colorPalette), // Orange -> 5, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x0, y0, 15, 15, 5, window.colorPalette), // Red -> 15, Orange -> 5
           getConditionalColorWithIndex(x0, y0, 15, 5, 21, window.colorPalette), // Orange -> 5, White -> 21
           getConditionalColorWithIndex(x0, y0, 15, 21, 5, window.colorPalette), // White -> 21, Orange -> 5
           getConditionalColorWithIndex(x0, y0, 15, 13, 15, window.colorPalette), // DimGray -> 13, Red -> 15
           getConditionalColorWithIndex(x0, y0, 15, 13, 10, window.colorPalette), // DimGray -> 13, VeryDarkBlue -> 10
           getConditionalColorWithIndex(x0, y0, 15, 13, 1, window.colorPalette), // DimGray -> 13, Black -> 1
           getConditionalColorWithIndex(x0, y0, 15, 13, 5, window.colorPalette), // DimGray -> 13, Orange -> 5
           getConditionalColorWithIndex(x0, y0, 15, 15, 13, window.colorPalette), // Red -> 15, DimGray -> 13
           getConditionalColorWithIndex(x0, y0, 15, 10, 13, window.colorPalette), // VeryDarkBlue -> 10, DimGray -> 13
           getConditionalColorWithIndex(x0, y0, 15, 4, 13, window.colorPalette), // Green -> 4, DimGray -> 13
           getConditionalColorWithIndex(x0, y0, 15, 5, 13, window.colorPalette), // Orange -> 5, DimGray -> 13

        //    getConditionalColorWithIndex(x1, y0, 8, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 9, 15, 1, window.colorPalette), // Red -> 15, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 10, 21, 1, window.colorPalette), // White -> 21, Black -> 1
        //    getConditionalColorWithIndex(x1, y0, 11, 2, 1, window.colorPalette), // Purple -> 2, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 12, 10, 1, window.colorPalette), // VeryDarkBlue -> 10, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 13, 21, 1, window.colorPalette), // White -> 21, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 15, 15, 1, window.colorPalette), // Red -> 15, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 16, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1
        //    getConditionalColorWithIndex(x1, y0, 17, 21, 1, window.colorPalette), // White -> 21, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 16, 13, 1, window.colorPalette), // DimGray -> 13, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 15, 13, 1, window.colorPalette), // DimGray -> 13, Black -> 1
        //    getConditionalColorWithIndex(x1, y0, 14, 13, 1, window.colorPalette), // DimGray -> 13, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 13, 13, 1, window.colorPalette), // DimGray -> 13, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 12, 15, 1, window.colorPalette), // Red -> 15, Black -> 1
        //    getConditionalColorWithIndex(x1, y0, 11, 10, 1, window.colorPalette), // VeryDarkBlue -> 10, Black -> 1
        //    getConditionalColorWithIndex(x2, y0, 10, 4, 1, window.colorPalette), // Green -> 4, Black -> 1
        //    getConditionalColorWithIndex(x3, y0, 9, 5, 1, window.colorPalette), // Orange -> 5, Black -> 1


            // IGUANA EYES

            getDynamicRgbWithIndex(x2, y2, x2, y0, 8, window.colorPalette),  // Very dark orange -> index 8
            getDynamicRgbWithIndex(x2, y2, x2, y0, 9, window.colorPalette),  // Very dark green -> index 9
            getDynamicRgbWithIndex(x2, y2, x2, y0, 14, window.colorPalette), // Darkorange -> index 14
            getDynamicRgbWithIndex(x2, y2, x2, y0, 10, window.colorPalette), // Very dark blue -> index 10
            getDynamicRgbWithIndex(x2, y2, x2, y0, 11, window.colorPalette), // Dark red -> index 11


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
        //    // TOP LEFT CORNER
        //    getConditionalColorWithIndex(x0, y0, 444, 11, 10, window.colorPalette), // Very dark red -> index 11, Very dark blue -> index 10
        //    getConditionalColorWithIndex(x0, y0, 444, 11, 9, window.colorPalette),  // Very dark red -> index 11, Very dark green -> index 9
        //    getConditionalColorWithIndex(x0, y0, 444, 11, 14, window.colorPalette), // Very dark red -> index 11, Dark orange -> index 14
        //    getConditionalColorWithIndex(x0, y0, 444, 11, 21, window.colorPalette), // Very dark red -> index 11, White -> index 21
        //    getConditionalColorWithIndex(x0, y0, 444, 11, 1, window.colorPalette),  // Very dark red -> index 11, Black -> index 1
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 11, window.colorPalette), // Very dark blue -> index 10, Very dark red -> index 11
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 9, window.colorPalette),  // Very dark blue -> index 10, Very dark green -> index 9
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 14, window.colorPalette), // Very dark blue -> index 10, Dark orange -> index 14
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 21, window.colorPalette), // Very dark blue -> index 10, White -> index 21
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 1, window.colorPalette),  // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 10, window.colorPalette), // Very dark blue -> index 10, Very dark blue -> index 10
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 11, window.colorPalette), // Very dark blue -> index 10, Very dark red -> index 11
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 5, window.colorPalette),  // Very dark blue -> index 10, Orange -> index 5
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 21, window.colorPalette), // Very dark blue -> index 10, White -> index 21
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 1, window.colorPalette),  // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 15, window.colorPalette), // Very dark blue -> index 10, Red -> index 15
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 4, window.colorPalette),  // Very dark blue -> index 10, Green -> index 4
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 10, window.colorPalette), // Very dark blue -> index 10, Very dark blue -> index 10
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 21, window.colorPalette), // Very dark blue -> index 10, White -> index 21
        //    getConditionalColorWithIndex(x0, y0, 444, 10, 1, window.colorPalette),  // Very dark blue -> index 10, Black -> index 1

        //    getConditionalColorWithIndex(x2, y0, 600, 4, 1, window.colorPalette),  // Green -> index 4, Black -> index 1
        //    getConditionalColorWithIndex(x2, y0, 600, 10, 1, window.colorPalette), // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x2, y0, 600, 15, 1, window.colorPalette), // Red -> index 15, Black -> index 1

        //    getConditionalColorWithIndex(x2, y0, -300, 5, 1, window.colorPalette), // Orange -> index 5, Black -> index 1
        //    getConditionalColorWithIndex(x2, y0, -300, 4, 1, window.colorPalette), // Green -> index 4, Black -> index 1
        //    getConditionalColorWithIndex(x2, y0, -300, 10, 1, window.colorPalette), // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x2, y0, -300, 15, 1, window.colorPalette), // Red -> index 15, Black -> index 1

        //    getConditionalColorWithIndex(x1, y0, -100, 5, 1, window.colorPalette),  // Orange -> index 5, Black -> index 1
        //    getConditionalColorWithIndex(x1, y0, -100, 4, 1, window.colorPalette),  // Green -> index 4, Black -> index 1
        //    getConditionalColorWithIndex(x1, y0, -100, 10, 1, window.colorPalette), // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x1, y0, -100, 15, 1, window.colorPalette), // Red -> index 15, Black -> index 1

        //    getConditionalColorWithIndex(x3, y0, 100, 5, 1, window.colorPalette),  // Orange -> index 5, Black -> index 1
        //    getConditionalColorWithIndex(x3, y0, 100, 4, 1, window.colorPalette),  // Green -> index 4, Black -> index 1
        //    getConditionalColorWithIndex(x3, y0, 100, 10, 1, window.colorPalette), // Very dark blue -> index 10, Black -> index 1
        //    getConditionalColorWithIndex(x3, y0, 100, 15, 1, window.colorPalette), // Red -> index 15, Black -> index 1

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