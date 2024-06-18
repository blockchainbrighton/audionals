console.log("Colour settings level 4 loaded");

{
    const R = 100; // Set a default or required value for R in this context

    // Main function to get colors
    function getColors4(o, a, l) {
    
        // Pre-generate random values and colors
        // const primaryAndSecondaryColors = [...colorPalette.primary, ...colorPalette.secondary];
        // const randomColors = Array.from({ length: 6 }, () => getRandomColor(primaryColors).hex);
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

            ...Array.from({ length: 22 }, (_, i) => dynamicRgb(randomValues[i % randomValues.length], l2zR, i + modulator)),

                // IGUANA EYES
            ...[
                [255, 215, 0],
                [192, 192, 192],
                [255, 165, 0],
                [128, 0, 128],
                [255, 0, 0],
                [0, 128, 0],
                [0, 0, 255]
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