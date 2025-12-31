import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './utils/db';
import projectRoutes from './routes/projects';
import ttsRoutes from './routes/tts';

dotenv.config();

// Initialize Database
initDb();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tts', ttsRoutes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: '11.0.0', mode: 'hybrid-local' });
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`[Backend] Server running at http://localhost:${PORT}`);
});
