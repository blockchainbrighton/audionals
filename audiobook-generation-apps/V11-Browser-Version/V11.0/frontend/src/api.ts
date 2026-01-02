const API_BASE_URL = 'http://localhost:3000/api';

export interface Project {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    data?: any;
}

export const api = {
    async getProjects(): Promise<Project[]> {
        const res = await fetch(`${API_BASE_URL}/projects`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    async getProject(id: string): Promise<Project> {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`);
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
    },

    async createProject(title: string, description: string): Promise<Project> {
        const res = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description }),
        });
        if (!res.ok) throw new Error('Failed to create project');
        return res.json();
    },

    async updateProject(id: string, payload: Partial<Project>): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update project');
    },

    async deleteProject(id: string): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    // TTS
    async getVoices(): Promise<{id: string, name: string, gender: string}[]> {
        const res = await fetch(`${API_BASE_URL}/tts/voices`);
        if (!res.ok) throw new Error('Failed to fetch voices');
        return res.json();
    },

    async generateAudio(text: string, voice: string, speed: number = 1.0): Promise<{url: string, outputPath: string}> {
        const res = await fetch(`${API_BASE_URL}/tts/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice, speed }),
        });
        if (!res.ok) throw new Error('Failed to generate audio');
        return res.json();
    },

    async mergeAudio(chunks: string[], chapterTitle: string): Promise<{url: string}> {
        const res = await fetch(`${API_BASE_URL}/audio/merge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunks, chapterTitle }),
        });
        if (!res.ok) throw new Error('Failed to merge audio');
        return res.json();
    }
};
