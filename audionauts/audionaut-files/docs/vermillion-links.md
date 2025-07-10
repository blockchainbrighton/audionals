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




