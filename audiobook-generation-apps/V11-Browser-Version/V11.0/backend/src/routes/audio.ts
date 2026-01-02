import { Router, Request, Response } from 'express';
import { AudioService } from '../services/audioService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/audio/merge
router.post('/merge', async (req: Request, res: Response) => {
    try {
        const { chunks, chapterTitle } = req.body;
        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
            return res.status(400).json({ error: 'List of chunks is required' });
        }

        const safeTitle = (chapterTitle || 'chapter').replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeTitle}_${uuidv4()}.wav`;

        const url = await AudioService.mergeChunks(chunks, filename);
        res.json({ url });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
