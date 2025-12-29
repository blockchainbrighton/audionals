export class DialogueManager {
    constructor(game) {
        this.game = game;
        this.activeDialogue = null;
        this.currentNodeId = null;
        this.overlayElement = null;
        this.dialogueTrees = {};
        this.onDialogueEndCallback = null;
    }

    init() {
        console.log("DialogueManager initialized");
        this.createOverlay();
        // Load initial dialogue data (could be fetched from JSON files later)
        this.loadDialogues();
    }

    createOverlay() {
        if (document.getElementById('dialogueOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'dialogueOverlay';
        overlay.style.display = 'none';
        
        // Structure
        overlay.innerHTML = `
            <div class="dialogue-box">
                <div class="dialogue-header">
                    <span id="dialogueSpeakerName">UNKNOWN</span>
                    <span class="dialogue-blink">_</span>
                </div>
                <div id="dialogueText" class="dialogue-text"></div>
                <div id="dialogueOptions" class="dialogue-options"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.overlayElement = overlay;
    }

    loadDialogues() {
        // Hardcoded for now, move to game/data/dialogues.js later
        this.dialogueTrees = {
            "neon_shade_intro": {
                "start": {
                    text: "You look lost, kid. Or maybe just broke. Either way, you're blocking my view of the floor.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "I'm looking for information.", next: "ask_info" },
                        { text: "Just passing through.", next: "end_rude" }
                    ]
                },
                "ask_info": {
                    text: "Information is the only commodity that matters here. And it isn't free. 500 Cycles. Up front.",
                    speaker: "Neon_Shade",
                    options: [
                        { 
                            text: "[PAY 500c] I need to know about the Undercity.", 
                            next: "reveal_undercity",
                            condition: (game) => game.player.money >= 500,
                            action: (game) => game.player.spendMoney(500)
                        },
                        { text: "I don't have that kind of scratch.", next: "end_poor" }
                    ]
                },
                "reveal_undercity": {
                    text: "The Undercity... Sector Zero. You got a death wish? Fine. The entrance is behind the old maintenance door in the Alley. You'll need a keycard.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "Where do I get a keycard?", next: "keycard_info" },
                        { text: "Thanks.", next: "end_success" }
                    ]
                },
                "keycard_info": {
                    text: "Not my problem. Check the Enforcers. One of them is bound to have dropped one.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "Understood.", next: "end_success" }
                    ]
                },
                "end_rude": {
                    text: "Then pass through faster.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "[Leave]", next: null }
                    ]
                },
                "end_poor": {
                    text: "Then come back when you do. Latency is fatal.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "[Leave]", next: null }
                    ]
                },
                "end_success": {
                    text: "Don't mention my name.",
                    speaker: "Neon_Shade",
                    options: [
                        { text: "[Leave]", next: null }
                    ]
                }
            }
        };
    }

    startDialogue(treeId, callback = null) {
        if (!this.dialogueTrees[treeId]) {
            console.error(`Dialogue tree '${treeId}' not found.`);
            return;
        }

        this.activeDialogue = this.dialogueTrees[treeId];
        this.currentNodeId = 'start';
        this.onDialogueEndCallback = callback;
        
        this.game.paused = true; // Pause game logic
        this.overlayElement.style.display = 'flex';
        
        this.renderNode();
    }

    renderNode() {
        const node = this.activeDialogue[this.currentNodeId];
        if (!node) {
            this.endDialogue();
            return;
        }

        // Update UI
        const nameEl = document.getElementById('dialogueSpeakerName');
        const textEl = document.getElementById('dialogueText');
        const optionsEl = document.getElementById('dialogueOptions');

        nameEl.textContent = node.speaker || "UNKNOWN";
        nameEl.style.color = node.speaker === "Neon_Shade" ? "#F0F" : "#0FF"; // Simple color coding

        textEl.innerHTML = "";
        this.typewriterEffect(textEl, node.text, 20); // Speed 20ms

        optionsEl.innerHTML = '';
        
        // Wait for typewriter to finish? For now, just show options immediately but maybe disable them briefly?
        // Let's just render them.
        
        if (node.options) {
            node.options.forEach((opt, index) => {
                // Check conditions
                if (opt.condition && !opt.condition(this.game)) {
                    return; // Skip option if condition not met (or render disabled?)
                }

                const btn = document.createElement('button');
                btn.className = 'dialogue-option-btn';
                btn.textContent = `> ${opt.text}`;
                btn.onclick = () => this.selectOption(opt);
                optionsEl.appendChild(btn);
            });
        } else {
            // Default "End" if no options provided
            const btn = document.createElement('button');
            btn.className = 'dialogue-option-btn';
            btn.textContent = "> [End Transmission]";
            btn.onclick = () => this.endDialogue();
            optionsEl.appendChild(btn);
        }
    }

    selectOption(option) {
        if (option.action) {
            option.action(this.game);
        }

        if (option.next) {
            this.currentNodeId = option.next;
            this.renderNode();
        } else {
            this.endDialogue();
        }
    }

    endDialogue() {
        this.overlayElement.style.display = 'none';
        this.game.paused = false;
        this.activeDialogue = null;
        this.currentNodeId = null;
        
        if (this.onDialogueEndCallback) {
            this.onDialogueEndCallback();
            this.onDialogueEndCallback = null;
        }
    }

    typewriterEffect(element, text, speed) {
        let i = 0;
        element.innerHTML = "";
        const interval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    }
}
