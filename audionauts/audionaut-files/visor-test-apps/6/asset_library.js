/**
 * B.A.M. Asset Library
 *
 * This module exports structured data for all media assets.
 * This separation keeps the main application logic clean and makes
 * the asset database easy to manage and expand.
 */

// =======================================================
// STANDARD MEDIA ASSETS
// A comprehensive, queryable list of all standard media assets.
// This is the primary array used by the playlist generator.
// =======================================================
export const MEDIA_ASSETS = [
    // --- Audionals Collection ---
    { name: "Original Audionals Inscription", url: "https://ordinals.com/content/40136786a9eb1020c87f54c63de1505285ec371ff35757b44d2cc57dbd932f22i0", type: 'image', collection: 'Audionals', rarity: 'Common', notes: '', fact: 'One of the earliest examples of the Audionals project, setting the stage for on-chain audio synthesis on Bitcoin.' },
    { name: "Original Audionals - AI Original", url: "https://ordinals.com/content/129ffaa02e85dea60fed32b84cd31436ccba1ff5b534fcb0b4efdddd2a0ddd05i0", type: 'image', collection: 'Audionals', rarity: 'Ultra Rare', notes: 'Only one in whole collection', fact: 'This Ultra Rare piece is a unique AI-generated artwork, showcasing the fusion of generative art and blockchain technology.' },
    { name: "3rd Party Audionals Logo", url: "https://ordinals.com/content/72389b804f1f673caf52fea6e8f0733058b5605c879bea1938aa680f67fbe141i0", type: 'image', collection: 'Audionals', rarity: 'Rare', notes: '', fact: 'Community-created logos often play a vital role in building a brand\'s identity in decentralized ecosystems.' },
    // --- Standalone & Logos ---
    { name: "Based.btc OB1", url: "https://ordinals.com/content/e716f0e3832dbdd818f2291ad8cb0395f3bbec4f5ba762c05108a719842c9f6di0", type: 'image', collection: 'Based.btc', rarity: 'Rare', notes: '', fact: '.btc domains are part of the Stacks ecosystem, a Bitcoin Layer-2 for smart contracts. This asset links the two worlds.' },
    { name: "BAM LOGO", url: "https://ordinals.com/content/09b4bbb0337af857d9afa934205fb820bb704596a00f2e7f5bb37195853eee32i0", type: 'image', collection: 'Logos', rarity: 'Common', notes: '', fact: 'The official logo for the B.A.M. (Bitcoin Audional Machine) project, representing the core of this interactive experience.' },
    { name: "Hathaway Bitcoin Logo", url: "https://ordinals.com/content/a1491d4b9c780799f53cd93fe0e5cad4ece52e1e638dd74de44fe74514f00bcfi0", type: 'image', collection: 'Logos', rarity: 'Common', notes: '', fact: 'A community-recognized symbol associated with the Ordinals ecosystem, often used as a sign of authenticity or support.' },
    { name: "Vikings", url: "https://ordinals.com/content/3a504956f370c0362e48f7a1daf53d51c250c3c0d2054eb0b018d60caad0be77i0", type: 'image', collection: 'Misc', rarity: 'Common', notes: '', fact: 'The Viking meme represents hodlers who endure long bear markets, referencing their resilience and long-term vision.' },
    { name: "Nat Atlas 1", url: "https://ordinals.com/content/515cfa9ca12ff4968b7f9b73cefdba1410ef6fcbf76868559c8b1b77ad13f497i0", type: 'image', collection: 'Nat Atlas', rarity: 'Rare', notes: '', fact: 'Nat an early Bitcoin contributor with an inspirational story.' },
    { name: "Nat Atlas 2", url: "https://ordinals.com/content/16e4d2fae0ff944bb29a56f1c35ba5187207c4ada96d5b9c8f6cf3a1f618fb1di0", type: 'image', collection: 'Nat Atlas', rarity: 'Rare', notes: '', fact: 'The story is available in a blog.' },
    { name: "NarcotiX", url: "https://ordinals.com/content/17627f1b267798eb488206cacfb55089b1b268885c3f136d6265547cb71c5b72i0", type: 'image', collection: 'Misc', rarity: 'Common', notes: 'Once per timeline', fact: 'A distinct piece of artwork from an independent artist, contributing to the diversity of content on Bitcoin.' },
    // --- This is #1 Collection ---
    { name: "Channel #1", url: "https://ordinals.com/content/726fd43250acf6543273eab0e8a52db8df969af672107297f03b866424d8b0f4i0", type: 'image', collection: 'This is #1', rarity: 'Ultra Rare', notes: '#56330', fact: 'Part of the "This Is Number One" genesis collection, which celebrates the earliest inscription numbers and the concept of "firsts" on-chain.' },
    { name: "This Is Number One", url: "https://ordinals.com/content/8d3c82c15a662cfe4b998e45bf8c71c00f16d532c5d4c546f59802e6f7730f3ei0", type: 'image', collection: 'This is #1', rarity: 'Ultra Rare', notes: '#75140', fact: 'The title piece of its collection, representing the value placed on low inscription numbers and historical precedence.' },
    { name: "Number One Smiley", url: "https://ordinals.com/content/0668de6cd3f66acc85063026232fa7c6da01666aeb6fec965d5c34ca093fda49i0", type: 'image', collection: 'This is #1', rarity: 'Ultra Rare', notes: '#75141', fact: 'A classic smiley face, given permanent, ultra-rare status through its early inscription on the Bitcoin ledger.' },
    { name: "Now Is Not Enough", url: "https://ordinals.com/content/cc8b85b8984cd30a9e26c755e766bca8ce1a25fdefb813bc0fb2eb411fb67a0bi0", type: 'image', collection: 'This is #1', rarity: 'Ultra Rare', notes: '#75017', fact: 'This phrase captures the forward-looking and ambitious nature of early blockchain innovators and artists.' },
    { name: "Mine", url: "https://ordinals.com/content/f6cd2ba6f2f2e95c818cfb9f613ac5b246473d430de8a48e99686210ca9ef21fi0", type: 'image', collection: 'This is #1', rarity: 'Ultra Rare', notes: '#74963', fact: 'A simple, powerful declaration of ownership, made immutable on-chain. This represents the core concept of digital property rights.' },
    // --- Hash Ones Collection ---
    ...[
      {n: 92, i: 68263, h: "fba6c1abe4c6d7e8f654da1fe6550e4110c6c3b5c4899cb91ad9ef88dbed96ec"}, {n: 93, i: 72619, h: "020d36560a95677d12845ade78c5ea59a3903d8c3e14953f407fb12f229be71b"},
      {n: 94, i: 72621, h: "88f7e4621dcaa8207f6eb39791001afe2fee2ede36c9f2372705b813002a5530"}, {n: 95, i: 72640, h: "f3dc74d01e07d6a88cf30fc1a6acf53d3f73517b3861a8949fa50f6114dc1bfa"},
      {n: 96, i: 73968, h: "542faa1be5014212bdf57a7afd41eb878dfcc4332a3718f23e7d1d8604f0c7c2"}, {n: 97, i: 73959, h: "8a312ad605ce2a15d59f7714e3b7b0fe77ca1aeaa8b68376569ccf2bf2105f5c"},
      {n: 98, i: 73948, h: "d5243217dd0a214ed7dd17b71d35bdc68fae854a191dfcf740a32aa5a7880610"}, {n: 99, i: 73936, h: "f7ed8da190670f462b7e1193a228c5daf07cddd89103d72a7d1ca3adcc05c62b"},
      {n: 100, i: 73866, h: "ad77943f52877acac2a08410ac41f5ae1e56d4ccb2b82c1accf4ef1cb7038c1f"}, {n: 101, i: 73878, h: "e2c683f6ec6c0b71808b05527a136627c49cd996ae3fd5970d18329ee28a56a8"},
      {n: 102, i: 73935, h: "89f92c9916b542314781f821cacb670722f38e21f5994e9dce9f7c7e9926a520"}, {n: 103, i: 73956, h: "8816cdd828135675fdf5146a658823a9bae98a67da55a930483a1db21bf6c235"},
      {n: 104, i: 74570, h: "b0958c0c68430291c2f1b1fbd7c98624cb78991c03855a1319d4bf29c7cc2372"}, {n: 105, i: 74578, h: "c785aa38f6dd2461be35c63b7f1849b2d4caf027b1d05fa3986e515ea0130fc6"},
      {n: 106, i: 74566, h: "31281b871fb6e16df8f57aa734092fab82de62611a83c15c7cfe8e695559ad59"}, {n: 107, i: 74631, h: "425210e56972ba2adc1c05e980e5275eae1241c7a75a16f08e04bc464863bc74"},
      {n: 108, i: 74651, h: "3a270ee2ecdacf6d8bb8e62f285f3e3487fdfd028169fccc62d5ba0cbeab219c"}, {n: 109, i: 74643, h: "57cac42c8bbb018e3dbc066f23669422c655166a47ce72ccccc2dc0f5a63488e"},
      {n: 110, i: 74608, h: "777232a28c83a5ccf908fb6913c44b3f95405e8a7ec83358b3db330f30a7b435"}, {n: 111, i: 74569, h: "067982e5ea64a2a8d1f226318e4c0714e99a0e3e6114f9d1a0f4a4642dc7b871"}
    ].map(item => ({ name: `Hash One #${item.n}`, url: `https://ordinals.com/content/${item.h}i0`, type: 'image', collection: 'Hash Ones', rarity: 'Ultra Rare', notes: `#${item.i}`, fact: `'Hash Ones' are generative art where the visual output is derived from the transaction hash, making each piece verifiably unique.` })),
    // --- Sqyzy Collection ---
    ...[
      {n:"I",h:"bfd05a40892d872c033994d2375c6382eb90789db6739a7b18f7246a396f5a3d",i:130573},{n:"II",h:"5a2b8214a9411c62bed0acb1f1f0b296bf049da181178120311520f25254c365",i:130596},
      {n:"III",h:"fe22987aae2d261c1848c0e69f571ad605aa5f1f7e03ab8ae460436919da837a",i:130609},{n:"IV",h:"a3e850c3070f255d08b86b334000e35bb2af101c61e0a871d1e6a1b9c41a5322",i:130558},
      {n:"V",h:"06f24846f17ed13bc54db280209ad6e8cd3b9db46839cd5109920d24090ad7aa",i:130650},{n:"VI",h:"24b8261d1560ecbfdc8fa43c60b8fe9f79150f19e021b476fc605c3962ae78a2",i:130645},
      {n:"VII",h:"5c67ed83db55258aad2d4aa18e80693b4002d5ac0e555928666deeb12692fa80",i:130610},{n:"VIII",h:"7027ca7504d5767930a7e90cdfd8b0553c2a5133fe5fcdf5887dc0311e9486bc",i:130658},
      {n:"IX",h:"57b066a9d5769be2a64fd74e1941e35c034b5265d42e3a868615980aa576a371",i:130692},{n:"X",h:"35349fc8e0badad460b6d7125fe2f833dcbec129a8064c9d7cd5e64172274325",i:130694}
    ].map(item => ({ name: `Sqyzy ${item.n}`, url: `https://ordinals.com/content/${item.h}i0`, type: 'image', collection: 'Sqyzy', rarity: 'Rare', notes: `#${item.i}`, fact: 'The Sqyzy collection is an example of an artist establishing a distinct, recognizable style directly on the Bitcoin blockchain.' })),
    // --- Colliders Collection ---
    { name: "Lightning Text", url: "https://ordinals.com/content/e9e5f4862c1e486d07b4bb91c5b85edf8d044e0c0cdd1b235959be8bd49355d6i0", type: 'gif', collection: 'Colliders', rarity: 'Rare', notes: '#457195', fact: "'Colliders' often feature dynamic, animated content. This GIF is a classic example of their energetic and visually impactful style." },
    { name: "Colliders Character Sheet", url: "https://ordinals.com/content/248e46f24ea63968aef2bcd1a58e7b97d1cf5e7260be5802f5765567f0d17df4i0", type: 'gif', collection: 'Colliders', rarity: 'Rare', notes: '#457953', fact: 'Character sheets like this help build lore and world-building for a collection, adding depth beyond a single image.' },
    // --- PUNX Collection ---
    { name: "PUNX LOGO HI-RES", url: "https://ordinals.com/content/c2beb99dbc32188e56ea2ca3750c99a6ce9145892678473b51802ce680cb5f16i0", type: 'video', collection: 'PUNX', rarity: 'Rare', notes: '#512517', fact: "The 'PUNX on Ordinals' project is a derivative of the famous CryptoPunks, re-imagined and permanently inscribed on Bitcoin." },
    { name: "PUNX LOGO PIXEL RES", url: "https://ordinals.com/content/c9d39d2aef6f2f3d744b2e8e5aab9fb11ba65274e8d19aef777c21f264426b71i0", type: 'gif', collection: 'PUNX', rarity: 'Common', notes: '#641577', fact: 'This pixelated version pays homage to the 8-bit aesthetic of the original CryptoPunks, tailored for the Ordinals space.' },
    { name: "PUNX #1", url: "https://ordinals.com/content/4e38c53382a55659ef518fe9385f807fc5b827fe99f0854ff0d2a22a0a78b175i0", type: 'gif', collection: 'PUNX', rarity: 'Rare', notes: '#457885', fact: 'Individual PUNX characters carry the pixel-art torch of their predecessors, establishing a new a new wave of pfp culture on Bitcoin.' },
    // --- Solemn (AVIF) Collection ---
    { name: "Solemn AVIF 1", url: "https://ordinals.com/content/2c762a593dc60bcd92169b07de5a60d588a94819d165178ca317d45e4eeb2b11i0", type: 'avif', collection: 'Solemn', rarity: 'Rare', notes: '', fact: 'AVIF is a modern image format offering high compression and quality, making it ideal for the block-space constraints of on-chain storage.' },
    { name: "Solemn AVIF 2", url: "https://ordinals.com/content/3ff701e8197231883785902d1076ffa747b28f951a0dbe2445ba2690df134575i0", type: 'avif', collection: 'Solemn', rarity: 'Rare', notes: '', fact: 'Using AVIF allows for more complex and higher-fidelity images to be inscribed without incurring excessive transaction fees.' },
    { name: "Solemn AVIF 3", url: "https://ordinals.com/content/810350843b5011b0cd78ebf2134fb7df751f584d1c5eeaf578d214adb020b329i0", type: 'avif', collection: 'Solemn', rarity: 'Rare', notes: '', fact: 'The Solemn collection leverages the AVIF format to deliver its distinct, high-detail aesthetic on-chain.' },
    { name: "Solemn AVIF 4", url: "https://ordinals.com/content/566ac7f4fe8cc5e41513f2e15aa376eb77d0883dc211a64f249e5145746957b0i0", type: 'avif', collection: 'Solemn', rarity: 'Rare', notes: '', fact: 'Each piece in this collection demonstrates the practical benefits of using next-generation media formats for digital artifacts.' },
];
  
