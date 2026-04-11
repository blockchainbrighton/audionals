# Chapter 5: The Infinite Loop


The Computer Laboratory smelled of ozone, burnt coffee, and the specific, dusty heat of electronics pushed to their breaking point. It was 3:00 AM on a Tuesday in early 1982, a time when the rest of Cambridge was asleep under heavy wool blankets, dreaming of rowing regattas or damp tutorials.

James Adamson was not asleep. He was sitting cross-legged on a swivel chair, staring into the jade-green abyss of a VT100 terminal, his retinas slowly frying in the monochromatic glow.

Behind him, the VAX-11/780 hummed—a monolithic cabinet the size of two refrigerators that held more computational power than James could fully comprehend, yet somehow never enough for what he was trying to ask it.

"Come on," James whispered, tapping the `RETURN` key with a rhythmic, nervous tic. "Don't hang on me. Not now."

He was writing in FORTRAN 77. To the uninitiated, the lines of code on the screen looked like cryptic poetry—`DO loops`, `IF statements`, and `Subroutines`. To James, it was a sieve.

He had spent the last three days obsessing over the anomalies in Professor Halloway’s radio telescope data. The noise—the "glitch"—was stubborn. It appeared as a jagged spike in the background radiation, a hiccup in the cosmic microwave background that, according to Halloway, was merely a calibration error in the receiver dishes. *Atmospheric interference,* Halloway had said, waving a pipe stem dismissively. *A taxi radio. A pigeon sitting on the feed horn.*

James didn’t buy it. Pigeons didn't create mathematical precision.

He had designed a recursive filter algorithm. The logic was simple: feed the raw data from the telescope tapes into the VAX, identify the standard Gaussian noise of the universe (the chaotic hiss left over from the Big Bang), and subtract it. Whatever remained would be the signal. Or, if Halloway was right, nothing would remain. The screen would go flat, and James could go to bed.

"Syntax Error on Line 420," the terminal blinked.

"Damn it," James hissed. He leaned forward, hunting for the missing parenthesis.

"Talking to the machine won't make it like you, Adamson."

James spun the chair around. Eleanor was standing in the doorway, holding a plastic cup of vending machine tea that looked suspiciously like sludge. She was wearing an oversized cable-knit sweater, her dark hair pulled back in a chaotic bun held together by what looked like a pencil.

"It's temperamental," James said, rubbing his eyes. "It doesn't like recursive geometry."

"It's a VAX," Eleanor said, walking over and leaning against the desk next to him. "It doesn't have feelings. It processes logic gates. If it's stalling, your code is inefficient."

"My code is elegant," James retorted, turning back to the keyboard and fixing the syntax error. "It's the data that's messy. I'm trying to scrub the static from the Perseus Cluster scans."

Eleanor took a sip of her tea and grimaced. "Still chasing ghosts? Halloway is going to revoke your lab privileges if he finds out you're using mainframe time to analyze 'instrument error'."

"It's not error," James muttered as he recompiled. The tape drives on the wall began to spin, jerking into motion like startled birds. *Whirr-click-whirr.* "Look. I took the data set from the Perseus observations we did last week. Then I pulled an old reel from the archive—scanning the Sagittarius Arm from three years ago."

"And?"

"And the static is the same."

Eleanor paused, the cup halfway to her mouth. "That’s how static works, James. It’s random noise. It all looks the same."

"No," James said, his voice dropping an octave. "I mean it’s *the same*. The peaks. The troughs. The duration. It’s not just similar 'white noise.' It’s the exact same sequence."

He typed a command to execute the comparison subroutine. The cursor blinked—once, twice, three times. The VAX groaned, its cooling fans kicking up a gear as it crunched through megabytes of binary star dust.

"That's impossible," Eleanor said, stepping closer to the screen. "Perseus and Sagittarius are nowhere near each other. We’re talking different directions in the sky, different distances. The light hitting the dish from Perseus left its source millions of years ago. The Sagittarius data is local—relatively speaking. They can’t have the same interference pattern. That would mean..."

"That would mean the interference isn't coming from the sky," James finished. "It implies the noise is built into the receiver."

"See?" Eleanor shrugged. "Hardware fault. Halloway was right. A loose wire in the oscillator."

"That’s what I thought," James said. "So I wrote this."

The screen refreshed. The code had finished running.

Two green lines appeared on the graph plotting display. One represented the noise profile from Perseus. The other, the noise from Sagittarius.

