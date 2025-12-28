export const CAMPAIGN_DATA = [
    {
        id: "mission_01_wakeup",
        title: "System Reboot",
        description: "Wake up and access your personal Stash in the Safehouse.",
        prereq: null, // First mission
        type: "INTERACT",
        targetId: "safehouse_stash", // ID of the stash tile/object
        suggestedPoi: "xlounge_stash",
        unlocks: ["feature_inventory"], // Flags to set on completion
        dialogue: "Systems online. You need to check your stash before heading out."
    },
    {
        id: "mission_02_arm_up",
        title: "Arming Protocol",
        description: "Retrieve your Pistol and Ammo from the Stash, then Equip the Pistol.",
        prereq: "mission_01_wakeup",
        type: "EQUIP",
        targetId: "pistol",
        unlocks: ["zone_street", "feature_combat"],
        dialogue: "It's dangerous out there. Retrieve your sidearm and calibrate your aim (Move Mouse to Aim, Click or Space to Fire)."
    },
    {
        id: "mission_03_first_blood",
        title: "Cleaning the Streets",
        description: "Neutralize the Security Drone to lift the Sector Lockdown.",
        prereq: "mission_02_arm_up",
        type: "KILL",
        targetType: "drone_scout",
        count: 1,
        unlocks: ["shop_central_exchange"],
        reward: { money: 50, item: "ammo_light_rounds" },
        dialogue: "Hostiles detected. Clear the perimeter."
    },
    {
        id: "mission_04_trade_route",
        title: "Liquid Assets",
        description: "Travel to the Central Exchange and buy a Nanite Repair.",
        prereq: "mission_03_first_blood",
        type: "BUY",
        itemId: "nanite_repair",
        suggestedPoi: "exchange_node",
        unlocks: ["zone_casino_district"],
        dialogue: "Good work. You're leaking data though. Go buy a patch."
    },
    {
         id: "mission_04_explore",
         title: "The Neon District",
         description: "Locate the entrance to the Casino District.",
         prereq: "mission_04_trade_route",
         type: "GOTO",
         targetZone: "zone_casino_district",
         suggestedPoi: "casino",
         unlocks: ["feature_minigames"],
         dialogue: "The wealthy elites gather in the Casino district. High risk, high reward."
    },
    {
        id: "mission_05_jackpot",
        title: "Feeling Lucky",
        description: "Play the Slot Machine in the Casino.",
        prereq: "mission_04_explore",
        type: "INTERACT",
        targetId: "slot_machine",
        suggestedPoi: "casino",
        unlocks: ["open_world_access"],
        reward: { item: "pistol_heavy" },
        dialogue: "Test your luck. Maybe you'll hit the big one."
    },
    // PHASE 2: CASINO ARC
    {
        id: "mission_06_golden_ticket",
        title: "Golden Ticket",
        description: "Accumulate 500 Credits to afford the Broker's fee.",
        prereq: "mission_05_jackpot",
        type: "ACCUMULATE", // Logic needed in ProgressionManager
        amount: 500,
        unlocks: ["shop_vip_pass"],
        dialogue: "You need capital to talk to the elites. The Casino is your best bet."
    },
    {
        id: "mission_07_the_broker",
        title: "The Broker",
        description: "Speak to Neon_Shade in the Casino VIP area.",
        prereq: "mission_06_golden_ticket",
        type: "INTERACT",
        targetId: "neon_shade", // Tile type/ID
        unlocks: ["feature_hacking"],
        dialogue: "Neon_Shade has the data. But he doesn't talk to broke tourists."
    },
    {
        id: "mission_08_signal_trace",
        title: "Signal Trace",
        description: "Locate the Undercity Entrance in the Overworld.",
        prereq: "mission_07_the_broker",
        type: "GOTO", // Finding the tile
        targetZone: "undercity_entrance", // Special check logic
        unlocks: ["zone_undercity"],
        dialogue: "He gave up the location. Search the perimeter for the old maintenance hatch."
    },
    // PHASE 3: UNDERCITY ARC
    {
        id: "mission_09_into_the_deep",
        title: "Into the Deep",
        description: "Enter Sector Zero (The Undercity).",
        prereq: "mission_08_signal_trace",
        type: "GOTO",
        targetZone: "zone_undercity",
        unlocks: ["feature_arena"],
        dialogue: "Go underground. The signal is coming from below."
    },
    {
        id: "mission_10_stalker_hunt",
        title: "Data Leech",
        description: "Eliminate 3 Sewer Stalkers to secure the area.",
        prereq: "mission_09_into_the_deep",
        type: "KILL",
        targetType: "stalker",
        count: 3,
        reward: { item: "arc_rifle" },
        dialogue: "Something is watching you. Clear the shadows."
    },
    {
        id: "mission_11_root_access",
        title: "Root Access",
        description: "Find the Terminal in the Undercity (or Safehouse for testing) and HACK it.",
        prereq: "mission_10_stalker_hunt",
        type: "INTERACT",
        targetId: "hack_terminal",
        unlocks: ["end_game_tier_1"],
        reward: { money: 1000 },
        dialogue: "This is it. The truth is inside. Don't blink."
    }
];
