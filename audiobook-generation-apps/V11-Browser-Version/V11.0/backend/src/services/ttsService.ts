import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PYTHON_PATH = path.join(process.cwd(), '..', 'local-tts-engines', 'kokoro-tts', 'venv', 'bin', 'python');
const SCRIPT_PATH = path.join(process.cwd(), 'python', 'generate_tts.py');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export class TTSService {

    static async listVoices() {
        return this.runPythonCommand({ command: 'list_voices' });
    }

    static async generate(text: string, voice: string, filename: string, speed: number = 1.0) {
        const outputPath = path.join(OUTPUT_DIR, filename);
        const result = await this.runPythonCommand({
            command: 'generate',
            text,
            voice,
            output_path: outputPath,
            speed
        });
        
        if (result.status === 'success') {
            return {
                status: 'success',
                url: `/audio/${filename}`,
                outputPath
            };
        }
        throw new Error(result.message || 'TTS Generation failed');
    }

    private static runPythonCommand(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const py = spawn(PYTHON_PATH, [SCRIPT_PATH]);
            let output = '';
            let error = '';

            py.stdin.write(JSON.stringify(data));
            py.stdin.end();

            py.stdout.on('data', (chunk) => {
                output += chunk.toString();
            });

            py.stderr.on('data', (chunk) => {
                error += chunk.toString();
            });

            py.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    console.error(`Stderr: ${error}`);
                    return reject(new Error(`Python Error: ${error || 'Unknown error'}`));
                }
                try {
                    resolve(JSON.parse(output));
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${output}`));
                }
            });
        });
    }
}
