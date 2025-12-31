import { Request, Response } from 'express';
import { db } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

interface ProjectRow {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    data: any; // Stored as string in DB, parsed to object
}

export class ProjectController {
    
    // GET /api/projects
    static getAll(req: Request, res: Response) {
        try {
            const stmt = db.prepare('SELECT id, title, description, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC');
            const projects = stmt.all();
            res.json(projects);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/projects/:id
    static getOne(req: Request, res: Response) {
        try {
            const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
            const project = stmt.get(req.params.id) as ProjectRow | undefined;
            
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            
            // Parse the JSON data field
            if (project.data && typeof project.data === 'string') {
                project.data = JSON.parse(project.data);
            }
            
            res.json(project);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/projects
    static create(req: Request, res: Response) {
        try {
            const { title, description } = req.body;
            const id = uuidv4();
            const now = new Date().toISOString();
            
            // Initial Empty Project State
            const initialData = {
                chapters: [],
                voiceMap: {},
                settings: { mode: 'single' }
            };

            const stmt = db.prepare(`
                INSERT INTO projects (id, title, description, createdAt, updatedAt, data)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(id, title, description, now, now, JSON.stringify(initialData));
            
            res.status(201).json({ id, title, description, createdAt: now });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/projects/:id
    static update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, description, data } = req.body;
            const now = new Date().toISOString();

            // We update individual fields or the big JSON blob
            // Dynamic query building would be better, but keeping it simple for now
            
            const updates = [];
            const params = [];
            
            if (title) { updates.push('title = ?'); params.push(title); }
            if (description) { updates.push('description = ?'); params.push(description); }
            if (data) { updates.push('data = ?'); params.push(JSON.stringify(data)); }
            
            updates.push('updatedAt = ?');
            params.push(now);
            
            params.push(id); // For WHERE clause

            const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
            const result = stmt.run(...params);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({ success: true, updatedAt: now });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/projects/:id
    static delete(req: Request, res: Response) {
        try {
            const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
            const result = stmt.run(req.params.id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }
            
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
