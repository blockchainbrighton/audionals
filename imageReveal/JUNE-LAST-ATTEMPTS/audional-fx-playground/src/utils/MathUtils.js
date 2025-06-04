/**
 * Mathematical Utilities
 * Core mathematical functions for effects and animations
 */

// Perlin noise implementation
const perlinPermutation = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256));
const perlinP = [...perlinPermutation, ...perlinPermutation];

const fade = t => t ** 3 * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);

const grad = (hash, x, y, z) => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

export const MathUtils = {
  /**
   * Linear interpolation between two values
   * @param {number} a - Start value
   * @param {number} b - End value  
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  lerp,

  /**
   * Clamp a value between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

  /**
   * Generate random number between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random value
   */
  random: (min, max) => Math.random() * (max - min) + min,

  /**
   * Generate random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  /**
   * Ease-in-out interpolation
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2 / 2),

  /**
   * Ease-in interpolation
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeIn: t => t * t,

  /**
   * Ease-out interpolation
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeOut: t => 1 - (1 - t) * (1 - t),

  /**
   * 3D Perlin noise function
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Noise value (-1 to 1)
   */
  noise: (x, y, z) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    
    const A = perlinP[X] + Y;
    const AA = perlinP[A] + Z;
    const AB = perlinP[A + 1] + Z;
    const B = perlinP[X + 1] + Y;
    const BA = perlinP[B] + Z;
    const BB = perlinP[B + 1] + Z;
    
    return lerp(
      lerp(
        lerp(grad(perlinP[AA], x, y, z), grad(perlinP[BA], x - 1, y, z), u),
        lerp(grad(perlinP[AB], x, y - 1, z), grad(perlinP[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad(perlinP[AA + 1], x, y, z - 1), grad(perlinP[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(perlinP[AB + 1], x, y - 1, z - 1), grad(perlinP[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  },

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  degToRad: degrees => degrees * Math.PI / 180,

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  radToDeg: radians => radians * 180 / Math.PI,

  /**
   * Normalize angle to 0-2π range
   * @param {number} angle - Angle in radians
   * @returns {number} Normalized angle
   */
  normalizeAngle: angle => {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  },

  /**
   * Map value from one range to another
   * @param {number} value - Input value
   * @param {number} inMin - Input range minimum
   * @param {number} inMax - Input range maximum
   * @param {number} outMin - Output range minimum
   * @param {number} outMax - Output range maximum
   * @returns {number} Mapped value
   */
  map: (value, inMin, inMax, outMin, outMax) => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }
};

export default MathUtils;

