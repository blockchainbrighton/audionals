


const gui = new BopVstGui(document.getElementById('pluginWindow'), {
  onParamChange: (id, value) => host.setParameter(id, value),
  state: host.saveState()   // initial patch
});

// Bidirectional sync
host.on('parameter-changed', (id, value) => gui.setKnob(id, value));
host.on('state-loaded',      (state)     => gui.loadState(state));
