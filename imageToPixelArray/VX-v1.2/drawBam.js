// drawBam.js

/**
 * @module drawBamModule
 * This module provides a function to draw the text "B.A.M." in a pixel art style
 * onto a 64x64 grid, such as an HTML canvas.
 */

/**
 * An array of [x, y] coordinates for each pixel that forms the "B.A.M." text.
 * The coordinate system assumes a 64x64 grid with the origin (0,0) at the top-left.
 * @public
 */
export const bamPixelCoordinates = [
    // Letter 'B'
    [23, 56], [23, 57], [23, 58], [23, 59], [23, 60],
    [24, 56], [24, 58], [24, 60],
    [25, 56], [25, 58], [25, 60],
    [26, 57], [26, 59],
  
    // Period after 'B'
    [28, 60],
  
    // Letter 'A'
    [31, 56], [32, 56],
    [30, 57], [33, 57],
    [31, 59], [32, 59],
    [30, 59], [33, 59],
    [30, 60], [33, 60],
  
    // Period after 'A'
    [35, 60],
  
    // Letter 'M' (moved 2 pixels left)
    [37, 56], [41, 56],
    [37, 57], [38, 57], [40, 57], [41, 57],
    [37, 58], [39, 58], [41, 58],
    [37, 59], [41, 59],
    [37, 60], [41, 60],
  
    // Period after 'M' (moved 2 pixels left)
    [43, 60],
];
  
// We no longer need the drawBam function for this purpose,
// as we will manipulate the grid array directly.