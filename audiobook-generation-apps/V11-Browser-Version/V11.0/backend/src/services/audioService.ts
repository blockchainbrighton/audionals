import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const PUBLIC_DIR = path.join(process.cwd(), '..', 'public');

export class AudioService {

    static mergeChunks(chunkPaths: string[], outputFilename: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (chunkPaths.length === 0) {
                return reject(new Error("No chunks provided for merging"));
            }

            const outputPath = path.join(PUBLIC_DIR, 'audio', outputFilename);
            const cmd = ffmpeg();

            // Validate that files exist
            const validPaths = chunkPaths.map(p => {
                // Ensure path is absolute or relative to root correctly
                // chunkPaths come as "/audio/xyz.wav", we need local fs paths
                const relative = p.startsWith('/audio/') ? p.replace('/audio/', '') : p;
                return path.join(PUBLIC_DIR, 'audio', relative);
            }).filter(p => fs.existsSync(p));

            if (validPaths.length === 0) {
                return reject(new Error("No valid audio files found to merge"));
            }

            validPaths.forEach(p => cmd.input(p));

            cmd.on('error', (err) => {
                console.error('FFmpeg Merge Error:', err);
                reject(err);
            })
            .on('end', () => {
                console.log(`Merged ${validPaths.length} files to ${outputFilename}`);
                resolve(`/audio/${outputFilename}`);
            })
            .mergeToFile(outputPath, path.join(process.cwd(), 'temp'));
        });
    }
}
