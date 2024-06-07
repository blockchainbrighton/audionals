// colourSettingsLevel2.js
console.log("Colour settings level 2 loaded");

{
  const R = 100; // Set a default or required value for R in this context
  

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#422000",
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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

       
            // DISCO BALL
            getRandomColor([colorPalette.hslColors]), // DISCO
            randomValues[22] > 0.5 ? `hsl(${Math.floor(60 * randomValues[23]) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * randomValues[24]) + 10}, 90%, 60%)`, // Disco Ball

         

            // STARING EYES
            `rgb(${randomValues[31] > 0.5 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes


            // // FULL SHAPE COLOUR (50/50)
            // sinValue < 0.5 ? "red" : "blue", // Full Shape Colour
            // // Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue", // Full Shape Colour

            // getConditionalColor(x, y, 280, "green", "darkorange"), 
            // getConditionalColor(x, y, 111, "white", "red"), 
            // getConditionalColor(x, y, 120, "blue", "blue"), 
            // getConditionalColor(x, y, 111, "red", "darkorange"), 
            // getConditionalColor(x, y, 95, "blue", "blue"),
            // getConditionalColor(x, y, 111, "green", "white"),
            // getConditionalColor(x, y, 111, "darkgreen", "grey"),
            // getConditionalColor(x, y, 111, "lightorange", "darkgrey"),



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