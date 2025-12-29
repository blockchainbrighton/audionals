import { CAMPAIGN_DATA } from '../data/campaign.js';

export class ProgressionManager {
    constructor(game) {
        this.game = game;
        this.unlockedFlags = new Set();
        this.completedMissions = new Set();
        this.activeMissionId = null;
        this.campaign = CAMPAIGN_DATA;
    }

    init() {
        console.log("ProgressionManager initialized");
        this.setupEventListeners();
        // Start first mission if no active mission and no completions
        if (!this.activeMissionId && this.completedMissions.size === 0) {
            this.startMission(this.campaign[0].id);
        }
    }

    setupEventListeners() {
        this.game.events.on('ENEMY_KILLED', (enemy) => this.checkMissionProgress('KILL', enemy));
        this.game.events.on('ITEM_BOUGHT', (data) => this.checkMissionProgress('BUY', data));
        this.game.events.on('LOCATION_ENTERED', (data) => this.checkMissionProgress('INTERACT', data));
    }

    update(dt) {
         if (!this.activeMissionId) return;
         const mission = this.campaign.find(m => m.id === this.activeMissionId);
         if (!mission) return;

         if (mission.type === 'GOTO') {
             // Coordinate Check for Zone
             if (mission.targetZone === 'zone_casino_district') {
                 // Temporary coordinate check for Casino District entrance (approximate)
                 // Assuming Casino is North East for now, or just use a generic distance check if targetX/Y were provided.
                 // Since we don't have hard coords in the campaign data yet for zones, we might need to rely on map region logic later.
                 // For now, let's assume if player enters 'zone_casino_district' via zoneManager
                 
                 const zone = this.game.zoneManager.zones.find(z => z.id === 'zone_casino_district'); // Check if zone exists
                 if (zone) {
                      if (this.game.zoneManager.isEnemyInZone(this.game.player, zone)) { // Reuse 'isEnemyInZone' for player check
                           this.completeMission(this.activeMissionId);
                      }
                 } else {
                     // Fallback if zone not defined: Check arbitrary coordinates (e.g., top right corner)
                     if (this.game.player.x > 200 * this.game.config.TILE_SIZE && this.game.player.y < 50 * this.game.config.TILE_SIZE) {
                         this.completeMission(this.activeMissionId);
                     }
                 }
             }
         }
    }

    checkMissionProgress(eventType, data) {
        if (!this.activeMissionId) return;
        const mission = this.campaign.find(m => m.id === this.activeMissionId);
        if (!mission) return;

        if (mission.type === eventType) {
            if (eventType === 'KILL') {
                if (data.typeId === mission.targetType || mission.targetType === 'any') {
                    if (!mission.progress) mission.progress = 0;
                    mission.progress++;
                    if (mission.progress >= (mission.count || 1)) {
                        this.completeMission(this.activeMissionId);
                    } else {
                        // Optional: update counter in HUD?
                        // this.game.hud.updateMissionCounter(mission.progress, mission.count);
                    }
                }
            }
            else if (eventType === 'BUY') {
                if (data.itemId === mission.itemId) {
                    this.completeMission(this.activeMissionId);
                }
            }
            else if (eventType === 'INTERACT') {
                if (data.targetId === mission.targetId) {
                    this.completeMission(this.activeMissionId);
                } 
                else if (mission.targetId === 'slot_machine' && data.subType === 'SLOTS') {
                    this.completeMission(this.activeMissionId);
                }
            }
        }
    }

    startMission(missionId) {
        const mission = this.campaign.find(m => m.id === missionId);
        if (!mission) {
            console.warn(`Mission ${missionId} not found.`);
            return;
        }

        this.activeMissionId = missionId;
        console.log(`Started Mission: ${mission.title}`);
        
        if (this.game.hud && this.game.hud.updateMissionDisplay) {
            this.game.hud.updateMissionDisplay(mission);
        } else {
             this.game.utils.addMessage(`NEW MISSION: ${mission.title}`);
        }
    }

    completeMission(missionId) {
        if (this.completedMissions.has(missionId)) return;

        const mission = this.campaign.find(m => m.id === missionId);
        if (!mission) return;

        console.log(`Completed Mission: ${mission.title}`);
        this.completedMissions.add(missionId);
        this.activeMissionId = null;

        if (mission.unlocks) {
            mission.unlocks.forEach(flag => this.unlockFlag(flag));
        }

        if (mission.reward) {
            this.processRewards(mission.reward);
        }
        
        this.game.utils.addMessage(`MISSION COMPLETED: ${mission.title}`);
        if(this.game.soundManager && this.game.soundManager.playPowerUp) {
            this.game.soundManager.playPowerUp(this.game.player.x, this.game.player.y);
        }

        const nextMissions = this.campaign.filter(m => m.prereq === missionId);
        if (nextMissions.length > 0) {
            setTimeout(() => this.startMission(nextMissions[0].id), 2000); // Delay for effect
        } else {
            console.log("No immediate follow-up mission found.");
            if (this.game.hud && this.game.hud.clearMissionDisplay) {
                 this.game.hud.clearMissionDisplay();
            }
        }
    }

    processRewards(reward) {
        if (reward.money) {
            this.game.player.earnMoney(reward.money);
        }
        
        if (reward.item) {
             let item = this.game.itemManager.createItemById(reward.item);
             if (!item) item = this.game.itemManager.createWeaponItem(reward.item);
             if (!item && reward.item.includes('ammo')) item = this.game.itemManager.createAmmoItem(reward.item, 24);

             if (item) {
                 const added = this.game.player.addItem(item);
                 if (!added) {
                      this.game.itemManager.dropItem(item, this.game.player.x, this.game.player.y);
                      this.game.utils.addMessage("Inventory full. Reward dropped.");
                 }
             }
        }
    }

    unlockFlag(flag) {
        if (!this.unlockedFlags.has(flag)) {
            this.unlockedFlags.add(flag);
            console.log(`Unlocked Feature: ${flag}`);
            this.game.events.emit('FEATURE_UNLOCKED', flag);
        }
    }

    checkFlag(flag) {
        return this.unlockedFlags.has(flag);
    }
    
    getState() {
        return {
            unlockedFlags: Array.from(this.unlockedFlags),
            completedMissions: Array.from(this.completedMissions),
            activeMissionId: this.activeMissionId
        };
    }

    loadState(state) {
        if (!state) return;
        this.unlockedFlags = new Set(state.unlockedFlags || []);
        this.completedMissions = new Set(state.completedMissions || []);
        this.activeMissionId = state.activeMissionId;
        
        if (this.activeMissionId) {
             const mission = this.campaign.find(m => m.id === this.activeMissionId);
             if (mission && this.game.hud && this.game.hud.updateMissionDisplay) {
                this.game.hud.updateMissionDisplay(mission);
             }
        }
    }
}