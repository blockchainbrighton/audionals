// colourSettingsLevel1.js

{
    const R = 100; // Set a default or required value for R in this context
  
    // Function to get colors
    function getColors1(o, a, l) {
      const v = l; // Alias for clarity, where l represents vertices
  
      // Cache values of x, y, z for reuse
      const { x: x0, y: y0, z: z0 } = l[0];
      const { x: x1, y: y1 } = l[1];
      const { x: x2, y: y2 } = l[2];
  
      // Precompute z values
      const l0zR = z0 + R;
      const l1zR = l[1].z + R;
      const l2zR = l[2].z + R;
  
      // Pre-generate random values for reuse
      const randomValues = Array.from({ length: 6 }, () => Math.random());
      const colorFactor = randomValues[0] * ((l2zR + 255) / (11 * R) * 255);

  
      // Compute sine values for dynamic colors
      const now = Date.now();
      const sinNow = Math.sin(now);
  
      // Use a complete range of color indexes from 1 to 23
      const colorIndexes = Array.from({ length: 23 }, (_, i) => i + 1);

      // Return dynamic color settings
      return [

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS
   

            // colorFactor > 0.01 
            // ? `rgb(${Math.floor(colorFactor)}, ${Math.floor(colorFactor)}, ${Math.floor(colorFactor)})`
            // : "#FF0000",


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



  
        // 4 stripe close scatters
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(x0, y0, 3, [2, 3, 4, 5, 1][i], 1, window.colorPalette)
        ),
  
        // 4 stripe Wide Scatters
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(x1, y1, 3, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20][i], 1, window.colorPalette)
        ),
  
        // Repeated close and wide scatters with different divisors
        ...[10, 1.77].flatMap(divisor =>
          Array.from({ length: 5 }, (_, i) =>
            getConditionalColorWithIndex(l[0].x, l[0].y, divisor, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10][i], 1, window.colorPalette)
          )
        ),
  
        // Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 3, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20][i], 1, window.colorPalette)
        ),
  
        // Dark Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 3, [1, 2, 3, 4, 5][i], 24, window.colorPalette)
        ),
  
        // 3 stripe wide scatters
        ...Array.from({ length: 10 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 5, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20][i], 1, window.colorPalette)
        ),
  
        // 1 stripe wide scatters NO BACKGROUND
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 10, [1, 2, 5, 8, 10][i], 1, window.colorPalette)
        ),
  
        // Dark Dramatic Colors
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 24, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 25, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 26, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 27, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 28, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 29, window.colorPalette)
        ),

        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30][i], 30, window.colorPalette)
        ),
  
        // Wide 4 Row Scatter
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[1].y, 10, [1, 5, 8, 9, 10][i], 1, window.colorPalette)
        ),
  
        // Additional color variation
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[0].x, l[1].y, 10, [11, 17, 18, 19, 20][i], 1, window.colorPalette)
        ),
  
        // Repeated patterns with different positions
        ...Array.from({ length: 5 }, (_, i) =>
          getConditionalColorWithIndex(l[1].x, l[0].y, 10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10][i], 1, window.colorPalette)
        )
      ];
    }
  
    // Function to return the length of the array generated by getColors1
    function getColors1Length() {
      // Safely generate a default color array for length calculation
      const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
      const length = getColors1(null, null, defaultL).length;
      console.log(`getColors1 length: ${length}`);
      return length;
    }
  
    // Log the length of the colors array when the file is loaded
    getColors1Length();
  }