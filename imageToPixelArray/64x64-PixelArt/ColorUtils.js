// Color Utility Functions
class ColorUtils {
    /**
     * Convert hex color to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert RGB to hex
     */
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * Validate hex color
     */
    static isValidHex(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }

    /**
     * Normalize hex color to 6 digits
     */
    static normalizeHex(hex) {
        if (!hex) return '#000000';
        
        hex = hex.replace('#', '');
        
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        
        if (hex.length !== 6) {
            return '#000000';
        }
        
        return '#' + hex.toUpperCase();
    }

    /**
     * Get color brightness (0-255)
     */
    static getBrightness(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;
        
        return Math.round((rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000);
    }

    /**
     * Check if color is light or dark
     */
    static isLight(hex) {
        return this.getBrightness(hex) > 127;
    }

    /**
     * Get contrasting text color (black or white)
     */
    static getContrastColor(hex) {
        return this.isLight(hex) ? '#000000' : '#FFFFFF';
    }

    /**
     * Lighten color by percentage
     */
    static lighten(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = Math.round(255 * (percent / 100));
        
        return this.rgbToHex(
            Math.min(255, rgb.r + amount),
            Math.min(255, rgb.g + amount),
            Math.min(255, rgb.b + amount)
        );
    }

    /**
     * Darken color by percentage
     */
    static darken(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = Math.round(255 * (percent / 100));
        
        return this.rgbToHex(
            Math.max(0, rgb.r - amount),
            Math.max(0, rgb.g - amount),
            Math.max(0, rgb.b - amount)
        );
    }

    /**
     * Generate random hex color
     */
    static randomHex() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    /**
     * Get color distance between two colors
     */
    static getColorDistance(hex1, hex2) {
        const rgb1 = this.hexToRgb(hex1);
        const rgb2 = this.hexToRgb(hex2);
        
        if (!rgb1 || !rgb2) return 0;
        
        return Math.sqrt(
            Math.pow(rgb2.r - rgb1.r, 2) +
            Math.pow(rgb2.g - rgb1.g, 2) +
            Math.pow(rgb2.b - rgb1.b, 2)
        );
    }

    /**
     * Blend two colors
     */
    static blendColors(hex1, hex2, ratio = 0.5) {
        const rgb1 = this.hexToRgb(hex1);
        const rgb2 = this.hexToRgb(hex2);
        
        if (!rgb1 || !rgb2) return hex1;
        
        return this.rgbToHex(
            Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio),
            Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio),
            Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio)
        );
    }

    /**
     * Get predefined color palettes
     */
    static getPalettes() {
        return {
            default: [
                '#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#FF4500',
                '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
                '#FFFFFF', '#0066CC', '#4169E1', '#8A2BE2', '#FF1493'
            ],
            helmet: [
                '#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B',
                '#000000', '#2F2F2F', '#4A4A4A', '#696969', '#808080',
                '#A9A9A9', '#C0C0C0', '#D3D3D3', '#DCDCDC', '#F5F5F5'
            ],
            visor: [
                '#0066CC', '#1E90FF', '#4169E1', '#6495ED', '#87CEEB',
                '#000080', '#191970', '#483D8B', '#6A5ACD', '#7B68EE',
                '#9370DB', '#8A2BE2', '#9932CC', '#BA55D3', '#DA70D6'
            ]
        };
    }

    /**
     * Generate color variations
     */
    static generateVariations(baseColor, count = 5) {
        const variations = [];
        const step = 20;
        
        for (let i = 0; i < count; i++) {
            if (i < count / 2) {
                variations.push(this.darken(baseColor, step * (count / 2 - i)));
            } else if (i === Math.floor(count / 2)) {
                variations.push(baseColor);
            } else {
                variations.push(this.lighten(baseColor, step * (i - count / 2)));
            }
        }
        
        return variations;
    }

    /**
     * Convert color to CSS format
     */
    static toCss(hex, alpha = 1) {
        if (alpha === 1) {
            return hex;
        }
        
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Get complementary color
     */
    static getComplementary(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
    }

    /**
     * Get analogous colors
     */
    static getAnalogous(hex, count = 2) {
        // This is a simplified version - in a real app you'd convert to HSL
        const variations = [];
        const rgb = this.hexToRgb(hex);
        if (!rgb) return [hex];
        
        for (let i = 1; i <= count; i++) {
            const shift = 30 * i;
            variations.push(this.rgbToHex(
                (rgb.r + shift) % 256,
                (rgb.g + shift / 2) % 256,
                (rgb.b + shift / 3) % 256
            ));
        }
        
        return variations;
    }
}

