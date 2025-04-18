// BAM Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }
    
    // Audio Player Functionality
    const audioPlayers = document.querySelectorAll('.sample-player audio');
    
    audioPlayers.forEach(player => {
        // Add custom event listeners and functionality if needed
        player.addEventListener('play', function() {
            // Pause all other audio players when one starts playing
            audioPlayers.forEach(otherPlayer => {
                if (otherPlayer !== player && !otherPlayer.paused) {
                    otherPlayer.pause();
                }
            });
        });
    });
    
    // Animate elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.fade-in, .slide-up');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 50) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Initialize animations
    animateOnScroll();
    
    // Listen for scroll events
    window.addEventListener('scroll', animateOnScroll);
    
    // Retro Terminal Effect for Hero Section
    const heroText = document.querySelector('.hero-text h1');
    
    if (heroText) {
        const originalText = heroText.textContent;
        heroText.textContent = '';
        
        let i = 0;
        const typeWriter = function() {
            if (i < originalText.length) {
                heroText.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        // Start the typewriter effect
        setTimeout(typeWriter, 500);
    }
    
    // Sample Category Filter
    const categoryButtons = document.querySelectorAll('.category-filter button');
    const sampleCards = document.querySelectorAll('.sample-card');
    
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                const category = this.getAttribute('data-category');
                
                // Show/hide sample cards based on category
                sampleCards.forEach(card => {
                    if (category === 'all' || card.getAttribute('data-category') === category) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
    
    // Waveform Visualization for Audio Players
    const setupWaveform = function(audioElement, canvasElement) {
        if (!audioElement || !canvasElement) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioElement);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvas = canvasElement;
        const canvasCtx = canvas.getContext('2d');
        
        const draw = function() {
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = 'rgb(0, 0, 0)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                canvasCtx.fillStyle = `rgb(0, ${Math.min(255, barHeight + 100)}, ${Math.min(255, barHeight + 100)})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    };
    
    // Setup waveform visualizations for each audio player with a canvas
    const waveformPlayers = document.querySelectorAll('.waveform-player');
    
    waveformPlayers.forEach(player => {
        const audio = player.querySelector('audio');
        const canvas = player.querySelector('canvas');
        
        if (audio && canvas) {
            audio.addEventListener('play', function() {
                setupWaveform(audio, canvas);
            }, { once: true });
        }
    });
    
    // Retro Computer Animation
    const computerScreen = document.querySelector('.computer-screen');
    
    if (computerScreen) {
        // Simulate screen flicker effect
        setInterval(() => {
            computerScreen.classList.add('flicker');
            
            setTimeout(() => {
                computerScreen.classList.remove('flicker');
            }, 100);
        }, 5000);
    }
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile navigation if open
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                }
            }
        });
    });
});
