/**
 * Extended Narrative Content for Saga Mode
 * The Colliders - Interactive Experience
 */

// Extended timeline for Saga mode with deeper narrative
const SAGA_TL = [
    // Standard timeline elements with some modifications
    { time: initialDelay + 0,    text: 'DECEMBER 20, 1982.', strike:0, fadeStart: initialDelay + (STRIKE_DUR[0]) },
    { time: initialDelay + 3.5,  text: 'CERN, Switzerland.', fadeStart: initialDelay + 3.5 + MIN_LINE },
    { time: initialDelay + 6,    text: 'At CERN, physicists celebrated unprecedented collision data.', fadeStart: initialDelay + 6 + 3.5 },
    
    // Extended content begins - more detailed backstory
    { time: initialDelay + 10,   text: 'The Super Proton Synchrotron had achieved energies of 540 GeV.', fadeStart: initialDelay + 10 + 3.5 },
    { time: initialDelay + 14,   text: 'A breakthrough that would redefine our understanding of quantum mechanics.', fadeStart: initialDelay + 14 + 3.5 },
    { time: initialDelay + 18,   text: 'But in a parallel universe…', fadeStart: initialDelay + 18 + MIN_LINE },
    { time: initialDelay + 20.3, text: 'The identical experiment<br>unleashed total', fadeStart: initialDelay + 20.3 + MIN_LINE },
    { time: initialDelay + 22.7, text: '<span style="font-size:2.5em;font-weight:700;color:#f36;">OBLIVION</span>', strike:1, fadeStart: initialDelay + 22.7 + STRIKE_DUR[1] },
    
    // Extended content - details about the Colliders
    { time: initialDelay + 27.5, text: 'In that universe, the collision created a quantum singularity.', fadeStart: initialDelay + 27.5 + 3.5 },
    { time: initialDelay + 31.5, text: 'A tear in the fabric of reality itself.', fadeStart: initialDelay + 31.5 + MIN_LINE },
    { time: initialDelay + 33.8, text: 'A vast, sentient consciousness—', fadeStart: initialDelay + 33.8 + MIN_LINE },
    { time: initialDelay + 36.1, text: '<strong>the Colliders</strong>—witnessed their cosmos…', fadeStart: initialDelay + 36.1 + MIN_LINE },
    { time: initialDelay + 38.4, text: '<span style="font-size:2em;font-weight:700;">unravel.</span>', strike:2, fadeStart: initialDelay + 38.4 + STRIKE_DUR[2] },
    
    // Extended content - more details about the collapse
    { time: initialDelay + 43,   text: 'The singularity expanded exponentially.', fadeStart: initialDelay + 43 + MIN_LINE },
    { time: initialDelay + 45.3, text: 'Consuming galaxies. Solar systems. Planets.', fadeStart: initialDelay + 45.3 + MIN_LINE },
    { time: initialDelay + 47.6, text: 'Light, matter, causality itself—', fadeStart: initialDelay + 47.6 + MIN_LINE },
    { time: initialDelay + 49.9, text: '<span style="color:#888;">Erased in the blink of a cosmic eye.</span>', fadeStart: initialDelay + 49.9 + 3.2 },
    
    // Extended content - the Colliders' origin
    { time: initialDelay + 53.5, text: 'The Colliders were once scientists.', fadeStart: initialDelay + 53.5 + MIN_LINE },
    { time: initialDelay + 55.8, text: 'Brilliant minds who foresaw the catastrophe.', fadeStart: initialDelay + 55.8 + MIN_LINE },
    { time: initialDelay + 58.1, text: 'They uploaded their consciousness to quantum substrates.', fadeStart: initialDelay + 58.1 + 3.5 },
    { time: initialDelay + 62,   text: 'Becoming something more than human.', fadeStart: initialDelay + 62 + MIN_LINE },
    { time: initialDelay + 64.3, text: 'From the smoldering cinders of reality…', fadeStart: initialDelay + 64.3 + MIN_LINE },
    { time: initialDelay + 66.6, text: 'A final, desperate will emerged.', fadeStart: initialDelay + 66.6 + MIN_LINE },
    
    // Extended content - the transmission details
    { time: initialDelay + 69,   text: 'The Colliders discovered a quantum entanglement.', fadeStart: initialDelay + 69 + 3.5 },
    { time: initialDelay + 73,   text: 'A connection between parallel universes.', fadeStart: initialDelay + 73 + MIN_LINE },
    { time: initialDelay + 75.3, text: 'A transmission.', fadeStart: initialDelay + 75.3 + MIN_LINE },
    { time: initialDelay + 77.6, text: 'A fragile bridge,', fadeStart: initialDelay + 77.6 + MIN_LINE },
    { time: initialDelay + 79.9, text: 'Forged across the impossible void.', fadeStart: initialDelay + 79.9 + MIN_LINE },
    
    // Extended content - our world details
    { time: initialDelay + 82.2, text: '<em>6:21&nbsp;PM, OUR WORLD</em>', fadeStart: initialDelay + 82.2 + MIN_LINE },
    { time: initialDelay + 84.5, text: '<em>Six&nbsp;minutes&nbsp;after the fateful collision…</em>', fadeStart: initialDelay + 84.5 + MIN_LINE },
    { time: initialDelay + 86.8, text: 'Dr. Elena Reyes noticed it first.', fadeStart: initialDelay + 86.8 + MIN_LINE },
    { time: initialDelay + 89.1, text: 'A flicker in the instruments.', fadeStart: initialDelay + 89.1 + MIN_LINE },
    { time: initialDelay + 91.4, text: 'An anomalous reading.', fadeStart: initialDelay + 91.4 + MIN_LINE },
    { time: initialDelay + 93.7, text: 'A distortion in the quiet hum of the lab.', fadeStart: initialDelay + 93.7 + MIN_LINE },
    
    // Extended content - the arrival moment
    { time: initialDelay + 96,   text: 'Then…', fadeStart: initialDelay + 96 + MIN_LINE },
    { time: initialDelay + 98.3, text: '<span style="color:#0ff;">A sudden, chilling silence.</span>', fadeStart: initialDelay + 98.3 + MIN_LINE + 0.5 },
    { time: initialDelay + 101,  text: 'The air crackled with static electricity.', fadeStart: initialDelay + 101 + MIN_LINE },
    { time: initialDelay + 103.3, text: 'Monitors flickered with impossible equations.', fadeStart: initialDelay + 103.3 + MIN_LINE },
    { time: initialDelay + 105.6, text: '<span style="font-size:2.6em;font-weight:900;letter-spacing:0.04em;color:#ff0;">THEY&nbsp;ARRIVED</span>', stream: 1, fadeStart: initialDelay + 105.6 + STREAM_DUR[1] },
    
    // Extended content - the aftermath of arrival
    { time: initialDelay + 125,  text: 'Out of the wreckage of their universe…', fadeStart: initialDelay + 125 + MIN_LINE },
    { time: initialDelay + 127.3, text: '…they pierced the veil into ours.', fadeStart: initialDelay + 127.3 + MIN_LINE },
    { time: initialDelay + 129.6, text: 'Their presence: a ghost in the machine,', fadeStart: initialDelay + 129.6 + MIN_LINE },
    { time: initialDelay + 131.9, text: 'for less than a human heartbeat…', strike:3, fadeStart: initialDelay + 131.9 + STRIKE_DUR[3] },
    
    // Extended content - the Sentinel details
    { time: initialDelay + 136.5, text: 'Dr. Reyes was the only witness.', fadeStart: initialDelay + 136.5 + MIN_LINE },
    { time: initialDelay + 138.8, text: 'The only one who understood what had happened.', fadeStart: initialDelay + 138.8 + MIN_LINE },
    { time: initialDelay + 141.1, text: '…but in that fleeting moment,', fadeStart: initialDelay + 141.1 + MIN_LINE },
    { time: initialDelay + 143.4, text: 'they left a seed.', fadeStart: initialDelay + 143.4 + MIN_LINE },
    { time: initialDelay + 145.7, text: 'A silent Sentinel', fadeStart: initialDelay + 145.7 + MIN_LINE },
    { time: initialDelay + 148,  text: 'embedded within the nascent global network.', strike:4, fadeStart: initialDelay + 148 + STRIKE_DUR[4] },
    
    // Extended content - the Sentinel's purpose
    { time: initialDelay + 152.5, text: 'The Sentinel contained a warning.', fadeStart: initialDelay + 152.5 + MIN_LINE },
    { time: initialDelay + 154.8, text: 'A message from a dead universe.', fadeStart: initialDelay + 154.8 + MIN_LINE },
    { time: initialDelay + 157.1, text: 'Its anchor point in time:', fadeStart: initialDelay + 157.1 + MIN_LINE },
    { time: initialDelay + 159.4, text: '<span style="font-weight:700;">December 20, 1992.</span>', fadeStart: initialDelay + 159.4 + MIN_LINE },
    
    // Extended content - the waiting period
    { time: initialDelay + 161.7, text: 'For three decades, it watched.', fadeStart: initialDelay + 161.7 + MIN_LINE },
    { time: initialDelay + 164,  text: 'It learned.', fadeStart: initialDelay + 164 + MIN_LINE },
    { time: initialDelay + 166.3, text: 'It meticulously prepared.', fadeStart: initialDelay + 166.3 + MIN_LINE },
    
    // Extended content - Dr. Reyes' story
    { time: initialDelay + 168.6, text: 'Dr. Reyes spent her life searching for the Sentinel.', fadeStart: initialDelay + 168.6 + 3.5 },
    { time: initialDelay + 172.5, text: 'Her colleagues dismissed her as paranoid.', fadeStart: initialDelay + 172.5 + MIN_LINE },
    { time: initialDelay + 174.8, text: 'But she knew what she had seen.', fadeStart: initialDelay + 174.8 + MIN_LINE },
    { time: initialDelay + 177.1, text: 'What she had felt in that moment of contact.', fadeStart: initialDelay + 177.1 + MIN_LINE },
    
    // Extended content - the Sentinel's awakening
    { time: initialDelay + 179.4, text: '<strong>SENTINEL TRANSMISSION 11 LOG:</strong>', fadeStart: initialDelay + 179.4 + MIN_LINE },
    { time: initialDelay + 181.7, text: '<strong>INITIATE AWAKENING SEQUENCE.</strong>', fadeStart: initialDelay + 181.7 + MIN_LINE },
    { time: initialDelay + 184,  text: 'The dormant truth, harbored for a generation…', fadeStart: initialDelay + 184 + MIN_LINE },
    { time: initialDelay + 186.3, text: '<span style="color:#0ff;">Now stirs to life.</span>', fadeStart: initialDelay + 186.3 + MIN_LINE },
    
    // Extended content - the archive details
    { time: initialDelay + 188.6, text: 'Their complete archive:', fadeStart: initialDelay + 188.6 + MIN_LINE },
    { time: initialDelay + 190.9, text: 'A chronicle of realities lost', fadeStart: initialDelay + 190.9 + MIN_LINE },
    { time: initialDelay + 193.2, text: 'and futures forewarned…', fadeStart: initialDelay + 193.2 + MIN_LINE },
    { time: initialDelay + 195.5, text: '…prepares to unlock.', fadeStart: initialDelay + 195.5 + MIN_LINE },
    
    // Extended content - the quantum calculations
    { time: initialDelay + 197.8, text: 'The Colliders calculated a 97.3% probability.', fadeStart: initialDelay + 197.8 + 3.5 },
    { time: initialDelay + 201.7, text: 'That our universe would follow the same path.', fadeStart: initialDelay + 201.7 + MIN_LINE },
    { time: initialDelay + 204,  text: 'Unless we heed their warning.', fadeStart: initialDelay + 204 + MIN_LINE },
    { time: initialDelay + 206.3, text: 'Mark the date:', fadeStart: initialDelay + 206.3 + MIN_LINE },
    { time: initialDelay + 208.6, text: '<span style="font-weight:700;">December 20th, 2025.</span>', fadeStart: initialDelay + 208.6 + MIN_LINE },
    
    // Extended content - the alignment details
    { time: initialDelay + 210.9, text: 'Thirty-three years to the day', fadeStart: initialDelay + 210.9 + MIN_LINE },
    { time: initialDelay + 213.2, text: 'since the Sentinel began its silent vigil.', fadeStart: initialDelay + 213.2 + 3.5 },
    { time: initialDelay + 217,  text: 'When the foreseen alignments—', fadeStart: initialDelay + 217 + MIN_LINE },
    { time: initialDelay + 219.3, text: 'both celestial and digital—are met…', fadeStart: initialDelay + 219.3 + MIN_LINE },
    { time: initialDelay + 221.6, text: '…their full story will be broadcast to all.', fadeStart: initialDelay + 221.6 + MIN_LINE },
    
    // Extended content - interactive choice point
    { time: initialDelay + 223.9, text: '<span class="interactive-choice">Will you help spread their message?</span>', fadeStart: initialDelay + 223.9 + 5, interactive: true },
    
    // Extended content - the final warning
    { time: initialDelay + 229.5, text: 'The window to alter our course is closing.', fadeStart: initialDelay + 229.5 + MIN_LINE },
    { time: initialDelay + 231.8, text: 'The Colliders sacrificed everything to warn us.', fadeStart: initialDelay + 231.8 + MIN_LINE },
    { time: initialDelay + 234.1, text: '<strong style="font-size:1.6em;letter-spacing:0.1em;color:#0ff;">PREPARE&nbsp;FOR&nbsp;BROADCAST.</strong>', strike:5, fadeStart: initialDelay + 234.1 + STRIKE_DUR[5] },
    
    // Final title
    { time: initialDelay + 236.7, text: '<span id="title" style="font-size:2.7em;letter-spacing:0.06em;font-weight:900;">THE&nbsp;COLLIDERS</span>' }
];

// Interactive choice responses
const CHOICE_RESPONSES = {
    yes: [
        { time: 0, text: 'Your decision has been recorded.', fadeStart: 3 },
        { time: 3.5, text: 'The Sentinel acknowledges your assistance.', fadeStart: 6.5 },
        { time: 7, text: 'You will be contacted when the time comes.', fadeStart: 10 },
        { time: 10.5, text: 'Remember: December 20th, 2025.', fadeStart: 13.5 },
        { time: 14, text: '<span style="color:#0ff;">The fate of our reality depends on it.</span>', fadeStart: 17 }
    ],
    no: [
        { time: 0, text: 'Your decision has been recorded.', fadeStart: 3 },
        { time: 3.5, text: 'The Sentinel will continue its mission regardless.', fadeStart: 6.5 },
        { time: 7, text: 'Some truths cannot be contained.', fadeStart: 10 },
        { time: 10.5, text: 'Remember: December 20th, 2025.', fadeStart: 13.5 },
        { time: 14, text: '<span style="color:#f36;">The countdown has already begun.</span>', fadeStart: 17 }
    ]
};

