/**
 * config.js
 * Stores configuration data like colors and sample definitions.
 */

export const neonRowColors = [
    'hsl(180, 100%, 50%)', 'hsl(300, 100%, 50%)', 'hsl(120, 100%, 50%)',
    'hsl(60, 100%, 50%)', 'hsl(0, 100%, 50%)', 'hsl(30, 100%, 50%)',
    'hsl(240, 100%, 60%)', 'hsl(330, 100%, 55%)', 'hsl(90, 100%, 50%)',
    'hsl(210, 100%, 55%)', 'hsl(30, 95%, 60%)', 'hsl(150, 100%, 50%)',
    'hsl(270, 100%, 60%)', 'hsl(45, 100%, 50%)', 'hsl(3, 100%, 60%)',
    'hsl(195, 100%, 50%)', 'hsl(315, 100%, 50%)', 'hsl(75, 100%, 50%)',
    'hsl(285, 90%, 60%)', 'hsl(15, 100%, 55%)', 'hsl(255, 100%, 65%)',
    'hsl(135, 90%, 55%)', 'hsl(345, 100%, 58%)', 'hsl(170, 95%, 50%)',
    'hsl(50, 100%, 55%)'
];

export let sampleData = [
    // --- Original Samples ---
    { src: 'audio/KP_boomkit_100bpm_A1.webm', title: 'KP Boomkit A1', details: '100 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_boomkit_100bpm_A2.webm', title: 'KP Boomkit A2', details: '100 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_boomkit_100bpm_A3.webm', title: 'KP Boomkit A3', details: '100 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_boomkit_98bpm_A1.webm',  title: 'KP Boomkit A1', details: '98 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_boomkit_98bpm_A2.webm',  title: 'KP Boomkit A2', details: '98 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_boomkit_98bpm_A3.webm',  title: 'KP Boomkit A3', details: '98 BPM | Boom Bap', category: 'boom-bap' },
    { src: 'audio/KP_caziokit_129bpm_A.webm', title: 'KP CazioKit A', details: '129 BPM | Breakbeat', category: 'breakbeat' },
    { src: 'audio/KP_caziokit_129bpm_B.webm', title: 'KP CazioKit B', details: '129 BPM | Breakbeat', category: 'breakbeat' },
    { src: 'audio/KP_caziokit_129bpm_C.webm', title: 'KP CazioKit C', details: '129 BPM | Breakbeat', category: 'breakbeat' },
    { src: 'audio/KP_caziokit_129bpm_D.webm', title: 'KP CazioKit D', details: '129 BPM | Breakbeat', category: 'breakbeat' },
    { src: 'audio/KP_caziokit_129bpm_E_8bar.webm', title: 'KP CazioKit E (8 bar)', details: '129 BPM | Breakbeat', category: 'breakbeat' },
    { src: 'audio/KP_ABkit_113bpm_A1.webm', title: 'KP ABkit A1', details: '113 BPM | ABkit', category: 'abkit' },
    { src: 'audio/KP_ABkit_113bpm_A2.webm', title: 'KP ABkit A2', details: '113 BPM | ABkit', category: 'abkit' },
    { src: 'audio/KP_ABkit_113bpm_A3.webm', title: 'KP ABkit A3', details: '113 BPM | ABkit', category: 'abkit' },

    // --- New Samples ---
    { src: 'audio/KP_FunKit_101bpm_A1.webm', title: 'KP FunKit A1', details: '101 BPM | FunKit', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_A2.webm', title: 'KP FunKit A2', details: '101 BPM | FunKit', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_B1.webm', title: 'KP FunKit B1', details: '101 BPM | FunKit', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_B2.webm', title: 'KP FunKit B2', details: '101 BPM | FunKit', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_Bass1.webm', title: 'KP FunKit Bass1', details: '101 BPM | Bass', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_Bass2.webm', title: 'KP FunKit Bass2', details: '101 BPM | Bass', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_Bass3.webm', title: 'KP FunKit Bass3', details: '101 BPM | Bass', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_Bass4.webm', title: 'KP FunKit Bass4', details: '101 BPM | Bass', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_arp1.webm', title: 'KP FunKit Arp1', details: '101 BPM | Arp', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_arp2.webm', title: 'KP FunKit Arp2', details: '101 BPM | Arp', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_pulse1.webm', title: 'KP FunKit Pulse1', details: '101 BPM | Pulse', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_pulse2.webm', title: 'KP FunKit Pulse2', details: '101 BPM | Pulse', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_synth1.webm', title: 'KP FunKit Synth1', details: '101 BPM | Synth', category: 'funkit' },
    { src: 'audio/KP_FunKit_101bpm_synth2.webm', title: 'KP FunKit Synth2', details: '101 BPM | Synth', category: 'funkit' },

    { src: 'audio/KP_SwingKit_68bpm_A1.webm', title: 'KP SwingKit A1', details: '68 BPM | Swing', category: 'swing' },
    { src: 'audio/KP_SwingKit_68bpm_A2.webm', title: 'KP SwingKit A2', details: '68 BPM | Swing', category: 'swing' },
    { src: 'audio/KP_SwingKit_68bpm_PianoPerc.webm', title: 'KP SwingKit PianoPerc', details: '68 BPM | Percussion', category: 'swing' },
    { src: 'audio/KP_SwingKit_68bpm_SleepSYNTH.webm', title: 'KP SwingKit SleepSYNTH', details: '68 BPM | Synth', category: 'swing' },
    { src: 'audio/KP_SwingKit_68bpm_WitnessBASS.webm', title: 'KP SwingKit WitnessBASS', details: '68 BPM | Bass', category: 'swing' },
];