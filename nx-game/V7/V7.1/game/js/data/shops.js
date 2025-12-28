export const shopDefinitions = {
    'central_exchange': {
        name: "Central Exchange Node", 
        welcome: "Accessing Central Exchange... Verified Xperient. Trade at will.", 
        inventory: [
            { itemId: 'nanite_repair', stock: 10, basePriceModifier: 1.0 },
            { itemId: 'adrena_rush_injector', stock: 5, basePriceModifier: 1.0 },
            { itemId: 'narcotix_pill', stock: Infinity, basePriceModifier: 1.0 }
        ], 
        buys: ['narcotix_pill']
    },
    'xemist_den': {
        name: "Xemist Den Interface", 
        welcome: "Signal acquired. This is a... restricted channel. What d'you need?", 
        inventory: [
            { itemId: 'narcotix_pill', stock: Infinity, basePriceModifier: 0.8 },
            { itemId: 'kaos_elixir', stock: 3, basePriceModifier: 1.2 }
        ], 
        buys: ['narcotix_pill', 'xdata_fragment']
    },
    'armoury_local': {
        name: "Munitions Depot 01", 
        welcome: "Ordnance Access Granted. Keep it lethal.", 
        inventory: [
            { itemId: 'ammo_light_rounds', stock: 500, basePriceModifier: 1.1 }, 
            { itemId: 'pistol', stock: 3, basePriceModifier: 1.2 }
        ], 
        buys: ['weapon']
    },
    'xlounge_personal': {
        name: "XLounge (Personal Stash I/O)", 
        welcome: "XLounge Stash Verified. All assets digital. No physical weapons permitted past this interface.", 
        inventory: [
            { itemId: 'nanite_repair', stock: 3, basePriceModifier: 0.9 }
        ], 
        buys: []
    }
};
