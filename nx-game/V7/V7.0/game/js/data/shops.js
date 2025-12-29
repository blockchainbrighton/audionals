export const shopDefinitions = {
    'central_exchange': {
        name: "Data Exchange Node", 
        welcome: "Handshake complete. Verifying Hash... Exchange ready. Execute trade.", 
        inventory: [
            { itemId: 'nanite_repair', stock: 10, basePriceModifier: 1.0 },
            { itemId: 'adrena_rush_injector', stock: 5, basePriceModifier: 1.0 },
            { itemId: 'narcotix_pill', stock: Infinity, basePriceModifier: 1.0 }
        ], 
        buys: ['narcotix_pill']
    },
    'xemist_den': {
        name: "Compiler's Den", 
        welcome: "Encrypted channel established. Do you have the source fragments?", 
        inventory: [
            { itemId: 'narcotix_pill', stock: Infinity, basePriceModifier: 0.8 },
            { itemId: 'kaos_elixir', stock: 3, basePriceModifier: 1.2 }
        ], 
        buys: ['narcotix_pill', 'xdata_fragment']
    },
    'armoury_local': {
        name: "Bit Emitter Depot 01", 
        welcome: "Defense protocols suspended. Output lethality authorized.", 
        inventory: [
            { itemId: 'ammo_light_rounds', stock: 500, basePriceModifier: 1.1 }, 
            { itemId: 'pistol', stock: 3, basePriceModifier: 1.2 }
        ], 
        buys: ['weapon']
    },
    'xlounge_personal': {
        name: "Localhost Cache", 
        welcome: "User verified. Localhost storage access granted. All assets digital.", 
        inventory: [
            { itemId: 'nanite_repair', stock: 3, basePriceModifier: 0.9 }
        ], 
        buys: []
    }
};
