// Main JavaScript for OB1 Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize custom cursor
    initCursor();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize waveform visualization
    initWaveform();
    
    // Initialize beat lab
    initBeatLab();
    
    // Initialize collection grid
    initCollectionGrid();
    
    // Add scroll animations
    initScrollAnimations();
});

// Custom cursor
function initCursor() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    document.addEventListener('mousemove', function(e) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        setTimeout(function() {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        }, 100);
    });
    
    document.addEventListener('mousedown', function() {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
    });
    
    document.addEventListener('mouseup', function() {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Add hover effect for links and buttons
    const hoverElements = document.querySelectorAll('a, button, .collection-item, .nft-card, .node, .beat-cell');
    
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(2)';
            cursorFollower.style.borderColor = 'var(--secondary-color)';
        });
        
        element.addEventListener('mouseleave', function() {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.borderColor = 'var(--primary-color)';
        });
    });
}

// Navigation
function initNavigation() {
    const header = document.querySelector('header');
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Sticky header on scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        nav.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
        });
    });
    
    // Active link on scroll
    window.addEventListener('scroll', function() {
        let current = '';
        
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// Waveform visualization
function initWaveform() {
    const canvas = document.getElementById('waveform');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    // Waveform parameters
    const waveCount = 3;
    const waves = [];
    
    // Initialize waves
    for (let i = 0; i < waveCount; i++) {
        waves.push({
            frequency: 0.02 + (i * 0.005),
            amplitude: 50 - (i * 10),
            speed: 0.05 + (i * 0.02),
            offset: 0,
            color: i === 0 ? '#6c5ce7' : i === 1 ? '#00cec9' : '#fd79a8'
        });
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        waves.forEach(wave => {
            drawWave(wave);
            wave.offset += wave.speed;
        });
        
        requestAnimationFrame(animate);
    }
    
    // Draw a single wave
    function drawWave(wave) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        for (let x = 0; x < canvas.width; x++) {
            const y = Math.sin(x * wave.frequency + wave.offset) * wave.amplitude + (canvas.height / 2);
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Start animation
    animate();
    
    // Resize handler
    window.addEventListener('resize', function() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    });
}

// Beat Lab
function initBeatLab() {
    const beatGrid = document.querySelector('.beat-grid');
    if (!beatGrid) return;
    
    const playButton = document.getElementById('play-button');
    const stopButton = document.getElementById('stop-button');
    const tempoSlider = document.getElementById('tempo');
    const tempoValue = document.getElementById('tempo-value');
    
    // Beat lab parameters
    const rows = 4;
    const cols = 8;
    let tempo = 120;
    let isPlaying = false;
    let currentStep = 0;
    let intervalId = null;
    
    // Sample sounds (would be replaced with actual OB1 sounds)
    const sounds = [
        { name: 'Kick', url: 'audio/kick.mp3' },
        { name: 'Snare', url: 'audio/snare.mp3' },
        { name: 'Hi-hat', url: 'audio/hihat.mp3' },
        { name: 'Clap', url: 'audio/clap.mp3' }
    ];
    
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const audioBuffers = [];
    
    // Load audio samples
    async function loadSamples() {
        for (const sound of sounds) {
            try {
                // Create placeholder audio buffers for now
                const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 0.5, audioContext.sampleRate);
                audioBuffers.push(buffer);
                
                // In a real implementation, we would load actual audio files:
                // const response = await fetch(sound.url);
                // const arrayBuffer = await response.arrayBuffer();
                // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                // audioBuffers.push(audioBuffer);
            } catch (error) {
                console.error('Error loading audio sample:', error);
            }
        }
    }
    
    // Create beat grid
    function createBeatGrid() {
        beatGrid.innerHTML = '';
        
        // Create row labels
        const labelCol = document.createElement('div');
        labelCol.className = 'beat-labels';
        labelCol.style.display = 'grid';
        labelCol.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        labelCol.style.marginRight = '10px';
        
        for (let i = 0; i < rows; i++) {
            const label = document.createElement('div');
            label.className = 'beat-label';
            label.textContent = sounds[i]?.name || `Sound ${i+1}`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.color = 'white';
            label.style.fontSize = '0.8rem';
            labelCol.appendChild(label);
        }
        
        beatGrid.appendChild(labelCol);
        
        // Create grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        gridContainer.style.gap = '5px';
        gridContainer.style.flex = '1';
        
        // Create cells
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'beat-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('click', function() {
                    this.classList.toggle('active');
                });
                
                gridContainer.appendChild(cell);
            }
        }
        
        beatGrid.appendChild(gridContainer);
    }
    
    // Play a sound
    function playSound(row) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (row < audioBuffers.length) {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[row];
            source.connect(audioContext.destination);
            source.start();
        }
    }
    
    // Play sequence
    function playSequence() {
        const cells = document.querySelectorAll('.beat-cell');
        
        // Reset all cells
        cells.forEach(cell => {
            cell.classList.remove('playing');
        });
        
        // Highlight current step
        for (let row = 0; row < rows; row++) {
            const cell = document.querySelector(`.beat-cell[data-row="${row}"][data-col="${currentStep}"]`);
            if (cell) {
                cell.classList.add('playing');
                
                // Play sound if cell is active
                if (cell.classList.contains('active')) {
                    playSound(row);
                }
            }
        }
        
        // Move to next step
        currentStep = (currentStep + 1) % cols;
    }
    
    // Start playback
    function startPlayback() {
        if (isPlaying) return;
        
        isPlaying = true;
        currentStep = 0;
        
        // Calculate interval based on tempo (BPM)
        const interval = (60 / tempo) * 1000 / 2; // 16th notes
        
        intervalId = setInterval(playSequence, interval);
        
        // Update button states
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
    }
    
    // Stop playback
    function stopPlayback() {
        if (!isPlaying) return;
        
        isPlaying = false;
        clearInterval(intervalId);
        
        // Reset all cells
        const cells = document.querySelectorAll('.beat-cell');
        cells.forEach(cell => {
            cell.classList.remove('playing');
        });
        
        // Update button states
        playButton.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    // Update tempo
    function updateTempo() {
        tempo = parseInt(tempoSlider.value);
        tempoValue.textContent = tempo;
        
        // Update playback if currently playing
        if (isPlaying) {
            stopPlayback();
            startPlayback();
        }
    }
    
    // Initialize
    loadSamples().then(() => {
        createBeatGrid();
        
        // Event listeners
        playButton.addEventListener('click', function() {
            if (isPlaying) {
                stopPlayback();
            } else {
                startPlayback();
            }
        });
        
        stopButton.addEventListener('click', stopPlayback);
        
        tempoSlider.addEventListener('input', updateTempo);
    });
}

