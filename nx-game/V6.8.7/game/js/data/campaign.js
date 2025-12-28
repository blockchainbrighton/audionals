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
    }
];
