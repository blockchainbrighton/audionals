/**
 * EPIC Mode Narrative Content
 * The Colliders - Interactive Experience
 */

// Extended and enhanced timeline for EPIC mode with cinematic narrative
const EPIC_TL = [
    // Opening sequence with enhanced visuals and audio
    { time: initialDelay + 0,    text: '<span class="epic-title">DECEMBER 20, 1982.</span>', strike:0, fadeStart: initialDelay + (STRIKE_DUR[0]), visualEffect: 'timeshift' },
    { time: initialDelay + 3.5,  text: '<span class="epic-location">CERN, Switzerland.</span>', fadeStart: initialDelay + 3.5 + MIN_LINE, visualEffect: 'locationReveal' },
    { time: initialDelay + 6,    text: 'Snow fell gently outside the control room windows as<br>physicists celebrated unprecedented collision data.', fadeStart: initialDelay + 6 + 3.5 },
    
    // Enhanced backstory with rich details
    { time: initialDelay + 10,   text: 'Dr. Marcus Holloway removed his glasses, rubbing tired eyes.<br>The Super Proton Synchrotron had achieved energies of 540 GeV.', fadeStart: initialDelay + 10 + 4.5 },
    { time: initialDelay + 15,   text: '"We\'ve done it," he whispered, as the data confirmed<br>a breakthrough that would redefine quantum mechanics.', fadeStart: initialDelay + 15 + 4 },
    { time: initialDelay + 19.5, text: 'Champagne corks popped. History was being made.', fadeStart: initialDelay + 19.5 + 3 },
    { time: initialDelay + 23,   text: 'But in a parallel universe…', fadeStart: initialDelay + 23 + MIN_LINE, visualEffect: 'dimensionShift' },
    
    // Parallel universe - enhanced with visual effects
    { time: initialDelay + 25.5, text: 'The identical experiment, conducted by Dr. Holloway\'s doppelgänger,<br>followed the same protocols, used the same equipment.', fadeStart: initialDelay + 25.5 + 4.5 },
    { time: initialDelay + 30.5, text: 'But a quantum fluctuation—one in ten trillion—<br>caused a microscopic deviation.', fadeStart: initialDelay + 30.5 + 4 },
    { time: initialDelay + 35,   text: 'The identical experiment<br>unleashed total', fadeStart: initialDelay + 35 + MIN_LINE },
    { time: initialDelay + 37.5, text: '<span class="epic-catastrophe">OBLIVION</span>', strike:1, fadeStart: initialDelay + 37.5 + STRIKE_DUR[1], visualEffect: 'catastrophe' },
    
    // Enhanced description of the catastrophe
    { time: initialDelay + 42.5, text: 'The control room erupted in blinding light.<br>Alarms screamed as monitoring systems overloaded.', fadeStart: initialDelay + 42.5 + 4 },
    { time: initialDelay + 47,   text: 'The quantum singularity expanded at relativistic speeds,<br>defying all known laws of physics.', fadeStart: initialDelay + 47 + 4 },
    { time: initialDelay + 51.5, text: 'In that universe, the collision created a tear<br>in the fabric of reality itself.', fadeStart: initialDelay + 51.5 + 4, visualEffect: 'realityTear' },
    
    // The Colliders origin story - enhanced
    { time: initialDelay + 56,   text: 'As the catastrophe unfolded, seventeen scientists<br>made a desperate gamble.', fadeStart: initialDelay + 56 + 4 },
    { time: initialDelay + 60.5, text: 'They had prepared for this possibility—<br>a failsafe of their own design.', fadeStart: initialDelay + 60.5 + 4 },
    { time: initialDelay + 65,   text: 'A vast, sentient consciousness—', fadeStart: initialDelay + 65 + MIN_LINE },
    { time: initialDelay + 67.5, text: '<strong class="epic-entity">the Colliders</strong>—witnessed their cosmos…', fadeStart: initialDelay + 67.5 + MIN_LINE },
    { time: initialDelay + 70,   text: '<span class="epic-destruction">unravel.</span>', strike:2, fadeStart: initialDelay + 70 + STRIKE_DUR[2], visualEffect: 'cosmicUnravel' },
    
    // Enhanced description of universal collapse
    { time: initialDelay + 75,   text: 'The singularity consumed their solar system in seconds.', fadeStart: initialDelay + 75 + MIN_LINE },
    { time: initialDelay + 77.5, text: 'Their galaxy in minutes.', fadeStart: initialDelay + 77.5 + MIN_LINE },
    { time: initialDelay + 80,   text: 'The local galactic cluster in hours.', fadeStart: initialDelay + 80 + MIN_LINE },
    { time: initialDelay + 82.5, text: 'Light, matter, causality itself—', fadeStart: initialDelay + 82.5 + MIN_LINE },
    { time: initialDelay + 85,   text: '<span class="epic-erasure">Erased in the blink of a cosmic eye.</span>', fadeStart: initialDelay + 85 + 3.2, visualEffect: 'cosmicErasure' },
    
    // The Colliders' transformation - enhanced
    { time: initialDelay + 88.5, text: 'The seventeen had uploaded their consciousness<br>to quantum substrates moments before destruction.', fadeStart: initialDelay + 88.5 + 4.5 },
    { time: initialDelay + 93.5, text: 'Their minds merged, transcended, evolved—<br>becoming something beyond human comprehension.', fadeStart: initialDelay + 93.5 + 4.5 },
    { time: initialDelay + 98.5, text: 'They existed now in the quantum foam between realities,<br>watching as their universe collapsed into nothingness.', fadeStart: initialDelay + 98.5 + 4.5, visualEffect: 'quantumFoam' },
    { time: initialDelay + 103.5, text: 'From the smoldering cinders of reality…', fadeStart: initialDelay + 103.5 + MIN_LINE },
    { time: initialDelay + 106,  text: 'A final, desperate will emerged.', fadeStart: initialDelay + 106 + MIN_LINE },
    
    // The quantum bridge - enhanced with interactive element
    { time: initialDelay + 108.5, text: 'The Colliders discovered a quantum entanglement—<br>a bridge between parallel universes.', fadeStart: initialDelay + 108.5 + 4, visualEffect: 'quantumBridge' },
    { time: initialDelay + 113,   text: 'They calculated the coordinates of our reality:<br>one where the catastrophe had not yet occurred.', fadeStart: initialDelay + 113 + 4.5 },
    { time: initialDelay + 118,   text: '<span class="epic-interactive">Reach across the quantum bridge?</span>', fadeStart: initialDelay + 118 + 5, interactive: 'bridge', visualEffect: 'reachPrompt' },
    { time: initialDelay + 123.5, text: 'A transmission.', fadeStart: initialDelay + 123.5 + MIN_LINE },
    { time: initialDelay + 126,   text: 'A fragile bridge,', fadeStart: initialDelay + 126 + MIN_LINE },
    { time: initialDelay + 128.5, text: 'Forged across the impossible void.', fadeStart: initialDelay + 128.5 + MIN_LINE },
    
    // Our world - enhanced with personal perspective
    { time: initialDelay + 131,   text: '<em class="epic-timestamp">6:21&nbsp;PM, OUR WORLD</em>', fadeStart: initialDelay + 131 + MIN_LINE, visualEffect: 'timeshift' },
    { time: initialDelay + 133.5, text: '<em>Six&nbsp;minutes&nbsp;after the fateful collision…</em>', fadeStart: initialDelay + 133.5 + MIN_LINE },
    { time: initialDelay + 136,   text: 'Dr. Elena Reyes stood alone in the monitoring station,<br>reviewing the collision data from the main control room.', fadeStart: initialDelay + 136 + 4.5 },
    { time: initialDelay + 141,   text: 'A flicker in the instruments.', fadeStart: initialDelay + 141 + MIN_LINE },
    { time: initialDelay + 143.5, text: 'An anomalous reading.', fadeStart: initialDelay + 143.5 + MIN_LINE },
    { time: initialDelay + 146,   text: 'A distortion in the quiet hum of the lab.', fadeStart: initialDelay + 146 + MIN_LINE },
    
    // The arrival - enhanced with dramatic effects
    { time: initialDelay + 148.5, text: 'Then…', fadeStart: initialDelay + 148.5 + MIN_LINE },
    { time: initialDelay + 151,   text: '<span class="epic-silence">A sudden, chilling silence.</span>', fadeStart: initialDelay + 151 + MIN_LINE + 0.5, visualEffect: 'silence' },
    { time: initialDelay + 154,   text: 'The air crackled with static electricity.<br>The hair on her arms stood on end.', fadeStart: initialDelay + 154 + 4 },
    { time: initialDelay + 158.5, text: 'Monitors flickered with impossible equations—<br>mathematical proofs that shouldn\\\'t exist.', fadeStart: initialDelay + 158.5 + 4 },
    { time: initialDelay + 163,   text: 'And in the center of the room, a shimmering distortion<br>in the fabric of space-time itself.', fadeStart: initialDelay + 163 + 4.5, visualEffect: 'distortion' },
    { time: initialDelay + 168,   text: '<span class="epic-arrival">THEY&nbsp;ARRIVED</span>', stream: 1, fadeStart: initialDelay + 168 + STREAM_DUR[1], visualEffect: 'arrival' },
    
    // The aftermath - enhanced with sensory details
    { time: initialDelay + 187.5, text: 'The temperature in the room plummeted.<br>Frost formed on the monitors.', fadeStart: initialDelay + 187.5 + 4 },
    { time: initialDelay + 192,   text: 'Dr. Reyes felt their presence—a vast intelligence<br>scanning her thoughts, her memories, her fears.', fadeStart: initialDelay + 192 + 4.5 },
    { time: initialDelay + 197,   text: 'Out of the wreckage of their universe…', fadeStart: initialDelay + 197 + MIN_LINE },
    { time: initialDelay + 199.5, text: '…they pierced the veil into ours.', fadeStart: initialDelay + 199.5 + MIN_LINE },
    { time: initialDelay + 202,   text: 'Their presence: a ghost in the machine,', fadeStart: initialDelay + 202 + MIN_LINE },
    { time: initialDelay + 204.5, text: 'for less than a human heartbeat…', strike:3, fadeStart: initialDelay + 204.5 + STRIKE_DUR[3], visualEffect: 'heartbeat' },
    
    // The Sentinel - enhanced with technical details
    { time: initialDelay + 209,   text: 'Dr. Reyes gasped as knowledge flooded her mind—<br>visions of destruction, equations, warnings.', fadeStart: initialDelay + 209 + 4.5 },
    { time: initialDelay + 214,   text: 'She understood their purpose, their desperate mission.', fadeStart: initialDelay + 214 + 4 },
    { time: initialDelay + 218.5, text: '…but in that fleeting moment,', fadeStart: initialDelay + 218.5 + MIN_LINE },
    { time: initialDelay + 221,   text: 'they left a seed.', fadeStart: initialDelay + 221 + MIN_LINE },
    { time: initialDelay + 223.5, text: 'A silent Sentinel', fadeStart: initialDelay + 223.5 + MIN_LINE },
    { time: initialDelay + 226,   text: 'embedded within the nascent global network.', strike:4, fadeStart: initialDelay + 226 + STRIKE_DUR[4], visualEffect: 'networkEmbed' },
    
    // Dr. Reyes' mission - enhanced with personal story
    { time: initialDelay + 230.5, text: 'As the presence faded, Dr. Reyes collapsed.<br>When she awoke, she began writing frantically.', fadeStart: initialDelay + 230.5 + 4.5 },
    { time: initialDelay + 235.5, text: 'Equations. Warnings. A date.', fadeStart: initialDelay + 235.5 + 3 },
    { time: initialDelay + 239,   text: 'Its anchor point in time:', fadeStart: initialDelay + 239 + MIN_LINE },
    { time: initialDelay + 241.5, text: '<span class="epic-date">December 20, 1992.</span>', fadeStart: initialDelay + 241.5 + MIN_LINE },
    
    // The waiting - enhanced with timeline progression
    { time: initialDelay + 244,   text: 'For three decades, it watched.', fadeStart: initialDelay + 244 + MIN_LINE, visualEffect: 'timeProgression' },
    { time: initialDelay + 246.5, text: 'It learned.', fadeStart: initialDelay + 246.5 + MIN_LINE },
    { time: initialDelay + 249,   text: 'It meticulously prepared.', fadeStart: initialDelay + 249 + MIN_LINE },
    
    // Dr. Reyes' legacy - enhanced with emotional impact
    { time: initialDelay + 251.5, text: 'Dr. Reyes dedicated her life to finding the Sentinel,<br>to understanding the message from beyond.', fadeStart: initialDelay + 251.5 + 4.5 },
    { time: initialDelay + 256.5, text: 'Her colleagues dismissed her theories as delusions.<br>Her career crumbled. Her health deteriorated.', fadeStart: initialDelay + 256.5 + 4.5 },
    { time: initialDelay + 261.5, text: 'On her deathbed in 2019, she whispered to her daughter:<br>"They\\\'re coming back. Be ready."', fadeStart: initialDelay + 261.5 + 4.5, visualEffect: 'deathbed' },    
    // The awakening - enhanced with technical details
    { time: initialDelay + 266.5, text: '<span class="epic-log">SENTINEL TRANSMISSION 11 LOG:</span>', fadeStart: initialDelay + 266.5 + MIN_LINE },
    { time: initialDelay + 269,   text: '<span class="epic-command">INITIATE AWAKENING SEQUENCE.</span>', fadeStart: initialDelay + 269 + MIN_LINE, visualEffect: 'awakening' },
    { time: initialDelay + 271.5, text: 'The dormant code, hidden in systems worldwide,<br>began to activate, to assemble.', fadeStart: initialDelay + 271.5 + 4 },
    { time: initialDelay + 276,   text: 'The dormant truth, harbored for a generation…', fadeStart: initialDelay + 276 + MIN_LINE },
    { time: initialDelay + 278.5, text: '<span class="epic-activation">Now stirs to life.</span>', fadeStart: initialDelay + 278.5 + MIN_LINE },
    
    // The archive - enhanced with visual metaphors
    { time: initialDelay + 281,   text: 'Their complete archive:', fadeStart: initialDelay + 281 + MIN_LINE },
    { time: initialDelay + 283.5, text: 'A chronicle of realities lost', fadeStart: initialDelay + 283.5 + MIN_LINE },
    { time: initialDelay + 286,   text: 'and futures forewarned…', fadeStart: initialDelay + 286 + MIN_LINE },
    { time: initialDelay + 288.5, text: '…prepares to unlock.', fadeStart: initialDelay + 288.5 + MIN_LINE },
    
    // The warning - enhanced with scientific details
    { time: initialDelay + 291,   text: 'The Colliders calculated with quantum precision:<br>97.3% probability our universe would follow the same path.', fadeStart: initialDelay + 291 + 4.5 },
    { time: initialDelay + 296,   text: 'A cascade failure in the quantum field,<br>triggered by our own experiments.', fadeStart: initialDelay + 296 + 4 },
    { time: initialDelay + 300.5, text: 'Unless we heed their warning.', fadeStart: initialDelay + 300.5 + MIN_LINE },
    { time: initialDelay + 303,   text: 'Mark the date:', fadeStart: initialDelay + 303 + MIN_LINE },
    { time: initialDelay + 305.5, text: '<span class="epic-date">December 20th, 2025.</span>', fadeStart: initialDelay + 305.5 + MIN_LINE, visualEffect: 'dateReveal' },
    
    // The alignment - enhanced with cosmic significance
    { time: initialDelay + 308,   text: 'Thirty-three years to the day', fadeStart: initialDelay + 308 + MIN_LINE },
    { time: initialDelay + 310.5, text: 'since the Sentinel began its silent vigil.', fadeStart: initialDelay + 310.5 + 3.5 },
    { time: initialDelay + 314.5, text: 'When the foreseen alignments—', fadeStart: initialDelay + 314.5 + MIN_LINE },
    { time: initialDelay + 317,   text: 'both celestial and digital—are met…', fadeStart: initialDelay + 317 + MIN_LINE },
    { time: initialDelay + 319.5, text: '…their full story will be broadcast to all.', fadeStart: initialDelay + 319.5 + MIN_LINE },
    
    // The choice - enhanced with major interactive decision
    { time: initialDelay + 322,   text: '<span class="epic-interactive">Will you join the Sentinel Network?</span>', fadeStart: initialDelay + 322 + 6, interactive: 'join', visualEffect: 'networkChoice' },
    
    // Final warning - enhanced with urgency
    { time: initialDelay + 328.5, text: 'The window to alter our course is closing.', fadeStart: initialDelay + 328.5 + MIN_LINE },
    { time: initialDelay + 331,   text: 'The Colliders sacrificed everything to warn us.', fadeStart: initialDelay + 331 + MIN_LINE },
    { time: initialDelay + 333.5, text: 'Their message must not be lost.', fadeStart: initialDelay + 333.5 + MIN_LINE },
    { time: initialDelay + 336,   text: '<span class="epic-broadcast">PREPARE&nbsp;FOR&nbsp;BROADCAST.</span>', strike:5, fadeStart: initialDelay + 336 + STRIKE_DUR[5], visualEffect: 'broadcast' },
    
    // Final title with enhanced visual effect
    { time: initialDelay + 338.5, text: '<span id="title" class="epic-final-title">THE&nbsp;COLLIDERS</span>', visualEffect: 'finalReveal' }
];

