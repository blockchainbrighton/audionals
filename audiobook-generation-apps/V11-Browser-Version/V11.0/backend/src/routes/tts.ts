import { Router, Request, Response } from 'express';
import { TTSService } from '../services/ttsService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/tts/voices
router.get('/voices', async (req: Request, res: Response) => {
    try {
        const result = await TTSService.listVoices();
        res.json(result.voices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tts/generate
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { text, voice, speed } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const filename = `${uuidv4()}.wav`;
        const result = await TTSService.generate(text, voice, filename, speed);
        
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
