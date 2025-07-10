/**
 * B.A.M. Asset Library v2.0
 * 
 * Contains a structured list of media assets with enriched, multi-choice metadata.
 * This library is the knowledge base for the HUD's educational showcases.
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
        "Fact: Audionals are a standard for inscribing audio & other filetypes on Bitcoin.",
        "History: This project pioneered generative and interactive audio on the Bitcoin blockchain.",
        "Tech: The format supports composing complex scenes from on-chain data.",
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
        "Concept: A unique fusion of human prompting and artificial creativity, secured on-chain.",
        "Movement: Represents the intersection of the AI art movement and blockchain immutability.",
        "Rarity: This is the sole AI-generated original logo in the entire collection.",
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
        "Acronym: B.A.M. can stand for Bridging Audionals & Multimedia or Bitcoin Audional Machine.",
        "Fact: This logo powers the very HUD you are currently viewing.",
        "Mission: An emblem for the Audionaut exploration and curation initiative.",
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
        "Tech: The '.btc' namespace is part of BNS (Bitcoin Name System) on the Stacks L2.",
        "Lore: OB1 may be a reference to 'Ordinal-Based 1' or a nod to Star Wars' Obi-Wan.",
        "Concept: On-chain names provide censorship-resistant, decentralized identity.",
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
        "Culture: A nod to early cypherpunks, the 'Vikings' of cyberspace and bear markets.",
        "Theme: Norse-inspired art finds a new, immutable home on the Bitcoin blockchain.",
      ]
    },
  
    // == Nat Atlas Collection ==
    ...[
        { id: 'natatlas_1_rare', name: 'Nat Atlas 1', url: '515cfa9ca12ff4968b7f9b73cefdba1410ef6fcbf76868559c8b1b77ad13f497i0' },
        { id: 'natatlas_2_rare', name: 'Nat Atlas 2', url: '16e4d2fae0ff944bb29a56f1c35ba5187207c4ada96d5b9c8f6cf3a1f618fb1di0' },
    ].map(item => ({
        ...item, collection: 'Nat Atlas', rarity: 'RARE', type: 'image', url: `https://ordinals.com/content/${item.url}`,
        commentary: [
            "Concept: The 'Nat Atlas' collection suggests the mapping of new digital territories.",
            "Theme: An explorer's badge for the burgeoning Ordinals frontier.",
            "Artist: Natalka, exploring themes of digital cartography and on-chain geography.",
            "Metaphor: A visual representation of navigating the complex data streams of Bitcoin."
        ]
    })),
    
    // == Hash Ones Collection ==
    ...[
      { name: '#92', url: 'fba6c1abe4c6d7e8f654da1fe6550e4110c6c3b5c4899cb91ad9ef88dbed96eci0', fact: "The number 92 is a 'pronic number' - a product of two consecutive integers (8*9 is 72, 9*10=90)." },
      { name: '#93', url: '020d36560a95677d12845ade78c5ea59a3903d8c3e14953f407fb12f229be71bi0', fact: "The atomic number of Neptunium is 93, a rare transuranic element." },
      { name: '#94', url: '88f7e4621dcaa8207f6eb39791001afe2fee2ede36c9f2372705b813002a5530i0', fact: "The atomic number of Plutonium is 94, famously used in nuclear applications." },
      { name: '#97', url: '8a312ad605ce2a15d59f7714e3b7b0fe77ca1aeaa8b68376569ccf2bf2105f5ci0', fact: "97 is a prime number, only divisible by 1 and itself, reflecting true uniqueness." },
      { name: '#100', url: 'ad77943f52877acac2a08410ac41f5ae1e56d4ccb2b82c1accf4ef1cb7038c1fi0', fact: "The number 100 is the square of 10, often representing a perfect whole or a full century." },
      { name: '#101', url: 'e2c683f6ec6c0b71808b05527a136627c49cd996ae3fd5970d18329ee28a56a8i0', fact: "101 is a palindromic prime number, reading the same forwards and backwards." },
    ].map(item => ({
      id: `hashone_${item.name.substring(1)}`,
      name: `Hash One ${item.name}`,
      collection: 'Hash Ones',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      commentary: [
        item.fact,
        "Tech: Bitcoin uses the SHA-256 hash algorithm, which produces a 256-bit hash.",
        "Concept: This collection explores the aesthetics of raw data and unique identifiers.",
        "Uniqueness: The chance of two different inputs producing the same SHA-256 hash is practically zero."
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
        "Homage: A direct tribute to CryptoPunks, re-contextualized on Bitcoin's native layer.",
        "History: Examines the migration of cultural symbols across different blockchains.",
        "Format: This video provides a high-resolution, dynamic version of the iconic theme.",
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
        "Aesthetic: The pixel art style is a deliberate nod to the OG NFT movement on Ethereum.",
        "Question: This inscription asks: What does 'punk' mean in the Bitcoin ecosystem?",
        "Movement: Punks on Bitcoin explore the idea of counter-culture on the original blockchain.",
      ]
    },
  ];
  
  
  // --- Library of Recursive or Complex Links (Not for direct use in HUD layers) ---
  export const recursiveOrComplexLinks = [
      { name: 'Solemn with Sound', url: 'https://ordinals.com/content/7e9b5d9d0a202a53a9ab9d22381ee442567f7dfe44f8b8dbaaccd027827e9a20i0', reason: 'JavaScript Application' },
      { name: 'I Love Cheese Player', url: 'https://ordinals.com/content/38c24932ff414e5dd03b728338243389ea80edfcd19dd7430950630f2622f5ffi0', reason: 'Recursive HTML' },
      { name: 'Original Audional Sequencer', url: 'https://ordinals.com/content/ade52434daf0667a061da2307b74ab7c217b46b1e8bc0d8d649c35b203ee16d6i0', reason: 'Recursive HTML/JS Application' },
  ];