James hit a key to overlay them.

They didn't just align. They snapped together. A perfect, pixel-for-pixel match. A single, jagged line glowing on the CRT.

The room went silent, save for the hum of the fans.

"Okay," Eleanor said softly. "That’s a very precise hardware fault."

"Wait," James said. His heart was hammering against his ribs. "I want to try something else."

He reached for his backpack and pulled out a battered notebook, then grabbed a fresh magnetic tape reel from his desk. "I pulled this from the library basement this afternoon. It’s not radio telescope data. It’s a digitization of background radiation measurements taken by Bell Labs in the 1960s."

He mounted the tape. His hands were shaking slightly.

"James," Eleanor warned. "That’s data from twenty years ago. Different equipment. Different continent. If the noise matches that..."

"Then it's not the equipment," James whispered.

He ran the filter. The VAX chugged. The seconds stretched out, elastic and agonizing. James found himself thinking about the arcade down on King’s Parade. He thought about *Space Invaders*. He thought about how, when the aliens moved faster, the computer wasn't actually thinking; it was just cycling the same instructions at a higher clock speed.

The screen flashed. **PROCESS COMPLETE.**

A third line appeared.

James superimposed it over the first two.

*Snap.*

Perfect alignment.

James sat back in his chair, the breath leaving his lungs in a rush. "It’s not the receiver," he said, his voice sounding hollow in the empty lab. "And it’s not the atmosphere."

Eleanor stared at the single green line. "That... shouldn't be possible. Randomness is the fundamental law of thermodynamics. Entropy increases. You cannot have an identical chaotic sequence occurring in New Jersey in 1965 and Cambridge in 1982, looking at two different parts of the universe. The odds are..." She trailed off, doing the math in her head. "It's statistically zero. It’s a number so small it doesn't exist."

"Unless it's not random," James said.

He leaned in, the green light bathing his face. He felt a sudden, vertiginous sense of unreality, as if the floor tiles beneath the chair might suddenly fail to render.

"Think about your project, El," James said, gesturing vaguely at her stack of punch cards. "Your artificial intelligence. When you're trying to save memory, what do you do?"

"I use subroutines," she said automatically. "I reuse code. If I need the computer to calculate a trajectory five times, I don't write the code five times. I write it once and call it five times."

"Exactly," James said. "And what about graphics? In those games at the arcade. When they draw a starfield in the background..."

"They use a tile map," Eleanor said, her eyes narrowing. "They draw one patch of stars and repeat it across the screen to create the illusion of infinite space."

James tapped the screen, right on the jagged green line.

"This isn't noise, Eleanor. This is a tile."

He stood up, pacing the small space between the terminals. The adrenaline was hitting him now, sharp and cold.

"The universe is huge," James said, talking fast. "Too huge. Too much information. If you were building it... if you had to simulate an infinite reality but you had a finite limit on processing power, you wouldn't render every single photon individually. You’d cheat. You’d use a procedural texture for the background. You’d use the same random seed for the cosmic microwave background in Perseus as you did in Sagittarius because *who would ever notice?*"

"You're suggesting..." Eleanor looked at him like he’d lost his mind. "James, you're suggesting the universe is optimizing its assets?"

"I'm saying I just found the seam in the wallpaper," James said. He looked at the VAX, really looked at it. It wasn't just a machine anymore. It was a mirror.

"It's a loop," James murmured. "An infinite loop of reused data. We think we're looking at an endless ocean, but we're just looking at the same wave, cloned a trillion times."

"James," Eleanor said, her voice steadying him. "If you tell Halloway that you think the universe is a video game trying to save RAM, he won't just fail you. He'll have you committed."

"I know," James said. He looked back at the screen. The single line glowed, mocking him with its impossible perfection. "I can't tell him. Not yet. I need to know what the signal *is*."

"It's static," Eleanor insisted, though she sounded less sure now.

"No," James said. He sat back down and began to type, his fingers flying across the keys with renewed, manic purpose. "It's a signature. And if it's a signature, that means someone—or something—signed it."

"What are you doing now?"

James didn't look up. "I'm not cleaning the data anymore, El. I'm tracing it. If this pattern is reused, it has to have an origin point. A master copy."

He hit `ENTER`.

"I'm going to find where the loop starts."

The VAX began to hum again, louder this time, as if the machine itself was nervous about what it was being asked to find. James watched the cursor blink, and for the first time in his life, he was terrified of what the answer might be.






*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************