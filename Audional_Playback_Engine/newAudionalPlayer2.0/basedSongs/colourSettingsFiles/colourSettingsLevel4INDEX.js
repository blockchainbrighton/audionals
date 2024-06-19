console.log("Colour settings level 4 loaded");

{
    const R = 100; // Set a default or required value for R in this context

    // Main function to get colors
    function getColors4(o, a, l) {
        // Pre-generate random values and colors
        const randomValues = Array.from({ length: 24 }, () => Math.random());
    
        const now = Date.now();

        const primaryColors = [...colorPalette.primary];
        const randomColor1 = getRandomColor(primaryColors).hex;
        const randomColor2 = getRandomColor(primaryColors).hex;
        const randomColor3 = getRandomColor(primaryColors).hex;
        const randomColor4 = getRandomColor(primaryColors).hex;
        const randomColor5 = getRandomColor(primaryColors).hex;
        const randomColor6 = getRandomColor(primaryColors).hex;

        const sinValue = Math.abs(Math.sin(a / 3000));
    
        // Cache values of x, y, z for reuse
        const { x: x0, y: y0, z: z0 } = l[0];
        const { x: x1, y: y1 } = l[1];
        const { x: x2, y: y2 } = l[2];
    
        const l0zR = z0 + R;
        const l2zR = l[2].z + R;
        const l1zR = l[1].z + R;

        // Precompute sine values to use in variations
        const sinValues = [
            Math.sin(now / 1200),
            Math.sin(now / 1400),
            Math.sin(now / 1600),
            Math.sin(now / 1000),
            Math.sin(now / 1300),
            Math.sin(now / 1700),
            Math.sin(now / 1100),
            Math.sin(now / 1900),
            Math.sin(now / 2100),
            Math.sin(now / 1800),
            Math.sin(now / 1500),
            Math.sin(now / 1900),
        ];

        // Enhanced color variations using precomputed values
        return [
            // IGUANA EYES
            ...[
                // Deep Red (Dark Red): RGB (178, 0, 0)
                [178, 0, 0],
                // Dark Green (Very Dark Green): RGB (0, 77, 0)
                [0, 77, 0],
                // Dark Blue (Navy): RGB (0, 0, 128)
                [0, 0, 128],
                // Dark Purple (Indigo): RGB (75, 0, 130)
                [75, 0, 130],
                // Dark Cyan (Teal): RGB (0, 206, 209)
                [0, 206, 209],
                // Magenta: RGB (255, 0, 255)
                [255, 0, 255],
                // Dark Grey (Dim Gray): RGB (105, 105, 105)
                [105, 105, 105],
                // Dark Brown (Closest: Maroon): RGB (128, 0, 0)
                [128, 0, 0],
                // Dark Olive Green (Very Dark Green): RGB (0, 77, 0)
                [0, 77, 0],
                // Dark Slate Blue (Indigo): RGB (75, 0, 130)
                [75, 0, 130],
                // Dark Violet (Indigo): RGB (75, 0, 130)
                [75, 0, 130],
                // Dark Turquoise (Teal): RGB (0, 206, 209)
                [0, 206, 209],
                // Purple: RGB (128, 0, 255)
                [128, 0, 255],
                // Red: RGB (255, 0, 0)
                [255, 0, 0],
                // Green: RGB (0, 255, 0)
                [0, 255, 0],
                // Blue: RGB (0, 0, 255)
                [0, 0, 255],
                
            ].map(([r, g, b]) => getDynamicRgb(x2, y2, x2, y0, r, g, b)),
            

                
    

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



            //  STARING EYES:


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

        ];
    }
    

    // Function to return the length of the array generated by getColors3
    function getColors4Length() {
        const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
        const length = getColors4(null, null, defaultL).length;
        console.log(`getColors4 length: ${length}`);
        return length;
    }

    // Log the length of the colors array when the file is loaded
    getColors4Length();
}