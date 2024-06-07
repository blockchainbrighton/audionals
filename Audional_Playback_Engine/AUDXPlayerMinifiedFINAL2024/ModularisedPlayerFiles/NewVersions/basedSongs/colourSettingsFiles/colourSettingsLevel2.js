// colourSettingsLevel2.js


// Main function to get colors
function getColors2(o, a, l) {
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

        // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS

          (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
          `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
          "#422000",



            // 4 stripe close scatters
            getConditionalColor(l[0].x, l[0].y, 3, "red", "black"), // 
            getConditionalColor(l[0].x, l[0].y, 3, "white", "black"), //      
            getConditionalColor(l[0].x, l[0].y, 3, "blue", "black"), // 
            getConditionalColor(l[0].x, l[0].y, 3, "orange", "black"), //
            getConditionalColor(l[0].x, l[0].y, 3, "green", "black"), //

            // 4 stripe Wide Scatters 
            getConditionalColor(l[1].x, l[1].y, 3, "red", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "white", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "blue", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "orange", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "green", "black"), // Wide 4 Row Scatter

            // 3 stripe wide scatters
            getConditionalColor(l[1].x, l[1].y, 5, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "green", "black"), // Wide 3 Row Scatter


            // 1 stripe wide scatters NO BACKGROUND
            getConditionalColor(l[1].x, l[1].y, 10, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "black"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK RED BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#160000"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK BLUE BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#000016"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK ORANGE BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#221300"), // Wide 3 Row Scatter             
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#221300"), // Wide 3 Row Scatter


            // 1 stripe scatter on DARK GREEN BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#001400"), // Wide 3 Row Scatter             
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#001400"), // Wide 3 Row Scatter


            // 1 stripe scatter on DARK GREY BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b"), // Wide 3 Row Scatter

            // Scatter with SOLID BG  // TICKER TAPE PARADE

            getConditionalColor(l[1].x, l[1].y, 3, "grey", "red"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "white"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "green"), // Wide 4 Row Scatter
            getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // cycle scatter



            // DISCO BALL
            getRandomColor([colorPalette.hslColors]), // DISCO
            randomValues[22] > 0.5 ? `hsl(${Math.floor(60 * randomValues[23]) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * randomValues[24]) + 10}, 90%, 60%)`, // Disco Ball

         

            // STARING EYES
            `rgb(${randomValues[31] > 0.5 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes


            // FULL SHAPE COLOUR (50/50)
            sinValue < 0.5 ? "red" : "blue", // Full Shape Colour
            // Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue", // Full Shape Colour

            getConditionalColor(x, y, 280, "green", "darkorange"), 
            getConditionalColor(x, y, 111, "white", "red"), 
            getConditionalColor(x, y, 120, "blue", "blue"), 
            getConditionalColor(x, y, 111, "red", "darkorange"), 
            getConditionalColor(x, y, 95, "blue", "blue"),
            getConditionalColor(x, y, 111, "green", "white"),
            getConditionalColor(x, y, 111, "darkgreen", "grey"),
            getConditionalColor(x, y, 111, "lightorange", "darkgrey"),



            // IGUANA EYES
            getDynamicRgb(x2, y2, x2, y0, 255, 165, 0),    // IGUANA EYES // Orange
            getDynamicRgb(x2, y2, x2, y0, 255, 87, 51),   // Coral
            getDynamicRgb(x2, y2, x2, y0, 255, 215, 0),   // Gold
            getDynamicRgb(x2, y2, x2, y0, 255, 127, 80),  // Coral2
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 255),   // Cyan
            getDynamicRgb(x2, y2, x2, y0, 132, 80, 17),   // Very dark orange
            getDynamicRgb(x2, y2, x2, y0, 0, 25, 0),      // Very dark green
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 255),     // Blue
            getDynamicRgb(x2, y2, x2, y0, 32, 178, 170),  // Lightseagreen
            getDynamicRgb(x2, y2, x2, y0, 255, 140, 0),   // Darkorange
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 30),      // Very dark blue
            getDynamicRgb(x2, y2, x2, y0, 77, 0, 0),      // Dark red
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 0),     // Red
            getDynamicRgb(x2, y2, x2, y0, 0, 128, 0),     // Green
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 128),   // Purple
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 255),   // Magenta
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime (repeated)
            getDynamicRgb(x2, y2, x2, y0, 0, 128, 128),   // Teal
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 0),     // Maroon
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 128),     // Navy
            getDynamicRgb(x2, y2, x2, y0, 128, 128, 0),   // Olive
            getDynamicRgb(x2, y2, x2, y0, 192, 192, 192), // Silver
            getDynamicRgb(x2, y2, x2, y0, 75, 0, 130),    // Indigo

            // LIQUID GRAVITY 
            // TOP LEFT CORNER
            getConditionalColor(x0, y0, 444, "red", "blue"),
            getConditionalColor(x0, y0, 444, "red", "green"),
            getConditionalColor(x0, y0, 444, "red", "orange"),
            getConditionalColor(x0, y0, 444, "red", "white"),
            getConditionalColor(x0, y0, 444, "red", "black"),
            getConditionalColor(x0, y0, 444, "blue", "red"),
            getConditionalColor(x0, y0, 444, "blue", "green"),
            getConditionalColor(x0, y0, 444, "blue", "orange"),
            getConditionalColor(x0, y0, 444, "blue", "white"),
            getConditionalColor(x0, y0, 444, "blue", "black"),
            getConditionalColor(x0, y0, 444, "green", "blue"),
            getConditionalColor(x0, y0, 444, "green", "red"),
            getConditionalColor(x0, y0, 444, "green", "orange"),
            getConditionalColor(x0, y0, 444, "green", "white"),
            getConditionalColor(x0, y0, 444, "green", "black"),
            getConditionalColor(x0, y0, 444, "orange", "red"),
            getConditionalColor(x0, y0, 444, "orange", "green"),
            getConditionalColor(x0, y0, 444, "orange", "blue"),
            getConditionalColor(x0, y0, 444, "orange", "white"),
            getConditionalColor(x0, y0, 444, "orange", "black"),

              ];

    }
