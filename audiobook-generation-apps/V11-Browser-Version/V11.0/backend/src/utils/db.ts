import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data');

if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH);
}

const db = new Database(path.join(DB_PATH, 'audiobook_studio.db'));

// Initialize Schema
const initDb = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            data JSON
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
    console.log('[Database] Initialized');
};

export { db, initDb };
