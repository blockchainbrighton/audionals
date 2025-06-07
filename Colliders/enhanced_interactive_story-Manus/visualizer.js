// ... (InteractiveStoryApp, StandardMode, loadingStyles) ...

/**
 * Audio Visualizer Components for Enhanced Interactive Story Experience
 */

class AudioVisualizer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = Object.assign({
            particleCount: 100,
            particleColor: '#00e5ff', // Default is hex
            particleSize: 2,
            particleSpeed: 1,
            responsive: true,
            mode: 'standard' // standard, saga, epic
        }, options);
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'visualizer';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        this.particles = [];
        this.audioData = null;
        this.isActive = false;
        this.animationFrame = null;
        
        this.resize();
        if (this.options.responsive) {
            window.addEventListener('resize', () => this.resize());
        }
        
        // REMOVED: this.init(); 
        // Initialization will be called by subclasses or by AudioVisualizer if instantiated directly
        if (this.constructor === AudioVisualizer) {
            this.init(); // Call init only if AudioVisualizer itself is instantiated
        }
    }
    
    init() {
        this.createParticles();
    }
    
    resize() {
        if (!this.container) return; // Guard against resize before container is ready
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    createParticles() {
        this.particles = [];
        const count = this.options.mode === 'epic' ? 
                      this.options.particleCount * 2 : 
                      this.options.particleCount;
                      
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle() { // Base particle creation
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * this.options.particleSize + 1,
            speedX: (Math.random() - 0.5) * this.options.particleSpeed,
            speedY: (Math.random() - 0.5) * this.options.particleSpeed,
            color: this.getParticleColor(),
            alpha: Math.random() * 0.8 + 0.2
        };
    }
    
    getParticleColor() {
        switch(this.options.mode) {
            case 'saga':
                return `hsl(${280 + Math.random() * 40}, 100%, 70%)`;
            case 'epic':
                return `hsl(${40 + Math.random() * 20}, 100%, 60%)`;
            default: // 'standard'
                return this.options.particleColor; // This is hex by default
        }
    }
    
    updateAudioData(audioData) {
        this.audioData = audioData;
    }
    
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.animate();
    }
    
    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.updateParticles();
        this.drawParticles();
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    updateParticles() {
        const audioIntensity = this.getAudioIntensity();
        
        this.particles.forEach(p => {
            // Apply audio reactivity
            const speed = audioIntensity > 0.1 ? 
                          this.options.particleSpeed * (1 + audioIntensity * 2) : 
                          this.options.particleSpeed;
            
            p.x += p.speedX * speed;
            p.y += p.speedY * speed;
            
            // Wrap around edges
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
            
            // Pulse size with audio
            p.displaySize = p.size * (1 + audioIntensity * 3);
            
            // Adjust alpha based on audio
            p.displayAlpha = p.alpha * (1 + audioIntensity);
            if (p.displayAlpha > 1) p.displayAlpha = 1;
        });
    }
    
    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.displaySize || p.size, 0, Math.PI * 2);

            let finalColor = p.color;
            const alpha = p.displayAlpha !== undefined ? p.displayAlpha : p.alpha;

            if (finalColor.startsWith('hsl(')) {
                finalColor = finalColor.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
            } else if (finalColor.startsWith('rgb(')) {
                finalColor = finalColor.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
            } else if (finalColor.startsWith('#')) {
                const r = parseInt(finalColor.slice(1, 3), 16);
                const g = parseInt(finalColor.slice(3, 5), 16);
                const b = parseInt(finalColor.slice(5, 7), 16);
                finalColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            // else, named colors won't get alpha via this string manipulation.

            this.ctx.fillStyle = finalColor;
            this.ctx.fill();
        });
        
        // Draw connections in Saga and Epic modes
        if (this.options.mode === 'saga' || this.options.mode === 'epic') {
            this.drawConnections();
        }
    }
    
    drawConnections() {
        const maxDistance = this.options.mode === 'epic' ? 150 : 100;
        const audioIntensity = this.getAudioIntensity();
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    const lineAlpha = Math.max(0, (1 - distance / maxDistance) * 0.5 * (p1.alpha + p2.alpha) * (1 + audioIntensity));
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    
                    if (this.options.mode === 'saga') {
                        this.ctx.strokeStyle = `rgba(156, 39, 176, ${lineAlpha})`;
                    } else { // epic or others if connections enabled
                        this.ctx.strokeStyle = `rgba(255, 193, 7, ${lineAlpha})`;
                    }
                    
                    this.ctx.lineWidth = 0.5 + audioIntensity;
                    this.ctx.stroke();
                }
            }
        }
    }
    
    getAudioIntensity() {
        if (!this.audioData || this.audioData.length === 0) return 0;
        
        let sum = 0;
        for (let i = 0; i < this.audioData.length; i++) {
            sum += Math.abs(this.audioData[i]);
        }
        const intensity = sum / this.audioData.length;
        return Math.min(1, Math.max(0, intensity)); // Clamp between 0 and 1
    }
}

