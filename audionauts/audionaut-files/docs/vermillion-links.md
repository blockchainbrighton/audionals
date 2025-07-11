[
  "https://vermilion.place/inscription/00df6d5032899475db1e13a076b1f13b1854593815e98f7c9e54d4a9643d9413i0",
  "https://vermilion.place/inscription/9c8360f089851f5e848651c618bf8d957d19e078e630739d48cd83be313c0422i0",
  "https://vermilion.place/inscription/6fb976ab49dcec017f1e201e84395983204ae1a7c29be70c0c6112267d5138ffi0",
  "https://vermilion.place/inscription/9305532f1b402774a38e1a140d3810f37c35a64651355a6d54b2d3527b1349f4i0",
  "https://vermilion.place/inscription/d855734560d3e5e43152554795b5832a5e954e743a1a6f8885e3a80809b9f7a9i0"
]

// dataset.js
// A hand-curated slice of music- & sound-centric ordinals on https://vermilion.place/.
// Fields:  id → numeric inscription/collection identifier
//          url → canonical Vermilion URL
//          mime → primary media-type on-chain
//          keywords → quick-search facets (extend as you like)

export const ordinalsAssets = [
  // === AUDIO (OGG / MP3) ===================================================
  { id: 71064438, url: "https://www.vermilion.place/inscription/71064438", mime: "audio/ogg",  keywords: ["audio","ogg","loop","clip"] }, // turn0search1
  { id: 97686244, url: "https://hostmaster.vermilion.place/inscription/97686244", mime: "audio/ogg",  keywords: ["audio","ogg"] },         // turn1search0
  { id: 80498175, url: "https://hostmaster.vermilion.place/inscription/80498175", mime: "audio/mpeg", keywords: ["audio","mp3","song"] }, // turn1search5
  { id: 72981580, url: "https://hostmaster.vermilion.place/inscription/72981580", mime: "audio/mpeg", keywords: ["audio","mp3"] },        // turn1search8
  { id: 70792573, url: "https://www.vermilion.place/inscription/70792573",   mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn1search11
  { id: 70795086, url: "https://www.vermilion.place/inscription/70795086",   mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search1
  { id: 63427680, url: "https://vermilion.place/inscription/63427680",       mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search6
  { id: 63427824, url: "https://www.vermilion.place/inscription/63427824",   mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search3
  { id: 63427775, url: "https://vermilion.place/inscription/63427775",       mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search5
  { id: 63350994, url: "https://www.vermilion.place/inscription/63350994",   mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search4
  { id: 33969371, url: "https://vermilion.place/inscription/33969371",       mime: "audio/mpeg", keywords: ["audio","mp3"] },             // turn4search2

  // === INSTRUMENT / MUSIC IMAGES ===========================================
  { id: 7521274,  url: "https://www.vermilion.place/inscription/7521274",    mime: "image/png",  keywords: ["image","guitar","pixel-art"] }, // turn5search0
  { id: 6934245,  url: "https://www.vermilion.place/inscription/6934245",    mime: "image/png",  keywords: ["image","guitar"] },             // turn1search15
  { id: 11868950, url: "https://vermilion.place/inscription/11868950",       mime: "image/webp", keywords: ["image","guitar"] },             // turn5search4
  { id: 9946203,  url: "https://www.vermilion.place/inscription/9946203",    mime: "image/png",  keywords: ["image","guitar"] },             // turn5search8
  { id: 67960553, url: "https://vermilion.place/inscription/67960553",       mime: "text/html",  keywords: ["sax"] },                        // turn5search3
turn1search13

  // === COLLECTION-LEVEL ENTRIES ============================================
  { id: "btcmusicpunks",   url: "https://www.vermilion.place/collection/btcmusicpunks",   mime: "collection", keywords: ["punk","music"] },  // turn0search3
  { id: "freedom-to-transact", url: "https://hostmaster.vermilion.place/collection/freedom-to-transact", mime: "collection", keywords: ["music","recursive"] }, // turn0search14
  { id: "ilovecheese",     url: "https://hostmaster.vermilion.place/collection/ilovecheese", mime: "collection", keywords: ["visual-album"] }, // turn6search0

  // …(add more rows as you discover new material)…
];



const musicVisualOrdinals = [
  // Themed collections
  "https://hostmaster.vermilion.place/collection/btcmusicpunks",      // Bitcoin Music Punks :contentReference[oaicite:0]{index=0}
  "https://hostmaster.vermilion.place/collection/freedom-to-transact", // Recursive music-track drop “FREEDOM” :contentReference[oaicite:1]{index=1}
  "https://hostmaster.vermilion.place/collection/ilovecheese",         // 231-piece recursive music visual-album :contentReference[oaicite:2]{index=2}

  // Individual inscriptions (images or audio previews)
  "https://www.vermilion.place/inscription/6934292",  // PNG – guitar-themed pixel art :contentReference[oaicite:5]{index=5}
  "https://www.vermilion.place/inscription/7060432",  // PNG – guitar icon variant :contentReference[oaicite:6]{index=6}
  "https://www.vermilion.place/inscription/6915677",  // PNG – synth/amp illustration :contentReference[oaicite:7]{index=7}
  "https://www.vermilion.place/inscription/71064438", // OGG – on-chain audio sample :contentReference[oaicite:8]{index=8}
  "https://vermilion.place/inscription/63427680",     // MP3 – on-chain track clip :contentReference[oaicite:9]{index=9}
  "https://www.vermilion.place/inscription/70792573", // MP3 – sound-loop snippet :contentReference[oaicite:10]{index=10}
  "https://vermilion.place/inscription/63634933"      // tiny MIDI/OGG instrument test :contentReference[oaicite:11]{index=11}
];



<!-- const visuals = [
  "https://hostmaster.vermilion.place/collection/btcmusicpunks",         // Bitcoin Music Punks :contentReference[oaicite:0]{index=0}
  "https://hostmaster.vermilion.place/collection/freedom-to-transact",    // FREEDOM :contentReference[oaicite:1]{index=1}
  "https://hostmaster.vermilion.place/collection/ilovecheese",           // I Love Cheese :contentReference[oaicite:2]{index=2}
  "https://hostmaster.vermilion.place/collection/symphonies",            // Symphonies by EP :contentReference[oaicite:3]{index=3} 
  "https://hostmaster.vermilion.place/collection/dank",                  // Dank :contentReference[oaicite:4]{index=4} - Pretty cool art with indie rock samples - compressed
  "https://hostmaster.vermilion.place/content/bc3c3d715c6c1412fc8e33c26017afeb86b191d0f8613c9d48e2e3650da969b5i1", // Arrangements :contentReference[oaicite:5]{index=5} - Kind of cool - poen with written visual
  "https://hostmaster.vermilion.place/collection/pulseforms"             // Pulseforms by Murat Atimtay :contentReference[oaicite:6]{index=6}
]; - Super Cool - These will work really well in the HUD -->

const visuals = [
  {
    url: "https://hostmaster.vermilion.place/collection/btcmusicpunks",      
    title: "Bitcoin Music Punks",                                            
    keywords: [
      "pixel art", "music celebrities", "NFT", "blockchain", 
      "retro", "8-bit", "experimental"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/symphonies",         
    title: "Symphonies by EP",                                               
    keywords: [
      "classical", "Beethoven", "orchestral", "generative", 
      "audio-visual", "blockchain", "minimalist"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/freedom-to-transact",
    title: "FREEDOM",                                                        
    keywords: [
      "electronic", "ambient", "recursive composition", 
      "Bitcoin", "experimental", "abstract"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/ilovecheese",        
    title: "I Love Cheese",                                                   
    keywords: [
      "indie", "looping melody", "recursive music", "visual album", 
      "playful", "surreal"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/dank",               
    title: "Dank",                                                         
    keywords: [
      "hip-hop", "vibes", "street art", "collage", 
      "grunge", "psychedelic"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/egg333",             
    title: "Runedragons (BRC333 Audio PFP)",                                 
    keywords: [
      "generative NFT", "dragon", "evolving art", "audio PFP", 
      "dynamic", "fantasy"
    ]
  },
  {
    url: "https://hostmaster.vermilion.place/collection/pulseforms",         
    title: "Pulseforms by Murat Atimtay",                                     
    keywords: [
      "data-driven", "generative art", "audio-reactive", 
      "evolving", "abstract", "blockchain"
    ]
  }
];



These two pieces showcase how Vermilion is experimenting with "recursive music ordinals"—generating audiovisual experiences tied to Bitcoin ordinals and enhanced with pioneering tech like Audionals
[
  {
    "title": "TRUTH → FREEDOM",
    "url": "https://hostmaster.vermilion.place/collection/freedom-to-transact",
    "description": "The second song from the genesis collection of recursive music ordinals."
  },
  {
    "title": "I Love Cheese",
    "url": "https://hostmaster.vermilion.place/collection/ilovecheese",
    "description": "The 3rd song from the recursive music visual album by melophonic and SQYZY using Audionals technology."
  }
]


[

  {
    "title": "MNCHRMS",
    "url": "https://hostmaster.vermilion.place/collection/mnchrms",
    "description": "“Monochromes” PFP collection on Bitcoin Ordinals—an exploration of black‑and‑white visuals in an audio context."
  },
  {
    "title": "dyles by dyle",
    "url": "https://hostmaster.vermilion.place/collection/dyles",
    "description": "An evolving ordinals collection by visual artist dyle—daily new pieces forming an infinite audiovisual loop."
  },
  {
    "title": "Bitcoin Trail: A Proof of Work Western",
    "url": "https://hostmaster.vermilion.place/collection/bitcoin_trail",
    "description": "A visual‑metaphor collection blending Bitcoin‑centric art with cinematic, audio‑inspired Western themes."
  },
  {
    "title": "Anonymous ₿itcoin Club Vol. 2",
    "url": "https://hostmaster.vermilion.place/collection/abcv2",
    "description": "A bold audiovisual series honoring the roots of ordinals, carrying strong symbolic visuals and thematic sound resonance."
  }
]





**1. From Satoshi to “Ordinal Theory”**
Though the idea of ordering individual satoshis dates all the way back to Bitcoin’s genesis block in 2009, it wasn’t formalized until Casey Rodarmor published the Ordinals specification in early 2022. Rodarmor points out that, in one sense, “ordinals were created by Satoshi Nakamoto in 2009 when he mined the Bitcoin genesis block,” but that the modern protocol—complete with a numbering algorithm for tracking sats—only coalesced with his work two years ago ([rodarmor.com][1]).

**2. Building the Tooling and Protocol**
Following the spec, Rodarmor released `ord`—the open-source implementation driving Ordinals, Inscriptions, and related protocols (like Runes). This tooling underpins the entire Ordinals ecosystem, from numbering sats to embedding arbitrary content on-chain, and has since been stewarded by the non-profit Open Ordinals Institute ([rodarmor.com][2]).

**3. The Genesis Inscription: Skull #0**
On December 14, 2022, Rodarmor made history by inscribing a simple pixel-art skull as the very first Ordinal, assigning it inscription number 0. Dubbed the “Genesis Ordinal,” this act proved that any data—art, text, even tiny programs—could live immutably on Bitcoin ([Medium][3], [TechCrunch][4]).

**4. “Cursed” and Negative-Number Inscriptions**
Almost immediately, some inscriptions used unusual opcode patterns or multi-inscription transactions that the initial `ord` software couldn’t index. To accommodate these “cursed” artifacts, the team began assigning them negative numbers (–1, –2, and so on) so collectors could still reference and trade them ([xverse.app][5], [GitHub][6]).

**5. Early Collections and Milestones**
January 21, 2023 saw the launch of Bitcoin Shrooms—the first Ordinals collection—followed by record-breaking 4 MB inscriptions like Taproot Wizards on February 2. By early March, BRC-20 tokens brought fungible-token experimentation to the chain, and by April the network had eclipsed one million inscriptions ([Medium][3]).

**6. From Proof-of-Concept to Ecosystem**
Since that explosive start, Ordinals has grown into a diverse ecosystem: on-chain art galleries, interactive DAWs (like Audionals), token launchpads, gaming assets, and more. What began as a simple numbering lens on sats has become a foundation for NFTs, music, and programmable digital artifacts—each inscription a permanent, on-chain chapter in Bitcoin’s unfolding story.


[
  {
    url: "https://ordinals.com/content/0",
    comment: "💀 **Genesis Inscription – Skull #0** – the very first Ordinal inscribed on December 14, 2022, proving that any data (art, text, code) could live immutably on Bitcoin (narrative: “The Genesis Inscription: Skull #0”)." :contentReference[oaicite:0]{index=0}
  },
  {
    url: "https://ordinals.com/content/-248292",
    comment: "🔮 **Cursed Inscription #–1** – an example of a ‘cursed’ artifact assigned a negative number when unrecognized by the original Ord software, illustrating the ‘Cursed and Negative-Number Inscriptions’ phase (narrative: “assign them negative numbers starting from –1”)." :contentReference[oaicite:1]{index=1}
  },
  {
    url: "https://ordinals.com/content/19",
    comment: "🍄 **Bitcoin Shrooms #19** – one of the first Ordinals collection pieces launched January 21, 2023, marking the debut of curated art series on-chain (narrative: “launch of Bitcoin Shrooms—the first Ordinals collection”)." :contentReference[oaicite:2]{index=2}
  },
  {
    url: "https://ordinals.com/content/148723",
    comment: "🧙 **Taproot Wizards #148723** – a record-breaking 3.94 MB inscription from February 2, 2023, demonstrating the capacity for large, complex art on Bitcoin (narrative: “record-breaking 4 MB inscriptions like Taproot Wizards”)." :contentReference[oaicite:3]{index=3}
  },
  {
    url: "https://ordinals.com/content/495549",
    comment: "🧪 **BRC-20 Token Inscription** – an early fungible-token experiment inscribed in March 2023, exemplifying the arrival of BRC-20 tokens and the expansion beyond pure art (narrative: “By early March, BRC-20 tokens brought fungible-token experimentation”)." :contentReference[oaicite:4]{index=4}
  }
]

[
  "https://ordinals.com/content/0i0",  
  // *Demonstrates* the **Genesis Inscription: Skull #0**, the very first Ordinal created by Casey Rodarmor on December 14, 2022.  
  // *Pair with:* “On December 14, 2022, Rodarmor made history by inscribing a simple pixel-art skull as the very first Ordinal…” 

  "https://ordinals.com/content/-440378i0",  
  // *Demonstrates* the **“cursed” negative-number inscriptions**, showing how artifacts that the original tooling couldn’t index were assigned negative numbers (–1, –2, etc.).  
  // *Pair with:* “To accommodate these ‘cursed’ artifacts, the team began assigning them negative numbers (–1, –2, and so on)…”

  "https://ordinals.com/content/730i0",  
  // *Demonstrates* the **First Ordinals Collection: Bitcoin Shrooms**, launched January 21, 2023 as the first curated drop on-chain.  
  // *Pair with:* “January 21, 2023 saw the launch of Bitcoin Shrooms—the first Ordinals collection…”

  "https://ordinals.com/content/148723i0",  
  // *Demonstrates* the **Record-breaking 4 MB Inscription: Taproot Wizards**, minted February 2, 2023, illustrating how large art could live on L1.  
  // *Pair with:* “followed by record-breaking 4 MB inscriptions like Taproot Wizards on February 2.”

  "https://ordinals.com/content/495549i0",  
  // *Demonstrates* the **BRC-20 Token Explosion**, an early fungible-token experiment (e.g. ORDI) that took off in March 2023 on top of Ordinals.  
  // *Pair with:* “By early March, BRC-20 tokens brought fungible-token experimentation to the chain…”

  "https://ordinals.com/content/66912386i0"  
  // *Demonstrates* the **One Million Inscriptions Milestone**, showing an inscription created after the network crossed one million total entries in April 2023.  
  // *Pair with:* “By April the network had eclipsed one million inscriptions…”
]

[
  {
    "url": "https://ordinals.com/content/72285258i0",
    "comment": "Demonstrates Section 3: 'The Genesis Inscription: Skull #0.' Use this image as you describe: 'On December 14, 2022, Rodarmor made history by inscribing a simple pixel-art skull as the very first Ordinal, assigning it inscription number 0. Dubbed the “Genesis Ordinal,” this act proved that any data—art, text, even tiny programs—could live immutably on Bitcoin.'"
  },
  {
    "url": "https://ordinals.com/content/-75639i0",
    "comment": "Demonstrates Section 4: 'Cursed and Negative-Number Inscriptions.' Pair this with: 'To accommodate these “cursed” artifacts, the team began assigning them negative numbers (–1, –2, and so on) so collectors could still reference and trade them.'"
  },
  {
    "url": "https://ordinals.com/content/675i0",
    "comment": "Demonstrates Section 5: 'Early Collections and Milestones,' specifically the Shrooms collection. Use this with: 'January 21, 2023 saw the launch of Bitcoin Shrooms—the first Ordinals collection—followed by record-breaking 4 MB inscriptions like Taproot Wizards.'"
  },
  {
    "url": "https://ordinals.com/content/80607787i0",
    "comment": "Demonstrates the Taproot Wizards milestone in Section 5. Place this visual alongside: 'Taproot Wizards on February 2. By early March, BRC-20 tokens brought fungible-token experimentation to the chain, and by April the network had eclipsed one million inscriptions.'"
  },
  {
    "url": "https://ordinals.com/content/19i0",
    "comment": "Another early Bitcoin Shrooms, useful for Section 5: 'Early Collections and Milestones,' helping to visually reinforce the narrative of collectible variety and the boom in early Ordinals communities."
  }
]


const narrativeVisuals = [
  "https://ordinals.com/content/69914067i0",  // Pixel-art skull “Inscription 69,914,067” :contentReference[oaicite:0]{index=0}
  "https://ordinals.com/content/73997295i0",  // “skull violet” Inscription 73,997,295 :contentReference[oaicite:1]{index=1}
  "https://ordinals.com/content/80611885i0",  // Taproot Wizard #5464 (Inscription ID 0ed21…d64i0) :contentReference[oaicite:2]{index=2}
  "https://ordinals.com/content/756i0",       // Bitcoin Shroom #145 (Inscription 756) :contentReference[oaicite:3]{index=3}
  "https://ordinals.com/content/917i0",       // Bitcoin Shroom #195 (Inscription 917) :contentReference[oaicite:4]{index=4}
  "https://ordinals.com/content/725i0",       // Bitcoin Shroom #177 (Inscription 725) :contentReference[oaicite:5]{index=5}
  "https://ordinals.com/content/884i0",       // Bitcoin Shroom #97 (Inscription 884) :contentReference[oaicite:6]{index=6}
  "https://ordinals.com/content/80613300i0"   // Taproot Wizard #1719 (Inscription ID 7915a…b92i0) :contentReference[oaicite:7]{index=7}
];


