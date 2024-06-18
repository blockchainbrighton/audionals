console.log("Colour settings level 3 loaded");

{
    const R = 100; // Set a default or required value for R in this context

    // Main function to get colors
    function getColors3(o, a, l) {
        const v = l; // Alias for clarity, where l represents vertices
    
        // Pre-generate random values and colors
        const randomValues = Array.from({ length: 24 }, () => Math.random());
        // const primaryAndSecondaryColors = [...colorPalette.primary, ...colorPalette.secondary];
        // const randomColors = Array.from({ length: 6 }, () => getRandomColor(primaryAndSecondaryColors).hex);
    
        const sinValue = Math.abs(Math.sin(a / 3000));
    
        // Cache values of x, y, z for reuse
        const { x: x0, y: y0, z: z0 } = l[0];
        const { x: x1, y: y1 } = l[1];
        const { x: x2, y: y2 } = l[2];
    
        const l0zR = z0 + R;
        const l2zR = l[2].z + R;
        const l1zR = l[1].z + R;
    
        const now = Date.now();
        const sinNow = Math.sin(now);
        const sinNowDiv1000 = Math.sin(now / 1000);
        const sinNowDiv2000 = Math.sin(now / 2000);
        const sinNowDiv10 = Math.sin(now / 10);
        const sinNowDiv5000 = Math.sin(now / 5000);
        const sinNowDiv100 = Math.sin(now / 100);
        const sinNowDivMinus17 = Math.sin(now / -17);

        const primaryColors = [...colorPalette.primary];
        const randomColor1 = getRandomColor(primaryColors).hex;
        const randomColor2 = getRandomColor(primaryColors).hex;
        const randomColor3 = getRandomColor(primaryColors).hex;
        const randomColor4 = getRandomColor(primaryColors).hex;
        const randomColor5 = getRandomColor(primaryColors).hex;
        const randomColor6 = getRandomColor(primaryColors).hex;

    
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


            // CRAWLERS ON BLACK BACKGROUND
            ...[15, 21, 10, 5, 4].map(index => getConditionalColorWithIndex(x0, y0, 345, index, 1, window.colorPalette)),
            getConditionalColorWithIndex(x0, y0, 500, 15, 1, window.colorPalette),
            getConditionalColorWithIndex(x0, y0, 100, 21, 1, window.colorPalette),
            getConditionalColorWithIndex(x0, y0, 250, 10, 1, window.colorPalette),
            ...[14, 15, 16, 17, 18, 19, 21, 6, 10, 2, 5].map(index => getConditionalColorWithIndex(x0, y0, 345, index, 1, window.colorPalette)),
    
            // // IGUANA EYES
            // ...[
            //     [255, 215, 0],
            //     [192, 192, 192],
            //     [255, 165, 0],
            //     [128, 0, 128],
            //     [255, 0, 0],
            //     [0, 128, 0],
            //     [0, 0, 255]
            // ].map(([r, g, b]) => getDynamicRgb(x2, y2, x2, y0, r, g, b)),
    
            // Disco Eyes
            `rgb(${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))})`,
    
            // STROBES
            ...[
                getHslColor(a, 1),
                getHslColor(a + 1, 1),
                getHslColor(a, 72 * 5),
                getHslColor(a + 18, 18 * 20),
                getHslColor(a + 18, 72 * 5),
                getHslColor(7 * a % 360, 360),
                getHslColor(a - 1, 0.0005 * 180),
                getHslColor(a % 0.09 * 0.88, 0.76)
            ],
    
            // SLIGHT RIPPLES IN SOLID COLOURS
            `rgb(${Math.floor(506 * sinNow + 750)}, ${Math.floor(sinNowDivMinus17 / -750 * 127)}, ${Math.floor(2000 * sinNowDiv2000 + 10002)})`, // PINK
    
            // SLOWLY ROTATING AND FADING COLOURS
            ...sinValues.map((sinValue, i) => {
                const r = Math.floor(255 * sinValue + 128);
                const g = Math.floor(200 * sinValues[(i + 1) % sinValues.length] + 55);
                const b = Math.floor(150 * sinValues[(i + 2) % sinValues.length] + 105);
                return `rgb(${r}, ${g}, ${b})`;
            }),

            // Spinning Eyes
            ...[
                [127 * sinNow + 4, 127 * sinNowDiv10 + 128, 127 * sinNowDiv5000 + 32],
                [111 * sinNow + 200000, 127 * sinNow + 12, 127 * sinNowDiv100 + 4],
                [127 * sinNow + 128, 127 * sinNowDiv1000 + 128, 127 * sinNowDiv2000 + 128]
            ].map(([r, g, b]) => `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`)
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