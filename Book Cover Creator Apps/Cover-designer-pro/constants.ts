import { AppMode, Asset, LayerId } from './types';

// In a real scenario, these SRCs would point to local paths like '/assets/poster/backgrounds/bg1.png'
// Using placeholder images for demonstration purposes so the UI renders correctly immediately.

export const POSTER_ASSETS: Asset[] = [
  // Backgrounds
  { id: 'bg1', name: 'Album Collage', category: 'background', src: 'https://picsum.photos/id/237/1200/800' },
  { id: 'bg2', name: 'Dressing Room', category: 'background', src: 'https://picsum.photos/id/238/1200/800' },
  { id: 'bg3', name: 'Vinyl Wall', category: 'background', src: 'https://picsum.photos/id/239/1200/800' },
  // Characters
  { id: 'char1', name: 'Burgess Stand', category: 'character', src: 'https://picsum.photos/id/64/300/600' },
  { id: 'char2', name: 'Burgess Jump', category: 'character', src: 'https://picsum.photos/id/65/300/600' },
  // Text
  { id: 'txt1', name: 'Retro Funk', category: 'text', src: 'https://picsum.photos/id/100/600/200' },
  { id: 'txt2', name: 'Neon Lights', category: 'text', src: 'https://picsum.photos/id/101/600/200' },
];

export const BOOK_ASSETS: Asset[] = [
  // Covers (Backgrounds for books)
  { id: 'cover1', name: 'Dark Mystery', category: 'cover', src: 'https://picsum.photos/id/10/800/1200' },
  { id: 'cover2', name: 'Sci-Fi Future', category: 'cover', src: 'https://picsum.photos/id/11/800/1200' },
  { id: 'cover3', name: 'Romance', category: 'cover', src: 'https://picsum.photos/id/12/800/1200' },
  // Titles (Middle Layer)
  { id: 'title1', name: 'The Lost City', category: 'title', src: 'https://picsum.photos/id/200/500/150' },
  { id: 'title2', name: 'Cyber Dreams', category: 'title', src: 'https://picsum.photos/id/201/500/150' },
  // Authors (Top Layer)
  { id: 'auth1', name: 'John Doe', category: 'author', src: 'https://picsum.photos/id/300/400/100' },
  { id: 'auth2', name: 'Jane Smith', category: 'author', src: 'https://picsum.photos/id/301/400/100' },
];

export const INITIAL_STATE_POSTER = {
  [LayerId.BACKGROUND]: { id: LayerId.BACKGROUND, assetId: 'bg1', x: 0, y: 0, scale: 100, visible: true, zIndex: 0 },
  [LayerId.MIDDLE]: { id: LayerId.MIDDLE, assetId: 'char1', x: 50, y: 50, scale: 100, visible: true, zIndex: 2 }, // Character above text usually? Or Text above? Original had Character z=2
  [LayerId.TOP]: { id: LayerId.TOP, assetId: 'txt1', x: 50, y: 20, scale: 100, visible: true, zIndex: 1 },
};

export const INITIAL_STATE_BOOK = {
  [LayerId.BACKGROUND]: { id: LayerId.BACKGROUND, assetId: 'cover1', x: 0, y: 0, scale: 100, visible: true, zIndex: 0 },
  [LayerId.MIDDLE]: { id: LayerId.MIDDLE, assetId: 'title1', x: 50, y: 20, scale: 100, visible: true, zIndex: 10 },
  [LayerId.TOP]: { id: LayerId.TOP, assetId: 'auth1', x: 50, y: 80, scale: 100, visible: true, zIndex: 10 },
};

export const MODE_CONFIG = {
  [AppMode.POSTER]: {
    label: 'Poster Designer',
    aspectRatio: 'aspect-[3/2]', // 3:2 Landscape
    width: 1200,
    height: 800,
    tabs: [
      { id: LayerId.BACKGROUND, label: 'Backgrounds', category: 'background' },
      { id: LayerId.MIDDLE, label: 'Character', category: 'character' },
      { id: LayerId.TOP, label: 'Text Styles', category: 'text' },
    ]
  },
  [AppMode.BOOK]: {
    label: 'Book Cover Designer',
    aspectRatio: 'aspect-[1/1.6]', // Standard Book Ratio
    width: 1000,
    height: 1600,
    tabs: [
      { id: LayerId.BACKGROUND, label: 'Cover Art', category: 'cover' },
      { id: LayerId.MIDDLE, label: 'Title', category: 'title' },
      { id: LayerId.TOP, label: 'Author', category: 'author' },
    ]
  }
};