class ImpactVisualizer extends AudioVisualizer {
    constructor(container, options = {}) {
        super(container, Object.assign({
            particleCount: 200,
            particleSize: 3,
            particleSpeed: 2,
            // mode: 'standard' // Inherits default or can be overridden
        }, options));
        
        this.canvas.className = 'visualizer visualizer-impact';
        this.explosionTime = 0;
        this.explosionDuration = 2000; // ms

        this.init(); // Call init after subclass properties are set
    }
    
    // createParticles is called by init, but for ImpactVisualizer it should do nothing initially.
    // Particles are created on triggerExplosion.
    createParticles() {
        this.particles = []; 
    }
    
    triggerExplosion(intensity = 1) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const count = this.options.mode === 'epic' ? 
                      this.options.particleCount * 2 : 
                      this.options.particleCount;
        
        this.particles = []; // Clear any previous explosion particles
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 5 + 2) * intensity;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                size: Math.random() * this.options.particleSize * intensity + 1,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                color: this.getExplosionColor(), // Uses specific explosion color
                alpha: Math.random() * 0.8 + 0.2,
                life: 1.0
            });
        }
        
        this.explosionTime = Date.now();
        this.canvas.style.opacity = '1';
        this.start(); // Start animation loop if not already started
    }
    
    getExplosionColor() { // Specific to ImpactVisualizer
        switch(this.options.mode) {
            case 'saga':
                return `hsl(${280 + Math.random() * 60}, 100%, ${70 + Math.random() * 30}%)`;
            case 'epic':
                return `hsl(${20 + Math.random() * 40}, 100%, ${70 + Math.random() * 30}%)`;
            default:
                return `hsl(${180 + Math.random() * 40}, 100%, ${70 + Math.random() * 30}%)`;
        }
    }
    
    updateParticles() {
        if (this.particles.length === 0 && Date.now() - this.explosionTime > this.explosionDuration) {
            this.canvas.style.opacity = '0';
            // No need to call stop() here, animate loop will stop if isActive is false
            // or if no particles and explosion is over. Let's refine:
            if (this.isActive && this.particles.length === 0) {
                 // If animation is active but no particles left from explosion, ensure fade out and potential stop
                if ( parseFloat(this.canvas.style.opacity) === 0) {
                   // this.stop(); // Can stop if desired, or let it run idly
                }
            }
        }

        const elapsed = Date.now() - this.explosionTime;
        
        if (elapsed > this.explosionDuration && this.particles.length === 0) {
            this.canvas.style.opacity = '0';
            // this.stop(); // Consider stopping if no more activity expected
            return; // No particles to update
        }
        
        // Fade out canvas towards end of explosion if particles are clearing
        if (elapsed > this.explosionDuration * 0.75) {
            this.canvas.style.opacity = Math.max(0, 1 - (elapsed - this.explosionDuration * 0.75) / (this.explosionDuration * 0.25)).toString();
        }


        const audioIntensity = this.getAudioIntensity();
        const remainingParticles = [];
        
        this.particles.forEach(p => {
            p.life -= 0.01 * (1 / (this.explosionDuration / 1000) * 60 * 0.016); // Normalize life decay somewhat
            if (p.life <= 0) return;
            
            p.x += p.speedX;
            p.y += p.speedY;
            
            p.speedX *= 0.98;
            p.speedY *= 0.98;
            
            p.displayAlpha = p.alpha * p.life * (1 + audioIntensity);
            if (p.displayAlpha > 1) p.displayAlpha = 1;
            
            p.displaySize = p.size * (1 + audioIntensity * 2) * p.life;
            
            remainingParticles.push(p);
        });
        
        this.particles = remainingParticles;
        
        // If all particles are gone and explosion duration passed, ensure canvas is faded out
        if (this.particles.length === 0 && elapsed >= this.explosionDuration) {
            this.canvas.style.opacity = '0';
        }
    }
}

class StreamVisualizer extends AudioVisualizer {
    constructor(container, options = {}) {
        super(container, Object.assign({
            particleCount: 150,
            particleSize: 2,
            particleSpeed: 1.5,
            // mode: 'standard' // Inherits default or can be overridden
        }, options));
        
        this.canvas.className = 'visualizer visualizer-stream';
        this.flowDirection = { x: 1, y: 0 }; // Default flow direction

        this.init(); // Call init after subclass properties are set
    }
    
    setFlowDirection(x, y) {
        const magnitude = Math.sqrt(x * x + y * y);
        if (magnitude > 0) {
            this.flowDirection = {
                x: x / magnitude,
                y: y / magnitude
            };
        }
    }
    
