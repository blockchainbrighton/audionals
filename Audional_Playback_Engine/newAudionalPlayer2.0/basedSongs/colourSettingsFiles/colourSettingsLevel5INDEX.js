console.log("Colour settings level 5 loaded");

{
const R = 100; // Set a default or required value for R in this context

// Utility function to generate random RGB color
function randomRGB(factor) {
    return `rgb(${Math.floor(Math.random() * 255 * factor)}, ${Math.floor(Math.random() * 255 * factor)}, ${Math.floor(Math.random() * 255 * factor)})`;
}

// Main function to get colors
function getColors5(o, a, l) {
    const v = l; // Alias for clarity, where l represents vertices

    // Pre-generate random values and colors
    const randomValues = Array.from({ length: 50 }, () => Math.random()); // Increased number of random values for more variety
    const primaryAndSecondaryColors = ["#FF0000", "#00FF00", "#0000FF", "#FFD700", "#C0C0C0", "#FF1493", "#B20000", "#000000", "#8000FF"]; // Example colors
    const randomColors = Array.from({ length: 20 }, () => randomRGB(1)); // Generate more random colors

    const sinValue = Math.abs(Math.sin(a / 3000));

    // Cache values of x, y, z for reuse
    const { x: x0, y: y0, z: z0 } = l[0];
    const { x: x1, y: y1 } = l[1];
    const { x: x2, y: y2 } = l[2];

    const l0zR = z0 + R;
    const l2zR = l[2].z + R;
    const l1zR = l[1].z + R;

    // Arrays and modulators for creating variations
    const modulators = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    const colorFactors = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    const scales = [1, 10, 50, 100, 200, 500, 1000];

    // Enhanced color variations using precomputed values
    return [
       
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


    //       // CRAZY EYES
        
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

             // IGUANA EYES
             [
                // Gold color: RGB (255, 215, 0)
                [255, 215, 0],
                // Silver color: RGB (192, 192, 192)
                [192, 192, 192],
                
            ].map(([r, g, b]) => getDynamicRgb(x2, y2, x2, y0, r, g, b)),

    ];
}

// Function to return the length of the array generated by getColors5
function getColors5Length() {
    const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
    const length = getColors5(null, null, defaultL).length;
    console.log(`getColors5 length: ${length}`);
    return length;
}

// Log the length of the colors array when the file is loaded
getColors5Length();
}
