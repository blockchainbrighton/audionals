// buttons.js
const BUTTONS = [
    { id: 'btn-stars',    label: 'Stars',         onClick: () => window.toggle('stars') },
    { id: 'btn-moon',     label: 'Moon',          onClick: () => window.toggle('moon') },
    { id: 'btn-solar',    label: 'Solar System',  onClick: () => window.toggle('solar') },
    { id: 'btn-clouds',   label: 'Clouds',        onClick: () => window.toggle('clouds') },
    { id: 'btn-shooting', label: 'Shooting Stars',onClick: () => window.toggle('shooting') },
    { id: 'btn-land',     label: 'Landscape',     onClick: () => window.toggle('land') },
    { id: 'btn-aurora',   label: 'Aurora',        onClick: () => window.toggle('aurora') },
    { id: 'btn-lightning',label: 'Lightning',     onClick: () => window.toggle('lightning') },
    { id: 'btn-meteor',   label: 'Meteors',       onClick: () => window.toggle('meteor') },
    { id: 'btn-sunrise',  label: 'Sunrise',       onClick: () => window.startSunrise() },
    { id: 'btn-sunset',   label: 'Sunset',        onClick: () => window.startSunset() },
    { id: 'btn-rocket',   label: 'Launch Rocket', onClick: () => window.launchRocket() },
    { id: 'btn-comet',    label: 'Launch Comet',  onClick: () => window.launchComet() },
    { id: 'btn-reset',    label: 'Reset',         onClick: () => window.resetAll() },
    { id: 'settingsBtn',  label: 'Show Settings', onClick: () => window.toggleSettingsPanel(window.config) }
  ];
  
  function createButtons() {
    const controls = document.getElementById('controls');
    BUTTONS.forEach(({ id, label, onClick }) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = label;
      btn.onclick = onClick;
      controls.appendChild(btn);
    });
  }
  createButtons();
  