// Collection Grid
function initCollectionGrid() {
    const collectionGrid = document.querySelector('.collection-grid');
    if (!collectionGrid) return;
    
    // Sample collection data (would be replaced with actual OB1 collection data)
    const collectionItems = [
        { id: 1, name: 'OB1 #01', sound: 'Bass Drum', image: 'https://via.placeholder.com/200x200?text=OB1+%231' },
        { id: 2, name: 'OB1 #02', sound: 'Snare', image: 'https://via.placeholder.com/200x200?text=OB1+%232' },
        { id: 3, name: 'OB1 #03', sound: 'Hi-hat', image: 'https://via.placeholder.com/200x200?text=OB1+%233' },
        { id: 4, name: 'OB1 #04', sound: 'Clap', image: 'https://via.placeholder.com/200x200?text=OB1+%234' },
        { id: 5, name: 'OB1 #05', sound: 'Synth', image: 'https://via.placeholder.com/200x200?text=OB1+%235' },
        { id: 6, name: 'OB1 #06', sound: 'Bass', image: 'https://via.placeholder.com/200x200?text=OB1+%236' },
        { id: 7, name: 'OB1 #07', sound: 'Vocal', image: 'https://via.placeholder.com/200x200?text=OB1+%237' },
        { id: 8, name: 'OB1 #08', sound: 'FX', image: 'https://via.placeholder.com/200x200?text=OB1+%238' }
    ];
    
    // Create collection items
    collectionItems.forEach(item => {
        const collectionItem = document.createElement('div');
        collectionItem.className = 'collection-item';
        
        collectionItem.innerHTML = `
            <div class="collection-image" style="background-image: url('${item.image}')"></div>
            <div class="collection-details">
                <h3>${item.name}</h3>
                <p>Sound: ${item.sound}</p>
            </div>
        `;
        
        collectionGrid.appendChild(collectionItem);
    });
}

// Scroll animations
function initScrollAnimations() {
    // Fade in elements on scroll
    const fadeElements = document.querySelectorAll('.section-header, .text-content, .visual-content, .team-member, .timeline-item, .collection-stat');
    
    const fadeOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const fadeObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, fadeOptions);
    
    fadeElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeObserver.observe(element);
    });
    
    // Stagger team members
    const teamMembers = document.querySelectorAll('.team-member');
    teamMembers.forEach((member, index) => {
        member.style.transitionDelay = `${index * 0.1}s`;
    });
    
    // Stagger collection stats
    const collectionStats = document.querySelectorAll('.collection-stat');
    collectionStats.forEach((stat, index) => {
        stat.style.transitionDelay = `${index * 0.1}s`;
    });
}
