/**
 * Asset Library for B.A.M. HUD Programmer
 * 
 * This module contains a structured list of media assets, parsed from the provided
 * list of Ordinals inscriptions. It is designed to be imported into the main
 * application to facilitate the programmatic generation of complex playlists.
 * 
 * The library is split into two main exports:
 * 1. assetLibrary: Contains all directly renderable media (images, videos, etc.).
 * 2. recursiveOrComplexLinks: Contains links to interactive or complex HTML/JS
 *    applications that are not suitable for direct HUD layer rendering.
 */

/**
 * Asset Library for B.A.M. HUD Programmer v2.0
 * 
 * Enhanced with a `commentary` array for each asset, providing multiple lines
 * of selectable, thematic context for dynamic playlist generation.
 */

// --- Primary Library of Usable Assets ---
export const assetLibrary = [
    // == Audionals & B.A.M. Logos ==
    {
      id: 'audional_logo_common',
      name: 'Original Audionals Inscription',
      collection: 'Audionals',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/40136786a9eb1020c87f54c63de1505285ec371ff35757b44d2cc57dbd932f22i0',
      commentary: [
        "Audionals are a standard for inscribing audio & other filetypes on Bitcoin.",
        "This project pioneered generative and interactive audio on the Bitcoin blockchain.",
        "The format supports composing complex scenes from on-chain data.",
      ]
    },
    {
      id: 'audional_logo_ai_ultrarare',
      name: 'AI Original Audionals Inscription',
      collection: 'Audionals',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/129ffaa02e85dea60fed32b84cd31436ccba1ff5b534fcb0b4efdddd2a0ddd05i0',
      commentary: [
        "A unique fusion of human prompting and artificial creativity, secured on-chain.",
        "Represents the intersection of the AI art movement and blockchain immutability.",
        "This is the sole AI-generated original logo in the entire collection.",
      ]
    },
    {
      id: 'bam_logo_common',
      name: 'B.A.M. Logo',
      collection: 'B.A.M. Assets',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/09b4bbb0337af857d9afa934205fb820bb704596a00f2e7f5bb37195853eee32i0',
      commentary: [
        "B.A.M. stands for Bridging Audionals & Multimedia.",
        "This logo powers the HUD you are currently viewing.",
        "An emblem for the Audionaut exploration and curation initiative.",
      ]
    },
  
    // == Miscellaneous Badges ==
    {
      id: 'basedbtc_ob1_rare',
      name: 'Based.btc OB1',
      collection: 'BNS Names',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/e716f0e3832dbdd818f2291ad8cb0395f3bbec4f5ba762c05108a719842c9f6di0',
      commentary: [
        "The '.btc' namespace is part of the BNS (Bitcoin Name System).",
        "OB1 may be a reference to 'Ordinal-Based 1' or a nod to Star Wars.",
        "On-chain names provide decentralized identity and branding.",
      ]
    },
    {
      id: 'vikings_common',
      name: 'Vikings',
      collection: 'Misc Badges',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/3a504956f370c0362e48f7a1daf53d51c250c3c0d2054eb0b018d60caad0be77i0',
      commentary: [
        "A nod to early cypherpunks and digital pioneers, the 'Vikings' of cyberspace.",
        "Norse-inspired art finds a new, immutable home on the blockchain.",
      ]
    },
  
    // == Nat Atlas Collection ==
    {
      id: 'natatlas_1_rare',
      name: 'Nat Atlas 1',
      collection: 'Nat Atlas',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/515cfa9ca12ff4968b7f9b73cefdba1410ef6fcbf76868559c8b1b77ad13f497i0',
      commentary: [
        "The 'Nat Atlas' collection suggests the mapping of new digital territories.",
        "An explorer's badge for the Ordinals frontier.",
        "Artist: Natalka, exploring themes of digital cartography.",
      ]
    },
    {
      id: 'natatlas_2_rare',
      name: 'Nat Atlas 2',
      collection: 'Nat Atlas',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/16e4d2fae0ff944bb29a56f1c35ba5187207c4ada96d5b9c8f6cf3a1f618fb1di0',
      commentary: [
        "Each piece in the collection charts a different aspect of the on-chain world.",
        "A visual representation of navigating the data streams of Bitcoin.",
      ]
    },
  
    // == THIS IS #1 Collection ==
    ...[
      { id: 'thisis1_channel1_ultrarare', name: 'Channel #1', url: '726fd43250acf6543273eab0e8a52db8df969af672107297f03b866424d8b0f4i0'},
      { id: 'thisis1_numberone_ultrarare', name: 'This Is Number One', url: '8d3c82c15a662cfe4b998e45bf8c71c00f16d532c5d4c546f59802e6f7730f3ei0'},
      { id: 'thisis1_smiley_ultrarare', name: 'Number One Smiley', url: '0668de6cd3f66acc85063026232fa7c6da01666aeb6fec965d5c34ca093fda49i0'},
      { id: 'thisis1_nowisnotenough_ultrarare', name: 'Now Is Not Enough', url: 'cc8b85b8984cd30a9e26c755e766bca8ce1a25fdefb813bc0fb2eb411fb67a0bi0'},
      { id: 'thisis1_mine_ultrarare', name: 'Mine', url: 'f6cd2ba6f2f2e95c818cfb9f613ac5b246473d430de8a48e99686210ca9ef21fi0'}
    ].map(item => ({
      ...item,
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      commentary: [
        "A collection celebrating primacy and the concept of being 'first'.",
        "Inscribed early in Ordinals history, capturing a moment in time.",
        "The artist makes a bold statement on digital ownership and uniqueness.",
      ]
    })),
  
    // == Hash Ones Collection ==
    ...[
      { name: 'Hash One #92', url: 'fba6c1abe4c6d7e8f654da1fe6550e4110c6c3b5c4899cb91ad9ef88dbed96eci0', note: "The number 92 is a 'pronic number', a product of two consecutive integers (8 * 9 would be 72)." },
      { name: 'Hash One #93', url: '020d36560a95677d12845ade78c5ea59a3903d8c3e14953f407fb12f229be71bi0', note: "The collection explores the aesthetics of raw data and unique identifiers." },
      { name: 'Hash One #94', url: '88f7e4621dcaa8207f6eb39791001afe2fee2ede36c9f2372705b813002a5530i0', note: "Hashing is a cornerstone of Bitcoin's security and proof-of-work." },
      { name: 'Hash One #95', url: 'f3dc74d01e07d6a88cf30fc1a6acf53d3f73517b3861a8949fa50f6114dc1bfai0', note: "Bitcoin uses the SHA-256 hash algorithm, which produces a 256-bit hash." },
      { name: 'Hash One #96', url: '542faa1be5014212bdf57a7afd41eb878dfcc4332a3718f23e7d1d8604f0c7c2i0', note: "Each piece is tied to a unique number, a digital fingerprint." },
      { name: 'Hash One #97', url: '8a312ad605ce2a15d59f7714e3b7b0fe77ca1aeaa8b68376569ccf2bf2105f5ci0', note: "97 is a prime number, only divisible by 1 and itself." },
      { name: 'Hash One #98', url: 'd5243217dd0a214ed7dd17b71d35bdc68fae854a191dfcf740a32aa5a7880610i0', note: "The chance of two different inputs producing the same SHA-256 hash is practically zero." },
      { name: 'Hash One #99', url: 'f7ed8da190670f462b7e1193a228c5daf07cddd89103d72a7d1ca3adcc05c62bi0', note: "In base 10, 99 is a Kaprekar number." },
      { name: 'Hash One #100', url: 'ad77943f52877acac2a08410ac41f5ae1e56d4ccb2b82c1accf4ef1cb7038c1fi0', note: "100 is the square of 10, representing a perfect whole." },
      { name: 'Hash One #101', url: 'e2c683f6ec6c0b71808b05527a136627c49cd996ae3fd5970d18329ee28a56a8i0', note: "101 is a palindromic prime number, reading the same forwards and backwards." },
    ].map(item => ({
      id: `hashone_${item.name.split(' ')[2].substring(1)}`,
      name: item.name,
      collection: 'Hash Ones',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      commentary: [
        item.note,
        "This series questions the nature of identity in a digital world.",
        "Each inscription is a 1-of-1, representing a unique point in the number space.",
      ]
    })),
  
    // == Sqyzy Collection ==
    ...[
      { name: 'Sqyzy I', url: 'bfd05a40892d872c033994d2375c6382eb90789db6739a7b18f7246a396f5a3di0' },
      { name: 'Sqyzy II', url: '5a2b8214a9411c62bed0acb1f1f0b296bf049da181178120311520f25254c365i0' },
      { name: 'Sqyzy III', url: 'fe22987aae2d261c1848c0e69f571ad605aa5f1f7e03ab8ae460436919da837ai0' },
      { name: 'Sqyzy IV', url: 'a3e850c3070f255d08b86b334000e35bb2af101c61e0a871d1e6a1b9c41a5322i0' },
      { name: 'Sqyzy X', url: '35349fc8e0badad460b6d7125fe2f833dcbec129a8064c9d7cd5e64172274325i0' },
    ].map(item => ({
      id: `sqyzy_${item.name.split(' ')[1].toLowerCase()}`,
      name: item.name,
      collection: 'Sqyzy',
      rarity: 'RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      commentary: [
        "By artist Sqyzy, known for their distinct abstract and minimalist style.",
        "These works explore form and color in a constrained digital medium.",
        "Sqyzy was an early adopter of Ordinals for artistic expression.",
      ]
    })),
  
    // == PUNX Collection ==
    {
      id: 'punx_logo_hires_video',
      name: 'PUNX LOGO HI-RES',
      collection: 'PUNX',
      rarity: 'RARE',
      type: 'video',
      url: 'https://ordinals.com/content/c2beb99dbc32188e56ea2ca3750c99a6ce9145892678473b51802ce680cb5f16i0',
      commentary: [
        "A direct homage to CryptoPunks, re-contextualized on Bitcoin.",
        "Examines the migration of cultural symbols across different blockchains.",
        "This video format provides a high-resolution, dynamic version of the iconic theme.",
      ]
    },
    {
      id: 'punx_1_gif',
      name: 'PUNX #1',
      collection: 'PUNX',
      rarity: 'RARE',
      type: 'gif',
      url: 'https://ordinals.com/content/4e38c53382a55659ef518fe9385f807fc5b827fe99f0854ff0d2a22a0a78b175i0',
      commentary: [
        "The pixel art style is a deliberate nod to the OG NFT movement on Ethereum.",
        "This inscription asks the question: What is a 'punk' in the Bitcoin ecosystem?",
        "Punks on Bitcoin explore the idea of counter-culture on the original blockchain.",
      ]
    },
    
    // == Solemn Collection (AVIF) ==
    ...[
      { id: 'solemn_avif_1', name: 'Solemn 1', url: '2c762a593dc60bcd92169b07de5a60d588a94819d165178ca317d45e4eeb2b11i0'},
      { id: 'solemn_avif_2', name: 'Solemn 2', url: '3ff701e8197231883785902d1076ffa747b28f951a0dbe2445ba2690df134575i0'},
      { id: 'solemn_avif_3', name: 'Solemn 3', url: '810350843b5011b0cd78ebf2134fb7df751f584d1c5eeaf578d214adb020b329i0'},
      { id: 'solemn_avif_4', name: 'Solemn 4', url: '566ac7f4fe8cc5e41513f2e15aa376eb77d0883dc211a64f249e5145746957b0i0'},
    ].map(item => ({
      ...item,
      collection: 'Solemn',
      rarity: 'RARE',
      type: 'avif',
      url: `https://ordinals.com/content/${item.url}`,
      commentary: [
        "The 'Solemn' series evokes a mood of introspection and digital melancholy.",
        "Utilizes the AVIF format for high-quality images with small file sizes.",
        "AVIF offers superior compression compared to JPEG and even WEBP for on-chain art.",
      ]
    })),
  
    // == Usable HTML and Text Files ==
    {
      id: 'bot_1t5_html',
      name: 'Bot 1T5',
      collection: 'HTML Content',
      rarity: 'COMMON',
      type: 'html',
      url: 'https://ordinals.com/content/1c3361ebbb51e87d41ca155866cb6b3795999a80c636aa447690f31ea657f0abi0',
      commentary: [
        "This is a fully self-contained, non-recursive HTML webpage.",
        "Inscribing code immortalizes functionality, not just an image.",
        "A digital artifact preserved with its logic intact.",
      ]
    },
    {
      id: 'text_jim_bit',
      name: 'jim.bit',
      collection: 'BNS Names',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/96cfd02e2ec9123e5767a8092a863e8779b5083921c612f48fd5c817cab72360i0',
      commentary: [
        "A simple '.bit' text inscription, claiming a namespace on Bitcoin.",
        "Inscribing raw text is one of the purest forms of on-chain data.",
        "The content is the name itself, a decentralized identity marker.",
      ]
    },
  ];
  
  
  // --- Library of Recursive or Complex Links (Not for direct use in HUD layers) ---
  export const recursiveOrComplexLinks = [
    {
      name: 'Solemn with Sound',
      url: 'https://ordinals.com/content/7e9b5d9d0a202a53a9ab9d22381ee442567f7dfe44f8b8dbaaccd027827e9a20i0',
      reason: 'JavaScript Application'
    },
    {
      name: 'I Love Cheese Player',
      url: 'https://ordinals.com/content/38c24932ff414e5dd03b728338243389ea80edfcd19dd7430950630f2622f5ffi0',
      reason: 'Recursive HTML'
    },
    {
      name: 'Audionals Pump Player',
      url: 'https://ordinals.com/content/20c939e91ac29bff0d96ecb1f567beb25a6ee80462c5a6927cd2acae8cb41fedi0',
      reason: 'Recursive HTML'
    },
    {
      name: 'Chordinal #1',
      url: 'https://ordinals.com/content/aa43e0a7d229f460c6f9310e938ae8ec50a26f5b09df1f6d801d9e8a8741afc3i0',
      reason: 'JavaScript/Audio Application'
    },
    {
      name: 'First "Audinal"',
      url: 'https://ordinals.com/inscription/7d058415fb8b6d35fddd375208648254bcb0e4e470b4b25da3dac32d8b04b935i0',
      reason: 'JavaScript/Audio Application'
    },
    {
      name: '2nd Basic Sequencer',
      url: 'https://ordinals.com/inscription/09e0b0c471a6a89c1385c67016e5e6a97f6a6df38207c2d79da67cadf0774368i0',
      reason: 'JavaScript/Audio Application'
    },
    {
      name: 'First Synth',
      url: 'https://ordinals.com/content/598a448d0e134e90855e6fba03d7b2e2610423f185ba513d3c1a8022a9d0d591i0',
      reason: 'JavaScript/Audio Application'
    },
    {
      name: 'First Audional Song (Old Engine)',
      url: 'https://ordinals.com/content/cea4d582a419e6c7561af335ed08b6b47384d6f2c25d0f682c3019c7f2a305e4i0',
      reason: 'Recursive HTML/JS'
    },
    {
      name: 'Original Audional Sequencer',
      url: 'https://ordinals.com/content/ade52434daf0667a061da2307b74ab7c217b46b1e8bc0d8d649c35b203ee16d6i0',
      reason: 'Recursive HTML/JS Application'
    },
    {
      name: 'Infinite Ordinal Remix',
      url: 'https://ordinals.com/inscription/a5e9d3fe0cb8e3378e478b2c2ae1f222d01536f069ce4d42ac2c9b7989b74a75i0',
      reason: 'Recursive HTML/JS Application'
    },
    {
      name: 'New Engine Song (Generative Visualiser)',
      url: 'https://ordinals.com/content/a449a3401142ce6118e13106dcaf61b7d17fb3cfadf26a5079154f9cca1862b7i0',
      reason: 'JavaScript Application'
    },
    {
      name: 'First Opus Test',
      url: 'https://ordinals.com/inscription/8e00109f37672c8d9b75becdc6135c751a1be0189cc6e836f7637c2642480ea3i0',
      reason: 'Opus Audio File - requires specific handling'
    },
    {
      name: 'Counterfeit Culture',
      url: 'https://ordinals.com/content/4c855ca90eec57477c89259b19a12c28b29085be9595d2748e672e7a23ecf629i0',
      reason: 'JavaScript Application'
    },
    {
      name: 'Pandemonium',
      url: 'https://ordinals.com/content/b1d64a7b6d48efc0bb40e17ee4cbe0e5a66731b0309c4b50d56d394bcd53a3f0i462',
      reason: 'Recursive HTML'
    },
    {
      name: 'ZEROTH? Flowers',
      url: 'https://ordinals.com/content/b3c391c8ee203d906e3c361b35877dd5f0c52a177779552dca1a5fbb58da3098i903',
      reason: 'Recursive HTML'
    },
    {
      name: 'Free Ross',
      url: 'https://ordinals.com/content/449bf49f5b7b62e547c6f914badf9e20d5d035897194520d432b7dd5069ee569i0',
      reason: 'Recursive HTML'
    },
  ];