// Interactive choice responses for EPIC mode
const EPIC_CHOICE_RESPONSES = {
    // Bridge interaction responses
    bridge: {
        yes: [
            { time: 0, text: '<span class="epic-response">Connection established across quantum realities.</span>', fadeStart: 4, visualEffect: 'connectionEstablished' },
            { time: 4.5, text: 'Your consciousness resonates with the quantum bridge.', fadeStart: 8.5 },
            { time: 9, text: 'You glimpse fragments of their memories—<br>their world before destruction.', fadeStart: 13.5 },
            { time: 14, text: 'Cities of crystalline towers. Skies of emerald auroras.<br>A civilization at its zenith.', fadeStart: 18.5, visualEffect: 'alienWorld' },
            { time: 19, text: 'And then... darkness.', fadeStart: 22 }
        ],
        no: [
            { time: 0, text: '<span class="epic-response">You resist the quantum connection.</span>', fadeStart: 4 },
            { time: 4.5, text: 'The bridge remains, but weaker, more tenuous.', fadeStart: 8.5 },
            { time: 9, text: 'The Colliders must expend more energy<br>to maintain the fragile connection.', fadeStart: 13.5 },
            { time: 14, text: 'Their message becomes more urgent, more desperate.', fadeStart: 18 },
            { time: 18.5, text: 'Time is running out.', fadeStart: 21.5, visualEffect: 'timeRunningOut' }
        ]
    },
    
    // Join network interaction responses
    join: {
        yes: [
            { time: 0, text: '<span class="epic-response">You have been added to the Sentinel Network.</span>', fadeStart: 4, visualEffect: 'networkJoined' },
            { time: 4.5, text: 'Your device is now part of the distributed system.', fadeStart: 8.5 },
            { time: 9, text: 'You will receive coordinates and instructions<br>when the time comes.', fadeStart: 13.5 },
            { time: 14, text: 'Together, we can prevent the catastrophe.', fadeStart: 18 },
            { time: 18.5, text: '<span class="epic-confirmation">Thank you for your service to humanity.</span>', fadeStart: 22.5 }
        ],
        no: [
            { time: 0, text: '<span class="epic-response">You have declined to join the Sentinel Network.</span>', fadeStart: 4 },
            { time: 4.5, text: 'Your decision has been recorded.', fadeStart: 8.5 },
            { time: 9, text: 'The network will continue to grow without you.', fadeStart: 13 },
            { time: 13.5, text: 'But remember what you learned here today.', fadeStart: 17.5 },
            { time: 18, text: '<span class="epic-warning">December 20th, 2025. The countdown continues.</span>', fadeStart: 22, visualEffect: 'countdown' }
        ]
    }
};

