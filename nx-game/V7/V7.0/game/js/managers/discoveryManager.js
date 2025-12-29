export const discoveryManager = {
    game: null,
    state: null,
    introComplete: false,

    poiSequence: ['exchange_node', 'bar', 'armoury', 'casino', 'xemist_contact'],

    poiData: {
            'xlounge_stash': {
                label: 'Localhost Cache',
                discovery: 'Localhost confirmed. Cache interface online.'
            },        'exchange_node': {
            label: 'Exchange Node',
            discovery: 'Exchange Node recovered. Trade bandwidth restored.',
            clue: 'Trace the cyan beacons along the eastern service lanes to locate the Exchange Node.'
        },
        'bar': {
            label: 'Stream Buffer',
            discovery: 'Stream Buffer reopened. Locals whisper intel again.',
            clue: 'Neon residue indicates a lounge west of the Null Partition. Follow the orange haze.'
        },
        'armoury': {
            label: 'Bit Depot',
            discovery: 'Bit Depot link re-established. Emitter manifests unlocked.',
            clue: 'Thermal spikes point north toward a fortified stall lined in red pulses.'
        },
        'casino': {
            label: 'RNG Node',
            discovery: 'RNG Node spinning again. Probability engines synced.',
            clue: 'Listen for synth beats south of the partition. Lime streaks mark the node canopy.'
        },
        'xemist_contact': {
            label: 'Compiler',
            discovery: 'Compiler located. Protocol packets ready.',
            clue: 'Final signal originates near coolant plumes in the far quadrant. Yellow strobes point the way.'
        }
    },

    init(gameInstance) {
        this.game = gameInstance;
        this.state = {
            discovered: {
                'xlounge_stash': true
            },
            clueIndex: 0,
            activeClue: null
        };
        this.introComplete = false;
    },

    startIntro() {
        if (this.introComplete || !this.game) return;
        const introBeats = [
            '[SYSTEM WAKE] Null Partition localhost active. External schematics scrubbed.',
            '[DIRECTIVE] Rebuild the system topology by rediscovering its anchor nodes.',
            '[HINT] Open the map, trace residual beacons, and log each node as you encounter it.'
        ];
        introBeats.forEach(line => this.game.utils.addMessage(line));
        this.broadcastClue(this.poiSequence[0]);
        this.introComplete = true;
    },

    markDiscovered(type) {
        if (!type || !this.game) return;
        if (this.state.discovered[type]) return;
        this.state.discovered[type] = true;

        const info = this.poiData[type];
        if (info && info.discovery) {
            this.game.utils.addMessage(`[DISCOVERY] ${info.discovery}`);
        } else {
            this.game.utils.addMessage(`[DISCOVERY] ${type} logged.`);
        }

        this.advanceClue(type);
    },

    advanceClue(completedType) {
        const idx = this.poiSequence.indexOf(completedType);
        if (idx >= 0 && idx >= this.state.clueIndex) {
            this.state.clueIndex = idx + 1;
        }

        const nextType = this.poiSequence[this.state.clueIndex];
        if (nextType) {
            this.broadcastClue(nextType);
        } else {
            this.game.utils.addMessage('[DIRECTIVE COMPLETE] All anchor nodes mapped. Follow active quests for next steps.');
        }
    },

    broadcastClue(type) {
        const info = this.poiData[type];
        if (!info) return;
        const clueText = info.clue || `Locate ${info.label}.`;
        this.state.activeClue = type;
        this.game.utils.addMessage(`[CLUE] ${clueText}`);
    },

    shouldShowPoi(type) {
        return !!this.state?.discovered?.[type];
    }
};
