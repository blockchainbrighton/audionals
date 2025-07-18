// Preset definitions -------------------------------------------------
const presets = {
    audio: [
      {
        name: '#660 Welcome to ZomboCom',
        url: 'https://ordinals.com/content/4ad0e47df8824477df72e454c162048d79e9c2234bf4e95bfa65d6ff36cbff6fi0',
        duration: 10
      }
    ],
    visual: [
      { name: 'PUNX Logo', url: 'https://ordinals.com/content/c2beb99dbc32188e56ea2ca3750c99a6ce9145892678473b51802ce680cb5f16i0', duration: 3 },
      { name: 'PUNX no.1', url: 'https://ordinals.com/content/4e38c53382a55659ef518fe9385f807fc5b827fe99f0854ff0d2a22a0a78b175i0', duration: 3 },
      { name: 'I', url: 'https://ordinals.com/content/bfd05a40892d872c033994d2375c6382eb90789db6739a7b18f7246a396f5a3di0', duration: 3 },
      { name: 'II', url: 'https://ordinals.com/content/5a2b8214a9411c62bed0acb1f1f0b296bf049da181178120311520f25254c365i0', duration: 3 },
      { name: 'III', url: 'https://ordinals.com/content/fe22987aae2d261c1848c0e69f571ad605aa5f1f7e03ab8ae460436919da837ai0', duration: 3 },
      { name: 'IV', url: 'https://ordinals.com/content/a3e850c3070f255d08b86b334000e35bb2af101c61e0a871d1e6a1b9c41a5322i0', duration: 3 },
      { name: 'V', url: 'https://ordinals.com/content/06f24846f17ed13bc54db280209ad6e8cd3b9db46839cd5109920d24090ad7aai0', duration: 3 },
      { name: 'VI', url: 'https://ordinals.com/content/24b8261d1560ecbfdc8fa43c60b8fe9f79150f19e021b476fc605c3962ae78a2i0', duration: 3 },
      { name: 'VII', url: 'https://ordinals.com/content/5c67ed83db55258aad2d4aa18e80693b4002d5ac0e555928666deeb12692fa80i0', duration: 3 },
      { name: 'VIII', url: 'https://ordinals.com/content/7027ca7504d5767930a7e90cdfd8b0553c2a5133fe5fcdf5887dc0311e9486bci0', duration: 3 },
      { name: 'IX', url: 'https://ordinals.com/content/57b066a9d5769be2a64fd74e1941e35c034b5265d42e3a868615980aa576a371i0', duration: 3 },
      { name: 'X', url: 'https://ordinals.com/content/35349fc8e0badad460b6d7125fe2f833dcbec129a8064c9d7cd5e64172274325i0', duration: 3 },
      { name: 'GIF', url: 'https://ordinals.com/content/c9d39d2aef6f2f3d744b2e8e5aab9fb11ba65274e8d19aef777c21f264426b71i0', duration: 5 }
    ]
  };
  
  // Render preset buttons ---------------------------------------------
  function initPresetGallery() {
    const list = document.getElementById('preset-list');
    ['visual', 'audio'].forEach(type => {
      presets[type].forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p.name;
        btn.onclick = () => {
          document.getElementById('channel-select').value = type;
          document.getElementById('media-url').value = p.url;
          document.getElementById('media-duration').value = p.duration;
        };
        list.appendChild(btn);
      });
    });
  }