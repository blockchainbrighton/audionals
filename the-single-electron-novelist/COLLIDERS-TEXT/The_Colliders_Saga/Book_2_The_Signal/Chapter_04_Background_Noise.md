# Chapter 4: Background Noise


The Computer Laboratory at Cambridge University had a smell that didn’t exist anywhere else in nature. It was a bouquet of ozone, stale filter coffee, floor wax, and the scorching heat of over-clocked silicon. To James Adamson, it was the smell of the future being dragged kicking and screaming into the present.

It was 2:00 AM on a Tuesday in early 1982. The VAX-11/780, a refrigerator-sized monolith of computing power, hummed with a deep, resonant baritone that vibrated through the soles of James’s trainers.

“Celestial bookkeeping,” James muttered, rubbing eyes that felt like they were filled with sand. “Glorified cosmic accounting.”

Professor Halloway had been true to his word. He hadn’t given James a telescope; he had given him the leftovers. James was currently staring at the glowing green phosphor of a VT100 terminal, scrolling through magnetic tape dumps from the Mullard Radio Astronomy Observatory. specifically, data from the One-Mile Telescope.

His task was mundane enough to induce a coma: verify the calibration of the receivers by analyzing the background static between known radio sources. He was looking for thermal noise—the random hiss of the universe—to ensure the telescope’s amplifiers were performing within standard deviation. He wasn’t hunting for quasars or pulsars; he was the janitor ensuring the lens wasn’t dirty.

*Scroll. Check. Confirm randomness. Scroll.*

The numbers cascaded down the screen in columns of glowing emerald. To anyone else, it was a matrix of headache-inducing gibberish. To James, who had spent the last three weeks dreaming in FORTRAN, it was a texture.

Reality, James was beginning to realize, had a grain.

He took a sip of lukewarm vending machine tea and tapped the spacebar to load the next block of data. The tape drive across the room lurched, spinning its reels with a mechanical *clunk-whirrr*.

*Block 492-A. Sector: Ursa Major, empty quadrant.*

The screen filled with values representing signal intensity. It should have been Gaussian noise—a bell curve of randomness caused by the heat of the electronics and the leftover radiation from the Big Bang.

James scanned the columns. His brain, wired for the deterministic logic of the arcade cabinets at the local pub, looked for patterns instinctively. He was looking for the spaceship in the stars, the safe path through the maze.

His finger hovered over the 'Page Down' key. Then it stopped.

"Wait," he whispered.

He scrolled back up.

Line 4020. An intensity spike: `0.0421`. Followed by a dip: `0.0098`. Followed by a plateau: `0.0112`.

It was a micro-fluctuation, barely rising above the noise floor. A nothing. A blip.

James frowned. He picked up a sheaf of fan-fold paper he’d printed out two hours ago—data from a completely different sector of the sky, near the constellation of Cassiopeia. He leafed through the pages, the perforated edges rustling in the quiet lab.

He found the line he was remembering. He laid the paper next to the screen.

In Cassiopeia, light-years away from Ursa Major, looking in a completely different direction relative to the galactic plane, the telescope had recorded: `0.0421`, `0.0098`, `0.0112`.

James sat back in his swivel chair, the springs squeaking in the silence.

"Coincidence," he said aloud. The lab was empty, save for the hum of the VAX, so he felt comfortable talking to the machine. "Law of large numbers. If you roll a billion dice, eventually you get the same sequence twice."

He cracked his knuckles and typed a command to cross-reference the timestamps.

The Ursa Major data was recorded on Tuesday at 14:00 hours. The Cassiopeia data was recorded three weeks ago, during a nocturnal sweep.

Different times. Different directions. The same string of noise.

James leaned in, the green light bathing his pale face. He began to type rapidly, his fingers clattering over the high-travel keys. He wrote a quick script—a clumsy, brute-force search algorithm—to hunt for that specific three-value string across the entire dataset Halloway had dumped on him.

The VAX groaned, its cooling fans spinning up as the processor load increased.

*SEARCHING...*

James waited. He drummed his fingers on the desk. This was the problem with astrophysics; it was too messy. In *Space Invaders*, if a pixel lit up, it was because the code said so. In the universe, things lit up because of gas, gravity, heat, or just because a pigeon sat on the antenna.

*MATCH FOUND.*
*MATCH FOUND.*
*MATCH FOUND.*

The screen began to populate.

Three matches. Then ten. Then forty.

James stared. The sequence `0.0421 - 0.0098 - 0.0112` wasn't just repeating occasionally. It was appearing with a frequency that defied statistical probability.

He pulled up the coordinates. There was no geometric relation. They weren't in a line. They weren't forming a circle. It was as if someone had taken a handful of sand and thrown it against a wall, and identical grains had landed in random spots.

"Hardware error," James said firmly.

That had to be it. It was the only rational explanation. One of the amplifiers in the One-Mile Telescope had a sticky bit, a micro-transistor that stuttered when it got too hot, outputting a specific voltage ghost. It was an artifact. A smudge on the lens.

He felt a wave of disappointment, followed quickly by relief. For a second, just a split second, he had felt a primal shiver of fear. Because if it wasn't hardware...

If it wasn't the machine...

"It's a glitch," he reassured himself. "Just a dirty buffer."

He grabbed a red pen and circled the coordinates on his printout. He’d show Halloway in the morning. He’d tell him the receiver needed servicing. Halloway would be annoyed at the delay, but impressed that James had caught a subtle mechanical failure.

James stood up and stretched, his spine popping. He walked over to the window. Outside, the Cambridge mist had turned the streetlights into hazy orange orbs.

He looked at the reflection of the computer lab in the glass. The rows of tape drives, the blinking lights of the modem banks.

*Reused assets.*

The thought intruded into his mind, unbidden.

In the video games he played at the arcade, memory was expensive. RAM was limited. You didn't draw a thousand unique clouds. You drew one cloud and pasted it into the sky a thousand times at different coordinates. You didn't calculate the physics for every bullet; you used a lookup table.

If you looked closely at a game, really closely, you could see the repetition. You could see the shortcuts the computer took to render the world.

James looked back at the glowing terminal.

The sequence `0.0421 - 0.0098 - 0.0112`.

It didn't look like a signal from an alien civilization. It didn't look like a pulsar. It looked like a texture map that hadn't loaded properly. It looked like the universe was saving memory.

He shook his head, physically shaking the thought loose. "You've been awake too long, Adamson," he muttered. "Go to bed. It's a broken amplifier. It's just a broken amplifier."

He gathered his papers and shoved them into his satchel. He typed `LOGOFF` into the terminal. The screen went dark, leaving only the blinking cursor.

James walked out of the climate-controlled lab into the damp, cold corridor of the building. He buttoned his coat, preparing for the bike ride back to his dorm.

But as he walked, he couldn't help but look at the stone floor tiles. He found himself scanning them, checking for cracks, checking for discoloration.

Checking to see if any of them were identical.

The seed was planted. The static wasn't just grey anymore. It was hiding something. And James Adamson, despite his better judgment, knew he wouldn't be able to sleep until he knew *why* the universe was stuttering.





*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************