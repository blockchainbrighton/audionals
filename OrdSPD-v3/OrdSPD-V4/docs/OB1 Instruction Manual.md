OB1 

Instruction Manual (Keyboard & Variable Quick-Reference)
======================================================

Welcome to the OB1.  This manual tells you every key, every variable you can change, and what you’ll see or hear when you do.  
Keep this page open until the shortcuts become muscle-memory.

-------------------------------------------------
1.  What you are looking at
-------------------------------------------------
• One large square image (Unique artwork representing each sample).  
• A small yellow “78 BPM” label that appears in the top-center when you change tempo or multiplier.  
• No visible controls – everything is driven by keyboard, mouse-click, or parent-window messages.

-------------------------------------------------
2.  Start / Stop the Loop
-------------------------------------------------
MOUSE  
• Single-click the image → toggles infinite loop ON / OFF.  
  - First click: starts looping at the current BPM & multiplier.  
  - Second click: stops with a 100 ms fade-out.

SPACE-BAR (tap)  
• Plays the sample **once** regardless of the loop state.  
• Does **NOT** toggle the loop.

-------------------------------------------------
3.  Tempo (BPM) – two ranges
-------------------------------------------------
Fine ±1 BPM  
Shift +  +        increase 1 BPM  
Shift +  _        decrease 1 BPM  

Coarse ±10 BPM  
Shift + Ctrl +  =   increase 10 BPM  
Shift + Ctrl +  _   decrease 10 BPM  

Range: 60 – 240 BPM (values outside are clamped).  
The yellow label shows the new BPM for 3 seconds.

-------------------------------------------------
4.  Multiplier – how long one loop cycle lasts
-------------------------------------------------
The multiplier stretches or shrinks the loop length relative to a single beat.

Key (no modifiers)  
=       ×2  (loop becomes twice as long)  
-       ÷2  (loop becomes half as long)  
0       reset to 1× (exactly one beat)

Display: the yellow label translates the raw number into bars & beats, e.g.  
“Loop Length = 1 bar”, “4 bars”, “1/8”, etc.

-------------------------------------------------
5.  Playback Speed (Pitch / Time-stretch)
-------------------------------------------------
Fine ±0.01  
Shift +  }   speed up 1 %  
Shift +  {   slow down 1 %  

Coarse ±0.10  
Shift + Ctrl + }   speed up 10 %  
Shift + Ctrl + {   slow down 10 %  

Range: 0.20 – 100 (clamped).  
The change is instant for all currently playing and future notes.

-------------------------------------------------
6.  Volume & Mute
-------------------------------------------------
.       volume up 0.1 (10 %)  
,       volume down 0.1 (10 %)  
m       toggle mute / restore previous level  

All volume moves apply a 30 ms fade ramp to avoid clicks.  
Maximum gain = 2× (double original volume).

-------------------------------------------------
7.  Visual Feedback
-------------------------------------------------
• While looping: the image shakes in every direction.  
• When a one-shot plays: the image shakes once for 150 ms.  
• The yellow label appears for 3 s after every BPM or multiplier change.

-------------------------------------------------
8.  Internal Variables (read-only)
-------------------------------------------------
These are not changed directly; they update automatically:

state.bpm                current tempo in BPM  
state.scheduleMultiplier loop-length multiplier  
playbackSpeed            playback rate (1 = normal)  
gainNode.gain.value      0–2, current volume  

Parent windows can request these via postMessage (see “Remote Control” below).

-------------------------------------------------
9.  Remote Control (Parent Window API)
-------------------------------------------------
Send a postMessage to the OB1 iframe with:

{type:"updateBPM", data:{bpm:120}}       set tempo  
{type:"playLoop"}                        start loop  
{type:"playOnce"}                        single shot  
{type:"playAtSpeed", data:{speed:0.75}}  change speed  
{type:"muteControl", data:{mute:true}}   mute / unmute  
{type:"increaseVolume"} / {type:"decreaseVolume"}  
{type:"requestCurrentSettings"}          returns object with scheduleMultiplier & currentVolume

-------------------------------------------------
10.  Quick Cheat-Sheet
-------------------------------------------------
Loop ON/OFF   → click image  
One-shot      → SPACE  
BPM           → Shift + +/- (fine) | Shift+Ctrl + +/- (coarse)  
Multiplier    → = / - / 0  
Speed         → Shift + { } (fine) | Shift+Ctrl + { } (coarse)  
Volume        → , / . / m  

That’s it—close the manual and start jamming.