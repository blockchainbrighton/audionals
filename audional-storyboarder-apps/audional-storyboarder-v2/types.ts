export enum AppState {
  IDLE,
  GENERATING,
  VIEWING,
  ERROR
}

export interface StoryPage {
  pageNumber: number;
  title: string;
  visualDescription: string;
  content: string;
  keyTakeaway: string;
  imageUrl?: string; // Base64 data string
}

export interface BookletData {
  targetAudience: string;
  tone: string;
  pages: StoryPage[];
}

export interface NavItem {
  label: string;
  id: string;
}