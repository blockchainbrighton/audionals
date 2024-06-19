console.log("Colour settings level 5 loaded");

{
const R = 100;

// Utility function to generate random RGB color
function randomRGB(factor) {
    return `rgb(${Math.floor(Math.random() * 255 * factor)}, ${Math.floor(Math.random() * 255 * factor)}, ${Math.floor(Math.random() * 255 * factor)})`;
}

// Utility function for grayscale color
function calculateGrayscale(value, factor, threshold, multiplier = 1) {
    const colorValue = Math.floor(value * factor * multiplier);
    return colorValue > threshold ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
}

// Utility function to apply glitch fade effect
function glitchFade(rgb, period, threshold, R, z) {
    const factor = (z + R) / (2 * R);
    const time = Date.now() / period;
    const r = Math.floor((Math.cos(time) + 1) / 2 * factor * rgb.r);
    const g = Math.floor((Math.sin(time) + 1) / 2 * factor * rgb.g);
    const b = Math.floor((Math.cos(time) + 1) / 2 * factor * rgb.b);
    return r > threshold ? `rgb(${r}, ${g}, ${b})` : 'alternative-color';
}

// Main function to get colors
function getColors5(o, a, l) {
    const v = l;

    const randomValues = Array.from({ length: 50 }, () => Math.random());

    const primaryAndSecondaryColors = ["#FF0000", "#00FF00", "#0000FF", "#FFD700", "#C0C0C0", "#FF1493", "#B20000", "#000000", "#8000FF"];
    const randomColors = Array.from({ length: 20 }, () => randomRGB(1));

    const sinValue = Math.abs(Math.sin(a / 3000));

    const { x: x0, y: y0, z: z0 } = l[0];
    const { x: x1, y: y1 } = l[1];
    const { x: x2, y: y2 } = l[2];

    const l0zR = z0 + R;
    const l2zR = l[2].z + R;
    const l1zR = l[1].z + R;

    const modulators = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    const colorFactors = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    const scales = [1, 10, 50, 100, 200, 500, 1000];

    return [
      
        // Spaceman Eyes
        `rgb(${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))})`, // Disco Eyes

        // Dynamic alternative-color based on lightness - GREY SCALE CRAZY ONE
        ((lightness) => lightness > 128 ? `rgb(${lightness}, ${lightness}, ${lightness})` : 'dark-mode-color')(Math.random() * Math.floor((v[0].z + R) / (2 * R) * 255)),

        // GreyScale Crazy Frogs
        (() => {
            const grayscaleParams = [
                { threshold: 128, divisor: 2 },
                { threshold: 64, divisor: 2 },
                { threshold: 32, divisor: 2 },
                { threshold: 16, divisor: 2 },
                { threshold: 8, divisor: 2 },
                { threshold: 64, divisor: 3 },
                { threshold: 32, divisor: 4 },
                { threshold: 16, divisor: 5 },
                { threshold: 8, divisor: 6 },
                { threshold: 100, divisor: 2, useTimeFunction: Math.cos },
                { threshold: 75, divisor: 2, useTimeFunction: Math.sin, colorType: 'dark-mode-color' },
                { threshold: 90, divisor: 2, randomFunc: () => Math.pow(Math.random(), 2) },
                { threshold: 60, divisor: 2, randomFunc: () => Math.log(Math.random() * 10 + 1) / Math.log(11) },
                { threshold: 120, divisor: 2, randomFunc: () => Math.pow(Math.random() * 2, 2) },
                { threshold: 10, divisor: 9 }
            ];

            return grayscaleParams.map(({ threshold, divisor, useTimeFunction, randomFunc }) =>
                (() => {
                    const colorValue = randomFunc ?
                        Math.floor(randomFunc() * ((v[0].z + R) / (divisor * R) * 255)) :
                        useTimeFunction ?
                            Math.floor((useTimeFunction(Date.now()) + 1) / 2 * ((v[0].z + R) / (divisor * R) * 255)) :
                            Math.floor(Math.random() * ((v[0].z + R) / (divisor * R) * 255));
                    return colorValue > threshold ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
                })()
            );
        })(),

        // Mixing thresholds for an unpredictable pattern
        (() => {
            const threshold = [64, 128, 32, 16].sort(() => 0.5 - Math.random())[0];
            const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (2 * R) * 255));
            return colorValue > threshold ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'alternative-color';
        })(),

        // Dynamic range with a random factor affecting lightness
        (() => {
            const randomFactor = Math.random() < 0.5 ? 2 : 3;
            const colorValue = Math.floor(Math.random() * ((v[0].z + R) / (randomFactor * R) * 255));
            return colorValue > 50 ? `rgb(${colorValue}, ${colorValue}, ${colorValue})` : 'dark-mode-color';
        })(),

        // GLITCHING GRAYSCALE CRAZY FROGS
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => 
            calculateGrayscale(randomValues[i], l0zR / (i % 2 ? 3 * R : 0.01 * R) * (i % 2 ? 75 : 255), 32)
        ),

          // Apply glitch fade to each color in the primary color palette
          ...window.colorPalette.primary.map(({ rgb }) => 
            glitchFade(rgb, 1000, 100, R, v[0].z)
        ),
        ...window.colorPalette.primary.map(({ rgb }) => 
            glitchFade(rgb, 2000, 75, R, v[0].z)
        ),

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
