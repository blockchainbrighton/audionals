/**
 * Visual Enhancements for Interactive Story Experience
 * Provides advanced visual effects and animations
 */

class VisualEnhancer {
    constructor(options = {}) {
        this.options = Object.assign({
            container: null,
            visualContainer: null,
            textDisplay: null
        }, options);
        
        this.container = this.options.container || document.body;
        this.visualContainer = this.options.visualContainer || document.getElementById('visual-container');
        this.textDisplay = this.options.textDisplay || document.getElementById('text-display');
        
        this.effects = {};
        this.animations = {};
        this.particleSystems = {};
        
        this.initialize();
    }
    
    /**
     * Initialize visual enhancer
     */
    initialize() {
        // Create background effects container if it doesn't exist
        if (!document.querySelector('.background-effects')) {
            this.backgroundEffects = document.createElement('div');
            this.backgroundEffects.className = 'background-effects';
            document.body.insertBefore(this.backgroundEffects, document.body.firstChild);
            
            // Create stars background
            this.starsBackground = document.createElement('div');
            this.starsBackground.className = 'stars';
            this.backgroundEffects.appendChild(this.starsBackground);
        } else {
            this.backgroundEffects = document.querySelector('.background-effects');
            this.starsBackground = document.querySelector('.stars');
        }
        
        // Create effects container
        this.effectsContainer = document.createElement('div');
        this.effectsContainer.className = 'effects-container';
        this.visualContainer.appendChild(this.effectsContainer);
        
        // Initialize effects
        this.initializeEffects();
        
        // Initialize particle systems
        this.initializeParticleSystems();
        
        console.log('Visual enhancer initialized');
    }
    
    /**
     * Initialize visual effects
     */
    initializeEffects() {
        // Create glow effect
        this.effects.glow = this.createEffectLayer('glow-effect');
        
        // Create ripple effect
        this.effects.ripple = this.createEffectLayer('ripple-effect');
        
        // Create vignette effect
        this.effects.vignette = this.createEffectLayer('vignette-effect');
        
        // Create blur effect
        this.effects.blur = this.createEffectLayer('blur-effect');
        
        // Create color shift effect
        this.effects.colorShift = this.createEffectLayer('color-shift-effect');
        
        // Create noise effect
        this.effects.noise = this.createEffectLayer('noise-effect');
        
        // Create scanline effect
        this.effects.scanlines = this.createEffectLayer('scanlines-effect');
        
        // Create glitch effect
        this.effects.glitch = this.createEffectLayer('glitch-effect');
    }
    
    /**
     * Create an effect layer
     * @param {string} className - CSS class name for the effect
     */
    createEffectLayer(className) {
        const layer = document.createElement('div');
        layer.className = `effect-layer ${className}`;
        layer.style.opacity = '0';
        this.effectsContainer.appendChild(layer);
        return layer;
    }
    