// =======================================================
  // ADVANCED / PROBLEMATIC ASSETS
  // Separated list for content that is recursive HTML or requires
  // special handling (JS modules, custom players, etc.).
  // This list is NOT used by the default player.
  // =======================================================
  const ADVANCED_ASSETS = [
    { name: "I love Cheese player", url: "https://ordinals.com/content/38c24932ff414e5dd03b728338243389ea80edfcd19dd7430950630f2622f5ffi0", reason: "Recursive HTML Player" },
    { name: "Audionals Pump Player", url: "https://ordinals.com/content/20c939e91ac29bff0d96ecb1f567beb25a6ee80462c5a6927cd2acae8cb41fedi0", reason: "Recursive HTML Player" },
    { name: "Solemn with Sound", url: "https://ordinals.com/content/7e9b5d9d0a202a53a9ab9d22381ee442567f7dfe44f8b8dbaaccd027827e9a20i0", reason: "JavaScript Player" },
    { name: "Chordinal #1", url: "https://ordinals.com/content/aa43e0a7d229f460c6f9310e938ae8ec50a26f5b09df1f6d801d9e8a8741afc3i0", reason: "JavaScript / HTML App" },
    { name: "First 'Audinal'", url: "https://ordinals.com/inscription/7d058415fb8b6d35fddd375208648254bcb0e4e470b4b25da3dac32d8b04b935i0", reason: "HTML page, not direct media" },
    { name: "2nd Basic Sequencer", url: "https://ordinals.com/inscription/09e0b0c471a6a89c1385c67016e5e6a97f6a6df38207c2d79da67cadf0774368i0", reason: "HTML page, not direct media" },
    { name: "First Synth", url: "https://ordinals.com/content/598a448d0e134e90855e6fba03d7b2e2610423f185ba513d3c1a8022a9d0d591i0", reason: "JavaScript / HTML App" },
    { name: "First Audional Song (Old Engine)", url: "https://ordinals.com/content/cea4d582a419e6c7561af335ed08b6b47384d6f2c25d0f682c3019c7f2a305e4i0", reason: "Recursive HTML Player" },
    { name: "Original Audional Sequencer", url: "https://ordinals.com/content/ade52434daf0667a061da2307b74ab7c217b46b1e8bc0d8d649c35b203ee16d6i0", reason: "Recursive HTML Player" },
    { name: "The Infinite Ordinal Remix", url: "https://ordinals.com/inscription/a5e9d3fe0cb8e3378e478b2c2ae1f222d01536f069ce4d42ac2c9b7989b74a75i0", reason: "HTML page, not direct media" },
    { name: "New Engine Song (Generative)", url: "https://ordinals.com/content/a449a3401142ce6118e13106dcaf61b7d17fb3cfadf26a5079154f9cca1862b7i0", reason: "JavaScript Player" },
    { name: "New Engine Song (Static)", url: "https://gamma.io/inscription/9c04932d96d505fd30ed29308665b31565e9ff6955f2ffe559b47d036faddb0bi0", reason: "JavaScript Player" },
    { name: "First Opus test", url: "https://ordinals.com/inscription/8e00109f37672c8d9b75becdc6135c751a1be0189cc6e836f7637c2642480ea3i0", reason: "HTML page, not direct media" },
    { name: "Free Ross", url: "https://ordinals.com/content/449bf49f5b7b62e547c6f914badf9e20d5d035897194520d432b7dd5069ee569i0", reason: "Recursive HTML" },
    { name: "Bot 1T5", url: "https://ordinals.com/content/1c3361ebbb51e87d41ca155866cb6b3795999a80c636aa447690f31ea657f0abi0", reason: "Non-Recursive HTML" },
  ];