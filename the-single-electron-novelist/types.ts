export interface Character {
  id: string;
  name: string;
  bio: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface WorldContext {
  characters: Character[];
  locations: Location[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  content: string;
}

export interface NovelConcept {
  title: string;
  premise: string;
  style: string;
  theme: string;
}

export type AppPhase = 'concept' | 'outline' | 'writing';