    /**
     * Initialize particle systems
     */
    initializeParticleSystems() {
        // Create particle container
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'particle-container';
        this.visualContainer.appendChild(this.particleContainer);
        
        // Create canvas for particles
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.className = 'particle-canvas';
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
        this.particleContainer.appendChild(this.particleCanvas);
        
        // Get canvas context
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        // Initialize particle systems
        this.particleSystems.ambient = this.createAmbientParticles();
        this.particleSystems.explosion = this.createExplosionParticles();
        this.particleSystems.stream = this.createStreamParticles();
        this.particleSystems.vortex = this.createVortexParticles();
        this.particleSystems.starburst = this.createStarburstParticles();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.particleCanvas.width = window.innerWidth;
            this.particleCanvas.height = window.innerHeight;
        });
    }
    
    /**
     * Create ambient particles
     */
    createAmbientParticles() {
        const particles = [];
        const count = 50;
        
        // Create particles
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * this.particleCanvas.width,
                y: Math.random() * this.particleCanvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: `hsla(${Math.random() * 60 + 180}, 100%, 70%, ${Math.random() * 0.5 + 0.3})`,
                life: 1.0
            });
        }
        
        return {
            particles,
            active: false,
            
            start: () => {
                this.particleSystems.ambient.active = true;
                this.drawParticles();
            },
            
            stop: () => {
                this.particleSystems.ambient.active = false;
            },
            
            update: () => {
                particles.forEach(p => {
                    p.x += p.speedX;
                    p.y += p.speedY;
                    
                    // Wrap around edges
                    if (p.x < 0) p.x = this.particleCanvas.width;
                    if (p.x > this.particleCanvas.width) p.x = 0;
                    if (p.y < 0) p.y = this.particleCanvas.height;
                    if (p.y > this.particleCanvas.height) p.y = 0;
                });
            },
            
            draw: () => {
                particles.forEach(p => {
                    this.particleCtx.beginPath();
                    this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.particleCtx.fillStyle = p.color;
                    this.particleCtx.fill();
                });
            }
        };
    }
    
    /**
     * Create explosion particles
     */
    createExplosionParticles() {
        const particles = [];
        
        return {
            particles,
            active: false,
            
            trigger: (x, y, count = 100, color = '#00e5ff') => {
                // Clear existing particles
                particles.length = 0;
                
                // Create new particles
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 5 + 2;
                    const size = Math.random() * 4 + 2;
                    
                    particles.push({
                        x: x || this.particleCanvas.width / 2,
                        y: y || this.particleCanvas.height / 2,
                        size,
                        speedX: Math.cos(angle) * speed,
                        speedY: Math.sin(angle) * speed,
                        color: color,
                        life: 1.0
                    });
                }
                
                this.particleSystems.explosion.active = true;
                
                // Auto-stop after animation completes
                setTimeout(() => {
                    this.particleSystems.explosion.active = false;
                }, 3000);
            },
            
            update: () => {
                const remainingParticles = [];
                
                particles.forEach(p => {
                    p.life -= 0.01;
                    if (p.life <= 0) return;
                    
                    p.x += p.speedX;
                    p.y += p.speedY;
                    
                    // Slow down over time
                    p.speedX *= 0.98;
                    p.speedY *= 0.98;
                    
                    remainingParticles.push(p);
                });
                
                this.particleSystems.explosion.particles = remainingParticles;
            },
            
            draw: () => {
                particles.forEach(p => {
                    this.particleCtx.beginPath();
                    this.particleCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                    this.particleCtx.fillStyle = p.color.replace(')', `,${p.life})`);
                    this.particleCtx.fill();
                });
            }
        };
    }
    
    /**
     * Create stream particles
     */
    createStreamParticles() {
        const particles = [];
        
        return {
            particles,
            active: false,
            direction: { x: 1, y: 0 },
            
            trigger: (direction = { x: 1, y: 0 }, count = 150, color = '#00e5ff') => {
                // Set direction
                this.particleSystems.stream.direction = direction;
                
                // Clear existing particles
                particles.length = 0;
                
                // Create new particles
                for (let i = 0; i < count; i++) {
                    particles.push(this.createStreamParticle(direction, color));
                }
                
                this.particleSystems.stream.active = true;
                
                // Auto-stop after animation completes
                setTimeout(() => {
                    this.particleSystems.stream.active = false;
                }, 5000);
            },
            
            update: () => {
                const newParticles = [];
                
                particles.forEach(p => {
                    p.x += p.speedX;
                    p.y += p.speedY;
                    
                    // Store previous position for tail
                    p.tail.unshift({ x: p.x, y: p.y });
                    if (p.tail.length > 5) {
                        p.tail.pop();
                    }
                    
                    // Check if particle is still on screen
                    if (p.x >= 0 && p.x <= this.particleCanvas.width && 
                        p.y >= 0 && p.y <= this.particleCanvas.height) {
                        newParticles.push(p);
                    }
                });
                
                // Add new particles to replace those that have gone off-screen
                while (newParticles.length < 150) {
                    newParticles.push(this.createStreamParticle(
                        this.particleSystems.stream.direction, 
                        newParticles[0] ? newParticles[0].color : '#00e5ff'
                    ));
                }
                
                this.particleSystems.stream.particles = newParticles;
            },
            
            draw: () => {
                particles.forEach(p => {
                    // Draw tail
                    if (p.tail.length > 0) {
                        this.particleCtx.beginPath();
                        this.particleCtx.moveTo(p.x, p.y);
                        
                        for (let i = 0; i < p.tail.length; i++) {
                            this.particleCtx.lineTo(p.tail[i].x, p.tail[i].y);
                        }
                        
                        const gradient = this.particleCtx.createLinearGradient(
                            p.x, p.y, 
                            p.tail[p.tail.length - 1].x, 
                            p.tail[p.tail.length - 1].y
                        );
                        
                        gradient.addColorStop(0, p.color);
                        gradient.addColorStop(1, p.color.replace(')', ',0)'));
                        
                        this.particleCtx.strokeStyle = gradient;
                        this.particleCtx.lineWidth = p.size * 0.8;
                        this.particleCtx.stroke();
                    }
                    
                    // Draw particle
                    this.particleCtx.beginPath();
                    this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.particleCtx.fillStyle = p.color;
                    this.particleCtx.fill();
                });
            }
        };
    }
    
    /**
     * Create a stream particle
     */
    createStreamParticle(direction, color) {
        let x, y;
        
        if (Math.abs(direction.x) > Math.abs(direction.y)) {
            // Flow is more horizontal
            x = direction.x > 0 ? 0 : this.particleCanvas.width;
            y = Math.random() * this.particleCanvas.height;
        } else {
            // Flow is more vertical
            x = Math.random() * this.particleCanvas.width;
            y = direction.y > 0 ? 0 : this.particleCanvas.height;
        }
        
        return {
            x,
            y,
            size: Math.random() * 3 + 1,
            speedX: direction.x * (Math.random() * 2 + 3),
            speedY: direction.y * (Math.random() * 2 + 3),
            color: color,
            tail: []
        };
    }
    
    /**
     * Create vortex particles
     */
    createVortexParticles() {
        const particles = [];
        
        return {
            particles,
            active: false,
            centerX: 0,
            centerY: 0,
            
            trigger: (x, y, count = 200, color = '#00e5ff') => {
                // Set center point
                this.particleSystems.vortex.centerX = x || this.particleCanvas.width / 2;
                this.particleSystems.vortex.centerY = y || this.particleCanvas.height / 2;
                
                // Clear existing particles
                particles.length = 0;
                
                // Create new particles
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 100 + 50;
                    
                    particles.push({
                        x: this.particleSystems.vortex.centerX + Math.cos(angle) * distance,
                        y: this.particleSystems.vortex.centerY + Math.sin(angle) * distance,
                        size: Math.random() * 3 + 1,
                        angle,
                        distance,
                        speed: Math.random() * 0.05 + 0.02,
                        color: color,
                        life: 1.0
                    });
                }
                
                this.particleSystems.vortex.active = true;
                
                // Auto-stop after animation completes
                setTimeout(() => {
                    this.particleSystems.vortex.active = false;
                }, 5000);
            },
            
            update: () => {
                const remainingParticles = [];
                
                particles.forEach(p => {
                    p.life -= 0.005;
                    if (p.life <= 0) return;
                    
                    // Update angle and distance
                    p.angle += p.speed;
                    p.distance -= p.speed * 10;
                    
                    // Update position
                    p.x = this.particleSystems.vortex.centerX + Math.cos(p.angle) * p.distance;
                    p.y = this.particleSystems.vortex.centerY + Math.sin(p.angle) * p.distance;
                    
                    // Keep particles that are still visible
                    if (p.distance > 0) {
                        remainingParticles.push(p);
                    }
                });
                
                this.particleSystems.vortex.particles = remainingParticles;
            },
            
            draw: () => {
                particles.forEach(p => {
                    this.particleCtx.beginPath();
                    this.particleCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                    this.particleCtx.fillStyle = p.color.replace(')', `,${p.life})`);
                    this.particleCtx.fill();
                });
            }
        };
    }
    
    /**
     * Create starburst particles
     */
    createStarburstParticles() {
        const particles = [];
        
        return {
            particles,
            active: false,
            
            trigger: (x, y, count = 150, color = '#ffc107') => {
                // Clear existing particles
                particles.length = 0;
                
                // Create new particles
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 8 + 4;
                    
                    particles.push({
                        x: x || this.particleCanvas.width / 2,
                        y: y || this.particleCanvas.height / 2,
                        size: Math.random() * 4 + 2,
                        speedX: Math.cos(angle) * speed,
                        speedY: Math.sin(angle) * speed,
                        color: color,
                        life: 1.0,
                        decay: Math.random() * 0.01 + 0.005
                    });
                }
                
                this.particleSystems.starburst.active = true;
                
                // Auto-stop after animation completes
                setTimeout(() => {
                    this.particleSystems.starburst.active = false;
                }, 3000);
            },
            
            update: () => {
                const remainingParticles = [];
                
                particles.forEach(p => {
                    p.life -= p.decay;
                    if (p.life <= 0) return;
                    
                    p.x += p.speedX;
                    p.y += p.speedY;
                    
                    // Slow down over time
                    p.speedX *= 0.97;
                    p.speedY *= 0.97;
                    
                    remainingParticles.push(p);
                });
                
                this.particleSystems.starburst.particles = remainingParticles;
            },
            
            draw: () => {
                particles.forEach(p => {
                    this.particleCtx.beginPath();
                    
                    // Draw star shape
                    const outerRadius = p.size * p.life;
                    const innerRadius = outerRadius * 0.5;
                    const spikes = 5;
                    
                    for (let i = 0; i < spikes * 2; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = (i / (spikes * 2)) * Math.PI * 2;
                        
                        const x = p.x + Math.cos(angle) * radius;
                        const y = p.y + Math.sin(angle) * radius;
                        
                        if (i === 0) {
                            this.particleCtx.moveTo(x, y);
                        } else {
                            this.particleCtx.lineTo(x, y);
                        }
                    }
                    
                    this.particleCtx.closePath();
                    this.particleCtx.fillStyle = p.color.replace(')', `,${p.life})`);
                    this.particleCtx.fill();
                });
            }
        };
    }
    
    /**
     * Draw all active particle systems
     */
    drawParticles() {
        if (!this.particleCtx) return;
        
        // Clear canvas
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        // Update and draw each active particle system
        Object.values(this.particleSystems).forEach(system => {
            if (system.active) {
                system.update();
                system.draw();
            }
        });
        
        // Continue animation loop if any system is active
        const anyActive = Object.values(this.particleSystems).some(system => system.active);
        if (anyActive) {
            requestAnimationFrame(() => this.drawParticles());
        }
    }
    
    /**
     * Show effect
     * @param {string} effectName - Name of the effect to show
     * @param {Object} options - Effect options
     */
    showEffect(effectName, options = {}) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        const opts = Object.assign({
            duration: 2000,
            intensity: 1.0
        }, options);
        
        // Set effect intensity via opacity
        effect.style.opacity = opts.intensity;
        
        // Hide effect after duration
        setTimeout(() => {
            effect.style.opacity = '0';
        }, opts.duration);
    }
    
    /**
     * Trigger particle effect
     * @param {string} effectName - Name of the particle effect to trigger
     * @param {Object} options - Effect options
     */
    triggerParticleEffect(effectName, options = {}) {
        const system = this.particleSystems[effectName];
        if (!system) return;
        
        const opts = Object.assign({
            x: this.particleCanvas.width / 2,
            y: this.particleCanvas.height / 2,
            count: 100,
            color: '#00e5ff'
        }, options);
        
        system.trigger(opts.x, opts.y, opts.count, opts.color);
        this.drawParticles();
    }
    
    /**
     * Apply text animation
     * @param {string} animationType - Type of animation to apply
     * @param {string} text - Text content
     * @param {Object} options - Animation options
     */
    animateText(animationType, text, options = {}) {
        const opts = Object.assign({
            duration: 1000,
            delay: 0
        }, options);
        
        // Set text content
        this.textDisplay.innerHTML = text;
        
        // Remove any existing animation classes
        this.textDisplay.className = '';
        
        // Force reflow to restart animation
        void this.textDisplay.offsetWidth;
        
        // Add animation class
        this.textDisplay.classList.add(`${animationType}-animation`);
        
        // Remove animation class after duration
        setTimeout(() => {
            this.textDisplay.classList.remove(`${animationType}-animation`);
        }, opts.duration);
    }
    
    /**
     * Create a transition effect between scenes
     * @param {string} transitionType - Type of transition
     * @param {Object} options - Transition options
     */
    createTransition(transitionType, options = {}) {
        const opts = Object.assign({
            duration: 1000,
            color: '#000'
        }, options);
        
        // Create transition overlay
        const overlay = document.createElement('div');
        overlay.className = `transition-overlay ${transitionType}-transition`;
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = opts.color;
        overlay.style.zIndex = '1000';
        overlay.style.pointerEvents = 'none';
        
        // Set initial state
        switch (transitionType) {
            case 'fade':
                overlay.style.opacity = '0';
                break;
            case 'wipe':
                overlay.style.transform = 'translateX(-100%)';
                break;
            case 'zoom':
                overlay.style.transform = 'scale(0)';
                overlay.style.opacity = '0';
                break;
        }
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Force reflow
        void overlay.offsetWidth;
        
        // Animate in
        switch (transitionType) {
            case 'fade':
                overlay.style.transition = `opacity ${opts.duration / 2}ms ease`;
                overlay.style.opacity = '1';
                break;
            case 'wipe':
                overlay.style.transition = `transform ${opts.duration / 2}ms ease`;
                overlay.style.transform = 'translateX(0)';
                break;
            case 'zoom':
                overlay.style.transition = `transform ${opts.duration / 2}ms ease, opacity ${opts.duration / 2}ms ease`;
                overlay.style.transform = 'scale(1)';
                overlay.style.opacity = '1';
                break;
        }
        
        // Return promise that resolves when transition is complete
        return new Promise(resolve => {
            setTimeout(() => {
                // Execute callback at midpoint
                if (opts.onMidpoint) {
                    opts.onMidpoint();
                }
                
                // Animate out
                switch (transitionType) {
                    case 'fade':
                        overlay.style.opacity = '0';
                        break;
                    case 'wipe':
                        overlay.style.transform = 'translateX(100%)';
                        break;
                    case 'zoom':
                        overlay.style.transform = 'scale(2)';
                        overlay.style.opacity = '0';
                        break;
                }
                
                // Remove overlay after animation
                setTimeout(() => {
                    overlay.parentNode.removeChild(overlay);
                    resolve();
                }, opts.duration / 2);
            }, opts.duration / 2);
        });
    }
}

// Export VisualEnhancer class
window.VisualEnhancer = VisualEnhancer;

