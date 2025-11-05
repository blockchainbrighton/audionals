const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');
const { URL } = require('url');

const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

function elevenLabsRequest(endpoint, method, headers, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers
    };

    const req = https.request(options, (res) => {
      if (method === 'GET' && endpoint.includes('/voices')) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`API error: ${res.statusCode} ${data}`));
          }
        });
      } else {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
      }
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function getVoices(apiKey) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  const response = await elevenLabsRequest('https://api.elevenlabs.io/v2/voices', 'GET', headers);
  return response.voices || [];
}

async function generateAudio(text, voiceId, apiKey, settings = {}) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  const body = {
    text,
    model_id: DEFAULT_MODEL_ID,
    voice_settings: {
      stability: settings.stability ?? 0.5,
      similarity_boost: settings.similarity_boost ?? 0.75,
      style: settings.style ?? 0,
      speed: settings.speed ?? 1.0
    }
  };

  return elevenLabsRequest(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    'POST',
    headers,
    body
  );
}

function mergeAudioFiles(inputFiles, outputFile) {
  return new Promise((resolve, reject) => {
    const listFile = `${outputFile}.list`;
    const listContent = inputFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    const args = ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputFile];
    const ffmpeg = spawn('ffmpeg', args, { stdio: 'pipe' });

    ffmpeg.on('close', (code) => {
      fs.unlinkSync(listFile);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

function normalizeAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    const args = ['-i', inputFile, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', outputFile];
    const ffmpeg = spawn('ffmpeg', args, { stdio: 'pipe' });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg normalization failed with code ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

module.exports = {
  getVoices,
  generateAudio,
  mergeAudioFiles,
  normalizeAudio
};
