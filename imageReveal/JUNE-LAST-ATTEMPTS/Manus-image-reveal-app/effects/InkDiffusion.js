/**
 * Ink Diffusion Effect
 * Simulates ink spreading through water to reveal the image
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class InkDiffusion extends EffectBase {
    constructor(name = 'InkDiffusion', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            dropCount: this.options.dropCount || 5,
            diffusionSpeed: this.options.diffusionSpeed || 1.0,
            viscosity: this.options.viscosity || 0.8,
            turbulence: this.options.turbulence || 0.3,
            colorBlending: this.options.colorBlending || 0.7,
            edgeSharpness: this.options.edgeSharpness || 0.5,
            beatSync: this.options.beatSync !== false, // Default true
            inkColor: this.options.inkColor || null, // null = use image colors
            backgroundFade: this.options.backgroundFade || 0.9,
            ...this.parameters
        };
        
        // Diffusion simulation state
        this.inkDrops = [];
        this.diffusionField = null;
        this.velocityField = null;
        this.fieldWidth = 0;
        this.fieldHeight = 0;
        this.fieldScale = 4; // Simulation resolution scale
    }

    /**
     * Render Ink Diffusion effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Initialize simulation if needed
        if (!this.diffusionField) {
            this.initializeDiffusionSimulation();
        }
        
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Update ink drops
        this.updateInkDrops(timingInfo, intensity);
        
        // Simulate diffusion
        this.simulateDiffusion(timingInfo, intensity);
        
        // Apply diffusion to image
        this.applyInkDiffusion(intensity);
    }

    /**
     * Initialize the diffusion simulation
     */
    initializeDiffusionSimulation() {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        
        // Create lower resolution simulation field
        this.fieldWidth = Math.ceil(width / this.fieldScale);
        this.fieldHeight = Math.ceil(height / this.fieldScale);
        
        // Initialize diffusion field (concentration values 0-1)
        this.diffusionField = new Float32Array(this.fieldWidth * this.fieldHeight);
        
        // Initialize velocity field for fluid simulation
        this.velocityField = {
            x: new Float32Array(this.fieldWidth * this.fieldHeight),
            y: new Float32Array(this.fieldWidth * this.fieldHeight)
        };
        
        // Initialize ink drops
        this.inkDrops = [];
        
        console.log(`Diffusion simulation initialized: ${this.fieldWidth}x${this.fieldHeight}`);
    }

    /**
     * Update ink drops and create new ones
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    updateInkDrops(timingInfo, intensity) {
        // Create new ink drops on beats or at intervals
        if (this.parameters.beatSync) {
            const beatPhase = timingInfo.currentBeat % 1;
            if (beatPhase < 0.1 && this.inkDrops.length < this.parameters.dropCount) {
                this.createInkDrop(intensity);
            }
        } else {
            // Create drops at regular intervals
            if (this.inkDrops.length < this.parameters.dropCount) {
                if (this.inkDrops.length === 0 || 
                    timingInfo.currentTime - this.inkDrops[this.inkDrops.length - 1].creationTime > 0.5) {
                    this.createInkDrop(intensity);
                }
            }
        }
        
        // Update existing drops
        for (const drop of this.inkDrops) {
            drop.age = timingInfo.currentTime - drop.creationTime;
            drop.radius = Math.min(drop.maxRadius, drop.age * this.parameters.diffusionSpeed * 20);
            drop.concentration = Math.max(0, drop.initialConcentration * Math.exp(-drop.age * 0.5));
        }
        
        // Remove old drops
        this.inkDrops = this.inkDrops.filter(drop => drop.concentration > 0.01);
    }

    /**
     * Create a new ink drop
     * @param {number} intensity - Effect intensity
     */
    createInkDrop(intensity) {
        const drop = {
            x: this.random.nextFloat(0.2, 0.8) * this.fieldWidth,
            y: this.random.nextFloat(0.2, 0.8) * this.fieldHeight,
            radius: 0,
            maxRadius: this.random.nextFloat(20, 50) * intensity,
            initialConcentration: this.random.nextFloat(0.7, 1.0) * intensity,
            concentration: this.random.nextFloat(0.7, 1.0) * intensity,
            creationTime: performance.now() / 1000,
            age: 0,
            color: this.getInkColor()
        };
        
        this.inkDrops.push(drop);
    }

    /**
     * Get ink color for a drop
     * @returns {Array<number>} RGB color values
     */
    getInkColor() {
        if (this.parameters.inkColor) {
            return this.parameters.inkColor;
        }
        
        // Sample random color from original image
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        const data = this.originalImageData.data;
        
        const x = this.random.nextInt(0, width - 1);
        const y = this.random.nextInt(0, height - 1);
        const index = (y * width + x) * 4;
        
        return [data[index], data[index + 1], data[index + 2]];
    }

    /**
     * Simulate ink diffusion using simplified fluid dynamics
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    simulateDiffusion(timingInfo, intensity) {
        // Clear fields
        this.diffusionField.fill(0);
        this.velocityField.x.fill(0);
        this.velocityField.y.fill(0);
        
        // Add ink drops to diffusion field
        for (const drop of this.inkDrops) {
            this.addDropToDiffusionField(drop);
        }
        
        // Apply diffusion simulation steps
        this.applyDiffusionStep(intensity);
        this.applyViscosityStep();
        this.applyTurbulenceStep(timingInfo, intensity);
        
        // Smooth the field
        this.smoothDiffusionField();
    }

    /**
     * Add an ink drop to the diffusion field
     * @param {Object} drop - Ink drop object
     */
    addDropToDiffusionField(drop) {
        const centerX = Math.round(drop.x);
        const centerY = Math.round(drop.y);
        const radius = drop.radius;
        const concentration = drop.concentration;
        
        // Add drop influence in a circular area
        const minX = Math.max(0, centerX - Math.ceil(radius));
        const maxX = Math.min(this.fieldWidth - 1, centerX + Math.ceil(radius));
        const minY = Math.max(0, centerY - Math.ceil(radius));
        const maxY = Math.min(this.fieldHeight - 1, centerY + Math.ceil(radius));
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - drop.x;
                const dy = y - drop.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    const falloff = 1 - (distance / radius);
                    const influence = concentration * falloff * falloff; // Quadratic falloff
                    
                    const index = y * this.fieldWidth + x;
                    this.diffusionField[index] = Math.max(this.diffusionField[index], influence);
                }
            }
        }
    }

    /**
     * Apply diffusion step (ink spreading)
     * @param {number} intensity - Effect intensity
     */
    applyDiffusionStep(intensity) {
        const tempField = new Float32Array(this.diffusionField);
        const diffusionRate = 0.1 * this.parameters.diffusionSpeed * intensity;
        
        for (let y = 1; y < this.fieldHeight - 1; y++) {
            for (let x = 1; x < this.fieldWidth - 1; x++) {
                const index = y * this.fieldWidth + x;
                
                // Calculate diffusion from neighboring cells
                const neighbors = [
                    tempField[index - 1],           // Left
                    tempField[index + 1],           // Right
                    tempField[index - this.fieldWidth], // Up
                    tempField[index + this.fieldWidth], // Down
                ];
                
                const avgNeighbor = neighbors.reduce((sum, val) => sum + val, 0) / 4;
                const current = tempField[index];
                
                // Apply diffusion
                this.diffusionField[index] = current + (avgNeighbor - current) * diffusionRate;
            }
        }
    }

    /**
     * Apply viscosity step (resistance to flow)
     */
    applyViscosityStep() {
        const viscosity = this.parameters.viscosity;
        
        // Apply viscosity to velocity field
        for (let i = 0; i < this.velocityField.x.length; i++) {
            this.velocityField.x[i] *= viscosity;
            this.velocityField.y[i] *= viscosity;
        }
    }

    /**
     * Apply turbulence step (chaotic motion)
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    applyTurbulenceStep(timingInfo, intensity) {
        const turbulence = this.parameters.turbulence * intensity;
        const time = timingInfo.currentTime;
        
        for (let y = 0; y < this.fieldHeight; y++) {
            for (let x = 0; x < this.fieldWidth; x++) {
                const index = y * this.fieldWidth + x;
                
                // Generate turbulence using noise
                const noiseX = this.noise2D(x * 0.1, y * 0.1 + time * 0.5) * turbulence;
                const noiseY = this.noise2D(x * 0.1 + 100, y * 0.1 + time * 0.5) * turbulence;
                
                this.velocityField.x[index] += noiseX;
                this.velocityField.y[index] += noiseY;
                
                // Apply velocity to diffusion field
                const concentration = this.diffusionField[index];
                if (concentration > 0.1) {
                    const moveX = this.velocityField.x[index] * 0.5;
                    const moveY = this.velocityField.y[index] * 0.5;
                    
                    // Simple advection
                    const newX = Math.max(0, Math.min(this.fieldWidth - 1, x + moveX));
                    const newY = Math.max(0, Math.min(this.fieldHeight - 1, y + moveY));
                    const newIndex = Math.round(newY) * this.fieldWidth + Math.round(newX);
                    
                    if (newIndex !== index && newIndex >= 0 && newIndex < this.diffusionField.length) {
                        this.diffusionField[newIndex] = Math.max(
                            this.diffusionField[newIndex], 
                            concentration * 0.1
                        );
                    }
                }
            }
        }
    }

    /**
     * Smooth the diffusion field
     */
    smoothDiffusionField() {
        const tempField = new Float32Array(this.diffusionField);
        const smoothing = 0.3;
        
        for (let y = 1; y < this.fieldHeight - 1; y++) {
            for (let x = 1; x < this.fieldWidth - 1; x++) {
                const index = y * this.fieldWidth + x;
                
                // 3x3 smoothing kernel
                let sum = 0;
                let count = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < this.fieldWidth && ny >= 0 && ny < this.fieldHeight) {
                            const nIndex = ny * this.fieldWidth + nx;
                            sum += tempField[nIndex];
                            count++;
                        }
                    }
                }
                
                const smoothed = sum / count;
                this.diffusionField[index] = tempField[index] * (1 - smoothing) + smoothed * smoothing;
            }
        }
    }

    /**
     * Apply ink diffusion to the image
     * @param {number} intensity - Effect intensity
     */
    applyInkDiffusion(intensity) {
        // Start with faded background
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        const width = this.outputImageData.width;
        const height = this.outputImageData.height;
        const data = this.outputImageData.data;
        
        // Apply background fade
        const backgroundFade = this.parameters.backgroundFade;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] * backgroundFade);         // R
            data[i + 1] = Math.round(data[i + 1] * backgroundFade); // G
            data[i + 2] = Math.round(data[i + 2] * backgroundFade); // B
        }
        
        // Apply diffusion field to image
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = y * width + x;
                const dataIndex = pixelIndex * 4;
                
                // Sample from diffusion field
                const fieldX = Math.floor(x / this.fieldScale);
                const fieldY = Math.floor(y / this.fieldScale);
                const fieldIndex = fieldY * this.fieldWidth + fieldX;
                
                if (fieldIndex >= 0 && fieldIndex < this.diffusionField.length) {
                    const diffusion = this.diffusionField[fieldIndex];
                    
                    if (diffusion > 0.1) {
                        // Reveal original image based on diffusion
                        const revealAmount = Math.min(1, diffusion * intensity);
                        
                        // Get original pixel color
                        const originalIndex = pixelIndex * 4;
                        const originalData = this.originalImageData.data;
                        
                        // Blend with ink color if specified
                        let targetR = originalData[originalIndex];
                        let targetG = originalData[originalIndex + 1];
                        let targetB = originalData[originalIndex + 2];
                        
                        if (this.parameters.colorBlending > 0) {
                            // Find nearest ink drop for color
                            const inkColor = this.getNearestInkColor(x, y);
                            if (inkColor) {
                                const blending = this.parameters.colorBlending * diffusion;
                                targetR = targetR * (1 - blending) + inkColor[0] * blending;
                                targetG = targetG * (1 - blending) + inkColor[1] * blending;
                                targetB = targetB * (1 - blending) + inkColor[2] * blending;
                            }
                        }
                        
                        // Apply reveal with edge sharpness
                        const edgeSharpness = this.parameters.edgeSharpness;
                        const sharpReveal = Math.pow(revealAmount, 1 / (edgeSharpness + 0.1));
                        
                        data[dataIndex] = data[dataIndex] * (1 - sharpReveal) + targetR * sharpReveal;
                        data[dataIndex + 1] = data[dataIndex + 1] * (1 - sharpReveal) + targetG * sharpReveal;
                        data[dataIndex + 2] = data[dataIndex + 2] * (1 - sharpReveal) + targetB * sharpReveal;
                    }
                }
            }
        }
        
        // Add ink texture effects
        if (intensity > 0.4) {
            this.addInkTexture(this.outputImageData, intensity);
        }
    }

    /**
     * Get nearest ink color for a pixel
     * @param {number} x - Pixel X coordinate
     * @param {number} y - Pixel Y coordinate
     * @returns {Array<number>|null} RGB color or null
     */
    getNearestInkColor(x, y) {
        let nearestDrop = null;
        let minDistance = Infinity;
        
        const fieldX = x / this.fieldScale;
        const fieldY = y / this.fieldScale;
        
        for (const drop of this.inkDrops) {
            const dx = fieldX - drop.x;
            const dy = fieldY - drop.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance && distance <= drop.radius) {
                minDistance = distance;
                nearestDrop = drop;
            }
        }
        
        return nearestDrop ? nearestDrop.color : null;
    }

    /**
     * Add ink texture effects
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    addInkTexture(imageData, intensity) {
        const data = imageData.data;
        const textureIntensity = intensity * 0.2;
        
        for (let i = 0; i < data.length; i += 4) {
            // Add subtle texture noise
            if (this.random.next() < textureIntensity * 0.1) {
                const noise = (this.random.next() - 0.5) * 20 * textureIntensity;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
    }

    /**
     * Simple 2D noise function
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    noise2D(x, y) {
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (hash - Math.floor(hash)) * 2 - 1;
    }

    /**
     * Get diffusion progress
     * @returns {number} Average diffusion amount (0-1)
     */
    getDiffusionProgress() {
        if (!this.diffusionField) return 0;
        
        let totalDiffusion = 0;
        for (let i = 0; i < this.diffusionField.length; i++) {
            totalDiffusion += this.diffusionField[i];
        }
        
        return Math.min(1, totalDiffusion / (this.diffusionField.length * 0.5));
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Ink Diffusion effect started with ${this.parameters.dropCount} drops`);
        this.inkDrops = [];
        this.diffusionField = null;
        this.velocityField = null;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log(`Ink Diffusion effect completed. Final diffusion: ${(this.getDiffusionProgress() * 100).toFixed(1)}%`);
    }
}

