import { NovelConcept, Chapter, WorldContext, AppPhase } from '../types';

const STORAGE_KEY = 'single_electron_novel_data';

export interface ProjectState {
  concept: NovelConcept;
  outline: Chapter[];
  worldContext: WorldContext;
  phase: AppPhase;
  lastUpdated: number;
}

export const saveLocal = (state: ProjectState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }
};

export const loadLocal = (): ProjectState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load from local storage", e);
    return null;
  }
};

export const clearLocal = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const downloadJSON = (state: ProjectState) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `novel_project_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

export const uploadJSON = (file: File): Promise<ProjectState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (json.concept && json.outline) {
            resolve(json);
        } else {
            reject(new Error("Invalid project file format"));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};
