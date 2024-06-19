console.log("Color settings level 6 loaded");

{
    const R = 100; // Set a default or required value for R in this context

    // Define a utility function for generating colors
    function generateColor(l, threshold, modifier = 1) {
        const r = Math.floor(Math.random() * ((l[0].z + R) / (modifier * R) * 255));
        const g = Math.floor(Math.random() * ((l[0].z + R) / (modifier * R) * 255));
        const b = Math.floor(Math.random() * ((l[0].z + R) / (modifier * R) * 255));
        return r > threshold ? `rgb(${r}, ${g}, ${b})` : 'alternative-color';
    }

    // Utility function for dynamic lightness-based color
    function generateLightnessColor(lightness) {
        const r = lightness * 1.2 % 255;
        const g = lightness * 1.4 % 255;
        const b = lightness % 255;
        return lightness > 128 ? `rgb(${r}, ${g}, ${b})` : 'dark-mode-color';
    }

    // Utility function for special color generation
    function generateSpecialColor(l, type) {
        let r, g, b;
        switch(type) {
            case 'veryBright':
                r = Math.floor(Math.pow(Math.random(), 2) * ((l[0].z + R) / (2 * R) * 255));
                g = Math.floor(Math.pow(Math.random(), 2) * ((l[0].z + R) / (2 * R) * 255));
                b = Math.floor(Math.pow(Math.random(), 2) * ((l[0].z + R) / (2 * R) * 255));
                return r > 90 ? `rgb(${r}, ${g}, ${b})` : 'alternative-color';
            case 'logarithmic':
                r = Math.floor(Math.log(Math.random() * 10 + 1) / Math.log(11) * ((l[0].z + R) / (2 * R) * 255));
                g = Math.floor(Math.log(Math.random() * 10 + 1) / Math.log(11) * ((l[0].z + R) / (2 * R) * 255));
                b = Math.floor(Math.log(Math.random() * 10 + 1) / Math.log(11) * ((l[0].z + R) / (2 * R) * 255));
                return r > 60 ? `rgb(${r}, ${g}, ${b})` : 'alternative-color';
            case 'crazyBright':
                r = Math.floor(Math.pow(Math.random() * 2, 2) * ((l[0].z + R) / (2 * R) * 255));
                g = Math.floor(Math.pow(Math.random() * 2, 2) * ((l[0].z + R) / (2 * R) * 255));
                b = Math.floor(Math.pow(Math.random() * 2, 2) * ((l[0].z + R) / (2 * R) * 255));
                return r > 120 ? `rgb(${r}, ${g}, ${b})` : 'alternative-color';
            case 'veryDim':
                r = Math.floor(Math.random() * ((l[0].z + R) / (9 * R) * 255));
                g = Math.floor(Math.random() * ((l[0].z + R) / (9 * R) * 255));
                b = Math.floor(Math.random() * ((l[0].z + R) / (9 * R) * 255));
                return r > 10 ? `rgb(${r}, ${g}, ${b})` : 'light-mode-color';
        }
    }

    // Main function to get colors
    function getColors6(o, a, l) {
        const v = l; // Alias for clarity, where l represents vertices

        // Pre-generate random values and colors
        const randomValues = Array.from({ length: 50 }, () => Math.random());
        const primaryAndSecondaryColors = window.colorPalette.primary; // Use the color palette
        const modulators = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 5, 10, 25, 50, 100];

        const sinValue = Math.abs(Math.sin(a / 3000));

        // Cache values of x, y, z for reuse
        const { x: x0, y: y0, z: z0 } = l[0];
        const { x: x1, y: y1, z: z1 } = l[1];
        const { x: x2, y: y2, z: z2 } = l[2];

        const l0zR = z0 + R;
        const l2zR = z2 + R;
        const l1zR = z1 + R;

        // Enhanced color variations using precomputed values
        return [
            // Colorful Crazy Frogs
            generateColor(l, 128),
            generateLightnessColor(Math.random() * Math.floor((l[0].z + R) / (2 * R) * 255)),
            generateColor(l, 64),
            generateColor(l, 32),
            generateColor(l, 16),
            generateColor(l, 8),
            generateColor(l, 64, 3),
            generateColor(l, 32, 4),
            generateColor(l, 16, 5),
            generateColor(l, 8, 6),
            generateColor(l, [64, 128, 32, 16].sort(() => 0.5 - Math.random())[0]),
            generateSpecialColor(l, 'veryBright'),
            generateSpecialColor(l, 'logarithmic'),
            generateSpecialColor(l, 'crazyBright'),
            generateSpecialColor(l, 'veryDim'),

            // GLITCHING COLORFUL CRAZY FROGS
            generateColor(l, 10, 3), // Brown Multi Colour Crazy Frog
            generateColor(l, 32, 0.1), // Lighter Brown Multi Colour Crazy Frog
            generateColor(l, 32, 0.01), // Pale Blue Colour Crazy Frog
            generateColor(l, 32, 4), // Pale Bronze Colour Crazy Frog
            generateColor(l, 32, 0.01), // Yellow Glitch Colour Crazy Frog
            generateColor(l, 32, 2.5), // Dark Brown Colour Crazy Frog
            generateColor(l, 32, 2), // Another Variation

            // Additional color variations with primary and secondary colors
            ...primaryAndSecondaryColors.map(color => {
                const { r, g, b } = color.rgb; // Access RGB values directly
                const modulator = modulators[Math.floor(Math.random() * modulators.length)];
                return `rgba(${Math.floor(r * modulator)}, ${Math.floor(g * modulator)}, ${Math.floor(b * modulator)}, ${Math.random().toFixed(2)})`;
            }),

            // IGUANA EYES
            [
                [255, 215, 0],
                [192, 192, 192],
            ].map(([r, g, b]) => getDynamicRgb(x2, y2, x2, y0, r, g, b))
        ].flat(); // Flatten the array here
    }

    // Function to return the length of the array generated by getColors6
    function getColors6Length() {
        const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
        const length = getColors6(null, null, defaultL).length;
        console.log(`getColors6 length: ${length}`);
        return length;
    }

    // Log the length of the colors array when the file is loaded
    getColors6Length();
}
