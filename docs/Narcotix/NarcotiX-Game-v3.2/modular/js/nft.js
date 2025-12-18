export class NFTCollection {
    constructor() {
        this.pills = [];
        this.rarityDistribution = { common: 0.60, uncommon: 0.25, rare: 0.10, epic: 0.04, legendary: 0.01 };
        this.effectTypes = ['SPEED', 'STRENGTH', 'STEALTH', 'VISION', 'LUCK', 'CHAOS', 'ARMOR', 'HEALTH'];
        this.sideEffects = ['NONE', 'MILD_HALLUCINATION', 'REVERSED_CONTROLS', 'DOUBLE_VISION', 'PARANOIA', 'EUPHORIA', 'ADDICTION'];
        this.colors = ['#ff00ff', '#00ffff', '#ff0', '#f0f', '#0f0', '#f00', '#00f', '#fa0', '#f0a', '#a0f'];
        this.generateCollection();
    }

    generateCollection() {
        const prefixes = ['Cyber', 'Neuro', 'Quantum', 'Psycho', 'Digital', 'Synth', 'Bio', 'Nano', 'Plasma', 'Crystal', 'Dark', 'Light', 'Void', 'Chaos', 'Order'];
        const bases = ['Pill', 'Tab', 'Cap', 'Dose', 'X', 'Max', 'Core', 'Drive', 'Wave', 'Rush', 'Boost', 'Surge'];
        const suffixes = ['+', 'Pro', 'Ultra', 'Xtreme', 'Prime', 'Omega', 'Alpha', 'Neo', 'Max', 'Core', 'Elite', 'Supreme'];

        let id = 0;
        for (let rarity in this.rarityDistribution) {
            const count = Math.floor(3333 * this.rarityDistribution[rarity]);
            for (let i = 0; i < count && id < 3333; i++) {
                const rarityMultiplier = rarity === 'legendary' ? 4 : rarity === 'epic' ? 2.5 : rarity === 'rare' ? 1.8 : 1;
                const pill = {
                    id: id++,
                    name: `${prefixes[id % prefixes.length]}${bases[id % bases.length]}${suffixes[id % suffixes.length]}`,
                    rarity: rarity,
                    effect: this.effectTypes[Math.floor(Math.random() * this.effectTypes.length)],
                    potency: Math.floor(Math.random() * 15 * rarityMultiplier) + 1,
                    duration: Math.floor(Math.random() * 45 * rarityMultiplier) + 15,
                    sideEffect: this.sideEffects[Math.floor(Math.random() * this.sideEffects.length)],
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    marketValue: Math.floor(Math.random() * 800 * rarityMultiplier) + 100,
                    visualTrait: {
                        shape: ['circle', 'square', 'hexagon', 'diamond'][Math.floor(Math.random() * 4)],
                        pattern: ['solid', 'striped', 'dotted', 'glow'][Math.floor(Math.random() * 4)],
                        glowIntensity: rarity === 'legendary' ? 4 : rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1
                    }
                };
                this.pills.push(pill);
            }
        }
        this.pills.sort(() => Math.random() - 0.5);
        console.log(`Generated ${this.pills.length} pills`);
    }

    getPillById(id) { return this.pills[id]; }
    getRandomPill() { return this.pills[Math.floor(Math.random() * this.pills.length)]; }
    getPillsByRarity(rarity) { return this.pills.filter(p => p.rarity === rarity); }
}
