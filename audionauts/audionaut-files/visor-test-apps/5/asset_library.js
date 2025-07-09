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

// --- Primary Library of Usable Assets ---
export const assetLibrary = [
    // == Audionals & B.A.M. Logos ==
    {
      id: 'audional_logo_common',
      name: 'Original Audionals Inscription',
      collection: 'Audionals Logos',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/40136786a9eb1020c87f54c63de1505285ec371ff35757b44d2cc57dbd932f22i0',
      notes: ''
    },
    {
      id: 'audional_logo_ai_ultrarare',
      name: 'AI Original Audionals Inscription',
      collection: 'Audionals Logos',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/129ffaa02e85dea60fed32b84cd31436ccba1ff5b534fcb0b4efdddd2a0ddd05i0',
      notes: 'Only one in whole collection'
    },
    {
      id: 'audional_logo_3rdparty_rare',
      name: '3rd Party Audionals Logo',
      collection: 'Audionals Logos',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/72389b804f1f673caf52fea6e8f0733058b5605c879bea1938aa680f67fbe141i0',
      notes: ''
    },
    {
      id: 'bam_logo_common',
      name: 'B.A.M. Logo',
      collection: 'B.A.M. Assets',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/09b4bbb0337af857d9afa934205fb820bb704596a00f2e7f5bb37195853eee32i0',
      notes: ''
    },
  
    // == Miscellaneous Badges ==
    {
      id: 'basedbtc_ob1_rare',
      name: 'Based.btc OB1',
      collection: 'Misc Badges',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/e716f0e3832dbdd818f2291ad8cb0395f3bbec4f5ba762c05108a719842c9f6di0',
      notes: ''
    },
    {
      id: 'hathaway_btc_common',
      name: 'Hathaway Bitcoin Logo',
      collection: 'Misc Badges',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/a1491d4b9c780799f53cd93fe0e5cad4ece52e1e638dd74de44fe74514f00bcfi0',
      notes: ''
    },
    {
      id: 'vikings_common',
      name: 'Vikings',
      collection: 'Misc Badges',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/3a504956f370c0362e48f7a1daf53d51c250c3c0d2054eb0b018d60caad0be77i0',
      notes: ''
    },
    {
      id: 'narcotix_common',
      name: 'NarcotiX',
      collection: 'Misc Badges',
      rarity: 'COMMON',
      type: 'image',
      url: 'https://ordinals.com/content/17627f1b267798eb488206cacfb55089b1b268885c3f136d6265547cb71c5b72i0',
      notes: 'Once per timeline'
    },
  
    // == Nat Atlas Collection ==
    {
      id: 'natatlas_1_rare',
      name: 'Nat Atlas 1',
      collection: 'Nat Atlas',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/515cfa9ca12ff4968b7f9b73cefdba1410ef6fcbf76868559c8b1b77ad13f497i0',
      notes: ''
    },
    {
      id: 'natatlas_2_rare',
      name: 'Nat Atlas 2',
      collection: 'Nat Atlas',
      rarity: 'RARE',
      type: 'image',
      url: 'https://ordinals.com/content/16e4d2fae0ff944bb29a56f1c35ba5187207c4ada96d5b9c8f6cf3a1f618fb1di0',
      notes: ''
    },
  
    // == THIS IS #1 Collection ==
    {
      id: 'thisis1_channel1_ultrarare',
      name: 'Channel #1 - #56330',
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/726fd43250acf6543273eab0e8a52db8df969af672107297f03b866424d8b0f4i0',
      notes: 'Genesis Collection'
    },
    {
      id: 'thisis1_numberone_ultrarare',
      name: 'This Is Number One - #75140',
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/8d3c82c15a662cfe4b998e45bf8c71c00f16d532c5d4c546f59802e6f7730f3ei0',
      notes: 'Genesis Collection'
    },
    {
      id: 'thisis1_smiley_ultrarare',
      name: 'Number One Smiley - #75141',
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/0668de6cd3f66acc85063026232fa7c6da01666aeb6fec965d5c34ca093fda49i0',
      notes: 'Genesis Collection'
    },
    {
      id: 'thisis1_nowisnotenough_ultrarare',
      name: 'Now Is Not Enough - #75017',
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/cc8b85b8984cd30a9e26c755e766bca8ce1a25fdefb813bc0fb2eb411fb67a0bi0',
      notes: 'Genesis Collection'
    },
    {
      id: 'thisis1_mine_ultrarare',
      name: 'Mine - #74963',
      collection: 'THIS IS #1',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: 'https://ordinals.com/content/f6cd2ba6f2f2e95c818cfb9f613ac5b246473d430de8a48e99686210ca9ef21fi0',
      notes: 'Genesis Collection'
    },
  
    // == Hash Ones Collection ==
    ...[
      { name: 'Hash One #92 - #68263', url: 'fba6c1abe4c6d7e8f654da1fe6550e4110c6c3b5c4899cb91ad9ef88dbed96eci0' },
      { name: 'Hash One #93 - #72619', url: '020d36560a95677d12845ade78c5ea59a3903d8c3e14953f407fb12f229be71bi0' },
      { name: 'Hash One #94 - #72621', url: '88f7e4621dcaa8207f6eb39791001afe2fee2ede36c9f2372705b813002a5530i0' },
      { name: 'Hash One #95 - #72640', url: 'f3dc74d01e07d6a88cf30fc1a6acf53d3f73517b3861a8949fa50f6114dc1bfai0' },
      { name: 'Hash One #96 - #73968', url: '542faa1be5014212bdf57a7afd41eb878dfcc4332a3718f23e7d1d8604f0c7c2i0' },
      { name: 'Hash One #97 - #73959', url: '8a312ad605ce2a15d59f7714e3b7b0fe77ca1aeaa8b68376569ccf2bf2105f5ci0' },
      { name: 'Hash One #98 - #73948', url: 'd5243217dd0a214ed7dd17b71d35bdc68fae854a191dfcf740a32aa5a7880610i0' },
      { name: 'Hash One #99 - #73936', url: 'f7ed8da190670f462b7e1193a228c5daf07cddd89103d72a7d1ca3adcc05c62bi0' },
      { name: 'Hash One #100 - #73866', url: 'ad77943f52877acac2a08410ac41f5ae1e56d4ccb2b82c1accf4ef1cb7038c1fi0' },
      { name: 'Hash One #101 - #73878', url: 'e2c683f6ec6c0b71808b05527a136627c49cd996ae3fd5970d18329ee28a56a8i0' },
      { name: 'Hash One #102 - #73935', url: '89f92c9916b542314781f821cacb670722f38e21f5994e9dce9f7c7e9926a520i0' },
      { name: 'Hash One #103 - #73956', url: '8816cdd828135675fdf5146a658823a9bae98a67da55a930483a1db21bf6c235i0' },
      { name: 'Hash One #104 - #74570', url: 'b0958c0c68430291c2f1b1fbd7c98624cb78991c03855a1319d4bf29c7cc2372i0' },
      { name: 'Hash One #105 - #74578', url: 'c785aa38f6dd2461be35c63b7f1849b2d4caf027b1d05fa3986e515ea0130fc6i0' },
      { name: 'Hash One #106 - #74566', url: '31281b871fb6e16df8f57aa734092fab82de62611a83c15c7cfe8e695559ad59i0' },
      { name: 'Hash One #107 - #74631', url: '425210e56972ba2adc1c05e980e5275eae1241c7a75a16f08e04bc464863bc74i0' },
      { name: 'Hash One #108 - #74651', url: '3a270ee2ecdacf6d8bb8e62f285f3e3487fdfd028169fccc62d5ba0cbeab219ci0' },
      { name: 'Hash One #109 - #74643', url: '57cac42c8bbb018e3dbc066f23669422c655166a47ce72ccccc2dc0f5a63488ei0' },
      { name: 'Hash One #110 - #74608', url: '777232a28c83a5ccf908fb6913c44b3f95405e8a7ec83358b3db330f30a7b435i0' },
      { name: 'Hash One #111 - #74569', url: '067982e5ea64a2a8d1f226318e4c0714e99a0e3e6114f9d1a0f4a4642dc7b871i0' },
    ].map(item => ({
      id: `hashone_${item.name.split(' ')[2].substring(1)}`,
      name: item.name,
      collection: 'Hash Ones',
      rarity: 'ULTRA RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      notes: 'Only 1 of each in whole collection'
    })),
  
    // == Sqyzy Collection ==
    ...[
      { name: 'Sqyzy I - #130573', url: 'bfd05a40892d872c033994d2375c6382eb90789db6739a7b18f7246a396f5a3di0' },
      { name: 'Sqyzy II - #130596', url: '5a2b8214a9411c62bed0acb1f1f0b296bf049da181178120311520f25254c365i0' },
      { name: 'Sqyzy III - #130609', url: 'fe22987aae2d261c1848c0e69f571ad605aa5f1f7e03ab8ae460436919da837ai0' },
      { name: 'Sqyzy IV - #130558', url: 'a3e850c3070f255d08b86b334000e35bb2af101c61e0a871d1e6a1b9c41a5322i0' },
      { name: 'Sqyzy V - #130650', url: '06f24846f17ed13bc54db280209ad6e8cd3b9db46839cd5109920d24090ad7aai0' },
      { name: 'Sqyzy VI - #130645', url: '24b8261d1560ecbfdc8fa43c60b8fe9f79150f19e021b476fc605c3962ae78a2i0' },
      { name: 'Sqyzy VII - #130610', url: '5c67ed83db55258aad2d4aa18e80693b4002d5ac0e555928666deeb12692fa80i0' },
      { name: 'Sqyzy VIII - #130658', url: '7027ca7504d5767930a7e90cdfd8b0553c2a5133fe5fcdf5887dc0311e9486bci0' },
      { name: 'Sqyzy IX - #130692', url: '57b066a9d5769be2a64fd74e1941e35c034b5265d42e3a868615980aa576a371i0' },
      { name: 'Sqyzy X - #130694', url: '35349fc8e0badad460b6d7125fe2f833dcbec129a8064c9d7cd5e64172274325i0' },
    ].map(item => ({
      id: `sqyzy_${item.name.split(' ')[1].toLowerCase()}`,
      name: item.name,
      collection: 'Sqyzy',
      rarity: 'RARE',
      type: 'image',
      url: `https://ordinals.com/content/${item.url}`,
      notes: ''
    })),
  
    // == Colliders Collection ==
    {
      id: 'colliders_lightning_gif',
      name: 'Lightning Text',
      collection: 'Colliders',
      rarity: 'COMMON',
      type: 'gif',
      url: 'https://ordinals.com/content/e9e5f4862c1e486d07b4bb91c5b85edf8d044e0c0cdd1b235959be8bd49355d6i0',
      notes: ''
    },
    {
      id: 'colliders_charsheet_gif',
      name: 'Colliders Character Sheet',
      collection: 'Colliders',
      rarity: 'COMMON',
      type: 'gif',
      url: 'https://ordinals.com/content/248e46f24ea63968aef2bcd1a58e7b97d1cf5e7260be5802f5765567f0d17df4i0',
      notes: ''
    },
    
    // == PUNX Collection ==
    {
      id: 'punx_logo_hires_video',
      name: 'PUNX LOGO HI-RES',
      collection: 'PUNX',
      rarity: 'RARE',
      type: 'video',
      url: 'https://ordinals.com/content/c2beb99dbc32188e56ea2ca3750c99a6ce9145892678473b51802ce680cb5f16i0',
      notes: 'MP4 format.'
    },
    {
      id: 'punx_logo_pixel_gif',
      name: 'PUNX LOGO PIXEL RES',
      collection: 'PUNX',
      rarity: 'COMMON',
      type: 'gif',
      url: 'https://ordinals.com/content/c9d39d2aef6f2f3d744b2e8e5aab9fb11ba65274e8d19aef777c21f264426b71i0',
      notes: ''
    },
    {
      id: 'punx_1_gif',
      name: 'PUNX #1',
      collection: 'PUNX',
      rarity: 'RARE',
      type: 'gif',
      url: 'https://ordinals.com/content/4e38c53382a55659ef518fe9385f807fc5b827fe99f0854ff0d2a22a0a78b175i0',
      notes: ''
    },
    
    // == Solemn Collection (AVIF) ==
    {
      id: 'solemn_avif_1',
      name: 'Solemn 1',
      collection: 'Solemn',
      rarity: 'RARE',
      type: 'avif',
      url: 'https://ordinals.com/content/2c762a593dc60bcd92169b07de5a60d588a94819d165178ca317d45e4eeb2b11i0',
      notes: 'AVIF format.'
    },
    {
      id: 'solemn_avif_2',
      name: 'Solemn 2',
      collection: 'Solemn',
      rarity: 'RARE',
      type: 'avif',
      url: 'https://ordinals.com/content/3ff701e8197231883785902d1076ffa747b28f951a0dbe2445ba2690df134575i0',
      notes: 'AVIF format.'
    },
    {
      id: 'solemn_avif_3',
      name: 'Solemn 3',
      collection: 'Solemn',
      rarity: 'RARE',
      type: 'avif',
      url: 'https://ordinals.com/content/810350843b5011b0cd78ebf2134fb7df751f584d1c5eeaf578d214adb020b329i0',
      notes: 'AVIF format.'
    },
    {
      id: 'solemn_avif_4',
      name: 'Solemn 4',
      collection: 'Solemn',
      rarity: 'RARE',
      type: 'avif',
      url: 'https://ordinals.com/content/566ac7f4fe8cc5e41513f2e15aa376eb77d0883dc211a64f249e5145746957b0i0',
      notes: 'AVIF format.'
    },
  
    // == Usable HTML and Text Files ==
    {
      id: 'bot_1t5_html',
      name: 'Bot 1T5',
      collection: 'HTML Content',
      rarity: 'COMMON',
      type: 'html',
      url: 'https://ordinals.com/content/1c3361ebbb51e87d41ca155866cb6b3795999a80c636aa447690f31ea657f0abi0',
      notes: 'Non-recursive HTML page.'
    },
    {
      id: 'audional_click_html',
      name: 'Audional 2.0 Clicker',
      collection: 'HTML Content',
      rarity: 'COMMON',
      type: 'html',
      url: 'https://ordinals.com/content/64cdcae0cdc81c615845b9771247e6848f24a4cc29a2af969deb68fce651bfdfi0',
      notes: 'Non-recursive HTML page.'
    },
    {
      id: 'text_695621_bitmap',
      name: '695621.bitmap',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/90a883d2c513c6f6b5947c1e22377424b59efb94df623f7c0a369ebd68fd711ei0',
      notes: 'Raw text content.'
    },
    {
      id: 'text_jim_bit',
      name: 'jim.bit',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/96cfd02e2ec9123e5767a8092a863e8779b5083921c612f48fd5c817cab72360i0',
      notes: 'Raw text content.'
    },
    {
      id: 'text_audionalrunes',
      name: 'AUDIONALRUNES',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/c542a6c792391e61a6e2c77ce2bb821c696bc2866413757ff7fd05b1b35dc5c2i0',
      notes: 'Raw text content.'
    },
    {
      id: 'text_sqyzyxyz',
      name: 'SQYZYXYZSQYZY',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/939ac96cab5d808d7c12914ff77a8b4b8e98aadef73241c8f7b8c839b7f8006fi0',
      notes: 'Raw text content.'
    },
    {
      id: 'text_audionals_bit',
      name: 'audionals.bit',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/c4ff3e1c58987722bdd89a348036f00e0ca7d39b96ba09421d258c0c16808223i0',
      notes: 'Raw text content.'
    },
    {
      id: 'text_jim_ob1',
      name: 'jim.ob1',
      collection: 'Text Files',
      rarity: 'COMMON',
      type: 'text',
      url: 'https://ordinals.com/content/db49e03ce89eb233976998d44e199c4d63c261809869ac190ae2303f3ddb38e5i0',
      notes: 'Raw text content.'
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