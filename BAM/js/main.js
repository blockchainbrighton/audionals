document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav');
    const audioPlayers = document.querySelectorAll('.sample-player audio');
    const categoryButtons = document.querySelectorAll('.category-filter button');
    const sampleCards = document.querySelectorAll('.sample-card');
    const waveformPlayers = document.querySelectorAll('.waveform-player');
    const heroText = document.querySelector('.hero-text h1');
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const samplePlayers = document.querySelectorAll('.sample-player');
    const filterButtons = document.querySelectorAll('.category-filter .btn');
    const animatedElements = document.querySelectorAll('.slide-up, .fade-in');

    // Mobile Navigation Toggle
    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = navToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
        nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('active')));
    }

    // Audio Player: Pause others when one plays
    audioPlayers.forEach(player => player.addEventListener('play', () => {
        audioPlayers.forEach(otherPlayer => otherPlayer !== player && !otherPlayer.paused && otherPlayer.pause());
    }));

    // Retro Terminal Effect for Hero Section
    if (heroText) {
        const originalText = heroText.textContent;
        heroText.textContent = '';
        let i = 0;
        setTimeout(function typeWriter() {
            if (i < originalText.length) {
                heroText.textContent += originalText.charAt(i++);
                setTimeout(typeWriter, 100);
            }
        }, 500);
    }

    // Category Filter
    if (categoryButtons.length) {
        categoryButtons.forEach(button => button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.getAttribute('data-category');
            sampleCards.forEach(card => card.style.display = category === 'all' || card.getAttribute('data-category') === category ? 'block' : 'none');
        }));
    }

    // Waveform Visualization
    const setupWaveform = (audioElement, canvasElement) => {
        if (!audioElement || !canvasElement) return;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        audioContext.createMediaElementSource(audioElement).connect(analyser).connect(audioContext.destination);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const canvasCtx = canvasElement.getContext('2d');
        const draw = () => {
            analyser.getByteFrequencyData(dataArray);
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            dataArray.forEach((value, i) => canvasCtx.fillRect(i * 2.5, canvasElement.height - value / 2, 2.5, value / 2));
            requestAnimationFrame(draw);
        };
        draw();
    };
    waveformPlayers.forEach(player => {
        const audio = player.querySelector('audio');
        const canvas = player.querySelector('canvas');
        if (audio && canvas) {
            audio.addEventListener('play', () => setupWaveform(audio, canvas), { once: true });
        }
    });

    // Smooth scrolling for anchor links
    anchorLinks.forEach(link => link.addEventListener('click', e => {
        e.preventDefault();
        const targetElement = document.querySelector(link.getAttribute('href'));
        if (targetElement) {
            window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
            nav.classList.contains('active') && nav.classList.remove('active');
        }
    }));

    // Placeholder Audio Players
    samplePlayers.forEach(player => {
        const audioSource = player.querySelector('audio source');
        const isPlaceholder = !audioSource || !audioSource.src || audioSource.src.trim() === '#';
        if (isPlaceholder) {
            player.classList.add('placeholder');
            player.setAttribute('data-tooltip', 'Coming Soon');
        }
    });

    // Category Filter Logic
    filterButtons.forEach(button => button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.getAttribute('data-category');
        sampleCards.forEach(card => card.style.display = category === 'all' || card.getAttribute('data-category') === category ? 'block' : 'none');
    }));

    // Intersection Observer for Animations
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused');
    }, { threshold: 0.1 });

    animatedElements.forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
});
