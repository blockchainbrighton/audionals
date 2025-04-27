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


document.addEventListener('DOMContentLoaded', () => {

    // --- Navigation Toggle for Mobile ---
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav');

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            // Optional: Change burger icon to 'X' when active
            const icon = navToggle.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Optional: Close nav when a link is clicked (good for single-page sites)
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    navToggle.querySelector('i').classList.remove('fa-times');
                    navToggle.querySelector('i').classList.add('fa-bars');
                }
            });
        });
    }


    // --- Add Placeholder Class and Tooltip Data to Audio Players ---
    const samplePlayers = document.querySelectorAll('.sample-player');
    samplePlayers.forEach(player => {
        const audioSource = player.querySelector('audio source');

        // Check if the source element exists and if its src is missing, empty, or '#'
        let isPlaceholder = false;
        if (!audioSource) {
            // If there's no source tag at all
            isPlaceholder = true;
        } else {
            const src = audioSource.getAttribute('src');
            if (!src || src.trim() === '#' || src.trim() === '') {
                // If src is missing, '#', or just whitespace
                isPlaceholder = true;
            }
        }

        // If it's determined to be a placeholder, add class and attribute
        if (isPlaceholder) {
            player.classList.add('placeholder');
            player.setAttribute('data-tooltip', 'Coming Soon'); // Set attribute for CSS tooltip
        }
    });

    // --- Optional: Category Filter Logic (Example) ---
    const filterButtons = document.querySelectorAll('.category-filter .btn');
    const sampleCards = document.querySelectorAll('.samples-grid .sample-card');

    if (filterButtons.length > 0 && sampleCards.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active button style
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const category = button.getAttribute('data-category');

                // Filter cards
                sampleCards.forEach(card => {
                    if (category === 'all' || card.getAttribute('data-category') === category) {
                        card.style.display = 'block'; // Or 'grid', 'flex', etc. depending on parent
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // --- Intersection Observer for Animations (Example - Adapt as needed) ---
    const animatedElements = document.querySelectorAll('.slide-up, .fade-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                 // Optional: Unobserve after animation starts if you only want it once
                 // observer.unobserve(entry.target);
            } else {
                 // Optional: Reset animation if you want it to replay when scrolling back up
                 // entry.target.style.animationPlayState = 'paused';
                 // Or remove/re-add class if using simple class-based triggers
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% visible

    // Pause animations initially and observe elements
    animatedElements.forEach(el => {
        // Ensure animations don't play until visible
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });


}); // End DOMContentLoaded