    createParticle() {
        // Ensure flowDirection is initialized (it will be by the time init() calls this)
        let x, y;
        const dirX = this.flowDirection.x;
        const dirY = this.flowDirection.y;
        
        if (Math.abs(dirX) > Math.abs(dirY)) {
            x = dirX > 0 ? Math.random() * -0.1 * this.width : this.width + (Math.random() * 0.1 * this.width);
            y = Math.random() * this.height;
        } else {
            x = Math.random() * this.width;
            y = dirY > 0 ? Math.random() * -0.1 * this.height : this.height + (Math.random() * 0.1 * this.height);
        }
        
        // Use base AudioVisualizer.getParticleColor which handles mode
        const color = this.getParticleColor(); 

        return {
            x,
            y,
            size: Math.random() * this.options.particleSize + 1,
            speedX: dirX * (Math.random() * 0.5 + 0.5) * this.options.particleSpeed * 50, // Adjusted for typical frame rates
            speedY: dirY * (Math.random() * 0.5 + 0.5) * this.options.particleSpeed * 50, // Adjusted for typical frame rates
            color: color,
            alpha: Math.random() * 0.6 + 0.2, // Slightly less opaque for streams
            tail: []
        };
    }
    
    startStream(duration = 5000) {
        this.canvas.style.opacity = '0.7'; // Stream typical opacity
        if (!this.isActive) {
            this.start();
        }
        
        // If there's a timer to stop the stream, clear previous one
        if (this.streamStopTimer) {
            clearTimeout(this.streamStopTimer);
        }

        this.streamStopTimer = setTimeout(() => {
            this.canvas.style.opacity = '0';
            // Optionally stop the animation loop if nothing else uses this visualizer instance
            // setTimeout(() => this.stop(), 1000); // Allow fade out
        }, duration);
    }
    
    updateParticles() {
        const audioIntensity = this.getAudioIntensity();
        const newParticles = [];
        
        // Add new particles if count is low
        if (this.particles.length < this.options.particleCount * 0.8) {
             for(let i=0; i < this.options.particleCount * 0.2; i++){
                 if(this.particles.length < this.options.particleCount) {
                    this.particles.push(this.createParticle());
                 }
             }
        }
        
        this.particles.forEach(p => {
            if (this.options.mode !== 'standard') {
                p.tail.unshift({ x: p.x, y: p.y });
                if (p.tail.length > (this.options.mode === 'epic' ? 10 : 5)) { // Longer tails for epic
                    p.tail.pop();
                }
            }
            
            const speedFactor = (1 + audioIntensity * (this.options.mode === 'epic' ? 4 : 2));
            
            // Update position based on speed, assuming speeds are per-second
            // For simplicity, let's assume speeds are per-frame for now or use a delta time.
            // The values in createParticle for speedX/Y looked large, so they might be per-frame.
            // If they are per-second, you'd divide by FPS or multiply by deltaTime.
            // Let's assume they are tuned for per-frame updates.
            p.x += p.speedX * speedFactor * 0.016; // Approximation for 60fps deltaTime
            p.y += p.speedY * speedFactor * 0.016; // Approximation for 60fps deltaTime
            
            // Check if particle is way off screen to remove it
            const margin = this.width * 0.2; // Generous margin
            if (p.x >= -margin && p.x <= this.width + margin && p.y >= -margin && p.y <= this.height + margin) {
                newParticles.push(p);
            }
        });
        
        this.particles = newParticles;
    }
    
    drawParticles() { // Override to use tails logic
        this.particles.forEach(p => {
            const alpha = p.alpha * (1 + this.getAudioIntensity() * 0.5); // Modulate alpha by intensity
            let particleColor = p.color;

            // Apply alpha to particleColor string
            if (particleColor.startsWith('hsl(')) {
                particleColor = particleColor.replace('hsl(', 'hsla(').replace(')', `, ${Math.min(1, alpha)})`);
            } else if (particleColor.startsWith('#')) {
                const r = parseInt(particleColor.slice(1, 3), 16);
                const g = parseInt(particleColor.slice(3, 5), 16);
                const b = parseInt(particleColor.slice(5, 7), 16);
                particleColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha)})`;
            }


            if ((this.options.mode === 'saga' || this.options.mode === 'epic') && p.tail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.tail[0].x, p.tail[0].y);
                
                for (let i = 1; i < p.tail.length; i++) {
                    this.ctx.lineTo(p.tail[i].x, p.tail[i].y);
                }
                
                const tailColorEnd = particleColor.replace(/rgba?\(.*?,(.*?,.*?),\s*\d*\.?\d*\)/, `rgba($1, 0)`)
                                      .replace(/hsla?\(.*?,(.*?,.*?),\s*\d*\.?\d*\)/, `hsla($1, 0)`);

                const gradient = this.ctx.createLinearGradient(
                    p.tail[0].x, p.tail[0].y, 
                    p.tail[p.tail.length - 1].x, 
                    p.tail[p.tail.length - 1].y
                );
                
                gradient.addColorStop(0, particleColor); // Head of tail is particle color
                gradient.addColorStop(1, tailColorEnd); // End of tail is transparent
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = (p.size * 0.8) * (1 + this.getAudioIntensity() * 0.5);
                this.ctx.stroke();
            }
            
            // Draw particle head
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * (1 + this.getAudioIntensity()), 0, Math.PI * 2);
            this.ctx.fillStyle = particleColor;
            this.ctx.fill();
        });
    }
}

// Export visualizer classes
window.AudioVisualizer = AudioVisualizer;
window.ImpactVisualizer = ImpactVisualizer;
window.StreamVisualizer = StreamVisualizer;