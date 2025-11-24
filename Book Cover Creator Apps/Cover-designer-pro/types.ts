export enum AppMode {
  POSTER = 'POSTER',
  BOOK = 'BOOK',
}

export enum LayerId {
  BACKGROUND = 'background', // Base layer (Poster Background / Book Cover)
  MIDDLE = 'middle',         // Middle layer (Poster Character / Book Title)
  TOP = 'top',               // Top layer (Poster Text / Book Author)
}

export interface Asset {
  id: string;
  name: string;
  src: string;
  category: 'background' | 'character' | 'text' | 'cover' | 'title' | 'author';
}

export interface LayerState {
  id: LayerId;
  assetId: string | null;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  scale: number; // Percentage 50-200
  visible: boolean;
  zIndex: number;
}

export interface AppState {
  mode: AppMode;
  layers: Record<LayerId, LayerState>;
  activeTab: LayerId;
}
