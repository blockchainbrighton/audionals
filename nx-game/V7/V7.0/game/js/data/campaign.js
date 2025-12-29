export const CAMPAIGN_DATA = [
    {
        id: "mission_01_wakeup",
        title: "System Initialization",
        description: "Initialize and access your personal Cache in Localhost.",
        prereq: null, // First mission
        type: "INTERACT",
        targetId: "safehouse_stash", // ID of the stash tile/object
        suggestedPoi: "xlounge_stash",
        unlocks: ["feature_inventory"], // Flags to set on completion
        dialogue: "Boot sequence complete. Check your Cache for initial config data."
    },
    {
        id: "mission_02_arm_up",
        title: "Protocol: Defense",
        description: "Retrieve Pulse Emitter and Bit Stream from Cache, then Equip the Emitter.",
        prereq: "mission_01_wakeup",
        type: "EQUIP",
        targetId: "pistol",
        unlocks: ["zone_street", "feature_combat"],
        dialogue: "External networks are unstable. Load your Pulse Emitter and calibrate targeting parameters."
    },
    {
        id: "mission_03_first_blood",
        title: "Debugging the Bus",
        description: "Neutralize the Index Crawler to lift the Bandwidth Throttle.",
        prereq: "mission_02_arm_up",
        type: "KILL",
        targetType: "drone_scout",
        count: 1,
        unlocks: ["shop_central_exchange"],
        reward: { money: 50, item: "ammo_light_rounds" },
        dialogue: "Corrupted entities detected on the data bus. Execute cleanup routine."
    },
    {
        id: "mission_04_trade_route",
        title: "Cycle Exchange",
        description: "Travel to the Data Exchange Node and acquire an Integrity Patch.",
        prereq: "mission_03_first_blood",
        type: "BUY",
        itemId: "nanite_repair",
        suggestedPoi: "exchange_node",
        unlocks: ["zone_casino_district"],
        dialogue: "Performance optimal. You have a memory leak though. Acquire a patch."
    },
    {
         id: "mission_04_explore",
         title: "The Render Farm",
         description: "Locate the gateway to the RNG Node (Casino) sector.",
         prereq: "mission_04_trade_route",
         type: "GOTO",
         targetZone: "zone_casino_district",
         suggestedPoi: "casino",
         unlocks: ["feature_minigames"],
         dialogue: "High-priority threads gather in the RNG sector. High variance, high yield."
    },
    {
        id: "mission_05_jackpot",
        title: "Entropy Generation",
        description: "Interact with the Entropy Generator (Slot Machine) in the RNG Node.",
        prereq: "mission_04_explore",
        type: "INTERACT",
        targetId: "slot_machine",
        suggestedPoi: "casino",
        unlocks: ["open_world_access"],
        reward: { item: "pistol_heavy" },
        dialogue: "Test your hash algorithm. Maybe you'll solve a block."
    },
    // PHASE 2: CASINO ARC
    {
        id: "mission_06_golden_ticket",
        title: "Access Token",
        description: "Accumulate 500 Cycles to afford the Oracle's gas fee.",
        prereq: "mission_05_jackpot",
        type: "ACCUMULATE", // Logic needed in ProgressionManager
        amount: 500,
        unlocks: ["shop_vip_pass"],
        dialogue: "You need Cycles to query the Oracle. The RNG Node is your best source."
    },
    {
        id: "mission_07_the_broker",
        title: "The Oracle",
        description: "Speak to Encrypted_Broker in the VIP Partition.",
        prereq: "mission_06_golden_ticket",
        type: "INTERACT",
        targetId: "neon_shade", // Tile type/ID
        unlocks: ["feature_hacking"],
        dialogue: "Encrypted_Broker holds the keys. But they don't handshake with idle processes."
    },
    {
        id: "mission_08_signal_trace",
        title: "Port Scanning",
        description: "Locate the Kernel Backdoor in the Overworld.",
        prereq: "mission_07_the_broker",
        type: "GOTO", // Finding the tile
        targetZone: "undercity_entrance", // Special check logic
        unlocks: ["zone_undercity"],
        dialogue: "Coordinates received. Scan the perimeter for an open port."
    },
    // PHASE 3: UNDERCITY ARC
    {
        id: "mission_09_into_the_deep",
        title: "Kernel Access",
        description: "Enter Kernel Space (The Undercity).",
        prereq: "mission_08_signal_trace",
        type: "GOTO",
        targetZone: "zone_undercity",
        unlocks: ["feature_arena"],
        dialogue: "Descend to Kernel Level. The source signal originates here."
    },
    {
        id: "mission_10_stalker_hunt",
        title: "Garbage Collection",
        description: "Eliminate 3 Memory Leaks to stabilize the sector.",
        prereq: "mission_09_into_the_deep",
        type: "KILL",
        targetType: "stalker",
        count: 3,
        reward: { item: "arc_rifle" },
        dialogue: "Anomalies detected in memory. Force garbage collection."
    },
    {
        id: "mission_11_root_access",
        title: "Root Access",
        description: "Find the Mainframe Terminal and Hack it for Root privileges.",
        prereq: "mission_10_stalker_hunt",
        type: "INTERACT",
        targetId: "hack_terminal",
        unlocks: ["end_game_tier_1"],
        reward: { money: 1000 },
        dialogue: "This is the core. The source code is inside. Execute."
    }
];
