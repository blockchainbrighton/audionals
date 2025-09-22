import { SaveGamePayload } from '@game/types';

interface SaveSystemConfig {
  storageKey: string;
  version: number;
}

export default class SaveSystem {
  private readonly storageKey: string;
  private readonly version: number;

  constructor(config: SaveSystemConfig) {
    this.storageKey = config.storageKey;
    this.version = config.version;
  }

  listSaves(): Array<SaveGamePayload | null> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [null, null, null];
    }
    try {
      const saves = JSON.parse(raw) as Array<SaveGamePayload | null>;
      const sanitized: Array<SaveGamePayload | null> = [null, null, null];
      saves.forEach((save, index) => {
        if (index < 3 && save && save.version <= this.version) {
          sanitized[index] = save;
        }
      });
      return sanitized;
    } catch (error) {
      console.warn('Failed to parse save data', error);
      return [null, null, null];
    }
  }

  saveSlot(slot: number, payload: SaveGamePayload): void {
    const existing = this.listSaves();
    const saves: Array<SaveGamePayload | null> = [...existing];
    const safeSlot = Math.min(Math.max(slot, 0), 2);
    saves[safeSlot] = {
      ...payload,
      version: this.version,
      updatedAt: Date.now()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(saves));
  }

  loadSlot(slot: number): SaveGamePayload | undefined {
    return this.listSaves()[slot] ?? undefined;
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
