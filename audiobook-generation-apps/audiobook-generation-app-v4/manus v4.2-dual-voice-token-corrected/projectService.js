const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const { URL } = require('url');
const { createHash } = require('crypto');

const DEMO_PRESET_CONFIGS = [
  {
    name: 'Balanced Narrator',
    settings: { stability: 0.55, similarity_boost: 0.78, style: 0.2, speed: 1.0 }
  },
  {
    name: 'Dramatic Storyteller',
    settings: { stability: 0.4, similarity_boost: 0.7, style: 0.75, speed: 1.05 }
  },
  {
    name: 'Calm Documentary',
    settings: { stability: 0.75, similarity_boost: 0.85, style: 0.1, speed: 0.95 }
  },
  {
    name: 'Energetic Presenter',
    settings: { stability: 0.45, similarity_boost: 0.65, style: 0.6, speed: 1.18 }
  },
  {
    name: 'Crisp Newsreader',
    settings: { stability: 0.6, similarity_boost: 0.9, style: 0.15, speed: 1.12 }
  }
];

function slugifyForFile(value) {
  if (!value || typeof value !== 'string') {
    return 'audiobook';
  }

  let normalized = value;
  if (typeof normalized.normalize === 'function') {
    normalized = normalized.normalize('NFKD');
  }

  return normalized
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase() || 'audiobook';
}

function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function resolveSeriesNumber(input) {
  return parsePositiveInteger(input);
}

function buildProjectFilePrefix(project) {
  const titleSlug = slugifyForFile(project.title || 'audiobook');
  const seriesNumber = resolveSeriesNumber(project.seriesNumber);
  const seriesSuffix = seriesNumber ? `_s${String(seriesNumber).padStart(2, '0')}` : '';
  const projectFragment = project.id ? `_${project.id.slice(0, 6)}` : '';
  return `${titleSlug}${seriesSuffix}${projectFragment}`;
}

function getChapterFileBase(project, chapterIndex, chapter = null) {
  let sequenceNumber = null;
  if (chapter && typeof chapter.sequenceNumber === 'number' && chapter.sequenceNumber > 0) {
    sequenceNumber = chapter.sequenceNumber;
  }
  if (sequenceNumber === null && Array.isArray(project.chapters)) {
    const candidate = project.chapters[chapterIndex] && project.chapters[chapterIndex].sequenceNumber;
    if (typeof candidate === 'number' && candidate > 0) {
      sequenceNumber = candidate;
    }
  }
  if (sequenceNumber === null) {
    sequenceNumber = chapterIndex + 1;
  }

  const chapterNumber = String(sequenceNumber).padStart(2, '0');
  return `${buildProjectFilePrefix(project)}_ch${chapterNumber}`;
}

function detectChapterNumberFromTitle(title) {
  if (typeof title !== 'string') {
    return null;
  }
  const match = title.match(/\d+/);
  if (!match) {
    return null;
  }
  const parsed = parseInt(match[0], 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function assignChapterSequenceNumbers(project, options = {}) {
  if (!project || !Array.isArray(project.chapters)) {
    return;
  }

  const autoDetect = options.autoDetectChapterNumbers !== false;
  const baseline = typeof options.chapterStartNumber === 'number' && options.chapterStartNumber > 0
    ? options.chapterStartNumber
    : 1;
  let runningNumber = baseline;

  project.chapters.forEach((chapter, index) => {
    if (!chapter || typeof chapter !== 'object') {
      return;
    }

    let sequenceNumber = typeof chapter.sequenceNumber === 'number' && chapter.sequenceNumber > 0
      ? chapter.sequenceNumber
      : null;

    if (sequenceNumber === null && autoDetect) {
      const detected = detectChapterNumberFromTitle(chapter.title);
      if (detected !== null && detected >= baseline) {
        if (index === 0 || detected >= runningNumber) {
          sequenceNumber = detected;
          runningNumber = detected + 1;
        }
      }
    }

    if (sequenceNumber === null) {
      sequenceNumber = runningNumber;
      runningNumber += 1;
    } else if (sequenceNumber >= runningNumber) {
      runningNumber = sequenceNumber + 1;
    }

    chapter.sequenceNumber = sequenceNumber;
  });
}

function createProjectService(options = {}) {
  const baseDir = options.baseDir || __dirname;
  const outputDir = options.outputDir || path.join(baseDir, 'output');
  const chunksDir = path.join(outputDir, 'chunks');
  const chaptersDir = path.join(outputDir, 'chapters');
  const bookDir = path.join(outputDir, 'book');
  const dataFile = options.dataFile || path.join(outputDir, 'projects.json');

  [outputDir, chunksDir, chaptersDir, bookDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  let updateHandler = typeof options.onUpdate === 'function' ? options.onUpdate : () => {};
  let projects = loadProjects();

  Object.values(projects).forEach((project) => {
    if (!project || typeof project !== 'object') {
      return;
    }
    const normalizedSeries = resolveSeriesNumber(project.seriesNumber);
    if (normalizedSeries !== null) {
      project.seriesNumber = normalizedSeries;
    } else if (project.seriesNumber !== undefined) {
      delete project.seriesNumber;
    }

    const normalizedStart = parsePositiveInteger(project.chapterStartNumber);
    project.chapterStartNumber = normalizedStart;
    if (project.autoDetectChapterNumbers === undefined) {
      project.autoDetectChapterNumbers = true;
    } else {
      project.autoDetectChapterNumbers = Boolean(project.autoDetectChapterNumbers);
    }

    assignChapterSequenceNumbers(project, {
      autoDetectChapterNumbers: project.autoDetectChapterNumbers,
      chapterStartNumber: normalizedStart || 1
    });
  });

  function setUpdateHandler(handler) {
    updateHandler = typeof handler === 'function' ? handler : () => {};
  }

  function sendUpdate(projectId, payload) {
    try {
      updateHandler(projectId, payload);
    } catch (error) {
      console.error('Error notifying update handler:', error);
    }
  }

  function loadProjects() {
    if (!fs.existsSync(dataFile)) {
      return {};
    }

    try {
      const raw = fs.readFileSync(dataFile, 'utf8');
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('Error loading projects:', error);
      return {};
    }
  }

  function saveProjects() {
    fs.writeFileSync(dataFile, JSON.stringify(projects, null, 2));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  function parseManuscript(text, mode, options = {}) {
    const chapters = [];
    const voiceSwitchToken = options.voiceSwitchToken || '*​*​*';

    if (mode === 'single') {
      const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;
      const matches = [...text.matchAll(chapterRegex)];

      if (matches.length === 0) {
        chapters.push({
          title: 'Full Text',
          content: text.trim(),
          voice: null
        });
      } else {
        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index;
          const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
          const chapterText = text.substring(start, end).trim();
          const title = matches[i][0].replace(/^#+\s*/, '').trim();

          chapters.push({
            title: title || `Chapter ${i + 1}`,
            content: chapterText,
            voice: null
          });
        }
      }
    } else if (mode === 'dual') {
      const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;
      const matches = [...text.matchAll(chapterRegex)];

      if (matches.length === 0) {
        chapters.push({
          title: 'Full Text',
          content: text.trim(),
          voice: null,
          segments: parseDualVoiceSegments(text.trim(), voiceSwitchToken)
        });
      } else {
        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index;
          const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
          const chapterText = text.substring(start, end).trim();
          const title = matches[i][0].replace(/^#+\s*/, '').trim();

          chapters.push({
            title: title || `Chapter ${i + 1}`,
            content: chapterText,
            voice: null,
            segments: parseDualVoiceSegments(chapterText, voiceSwitchToken)
          });
        }
      }
    }

    return chapters;
  }

  function parseDualVoiceSegments(text, delimiter = '*​*​*') {
    const segments = [];
    const token = delimiter && typeof delimiter === 'string' && delimiter.length > 0 ? delimiter : '*​*​*';
    const parts = token ? text.split(token) : [text];

    for (let i = 0; i < parts.length; i++) {
      const content = parts[i].trim();
      if (content) {
        segments.push({
          content,
          voiceIndex: i % 2
        });
      }
    }

    return segments;
  }

  function extractDemoSampleText(text, sentenceCount = 2, maxChars = 600) {
    if (!text) {
      return '';
    }
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (!sentences || sentences.length === 0) {
      return text.slice(0, maxChars).trim();
    }

    let collected = '';
    for (let i = 0; i < sentences.length && i < sentenceCount; i++) {
      const candidate = (collected + ' ' + sentences[i]).trim();
      if (candidate.length > maxChars && collected) {
        break;
      }
      collected = candidate;
    }

    if (!collected) {
      collected = sentences.slice(0, sentenceCount).join(' ').trim();
    }

    if (collected.length > maxChars) {
      collected = collected.slice(0, maxChars).trim();
    }

    return collected;
  }

  function buildPresetShowcaseChapter(manuscript, options = {}) {
    const baseSettings = options.baseSettings || {};
    const sampleText = (options.sampleText && options.sampleText.trim()) || extractDemoSampleText(manuscript);
    const sequences = DEMO_PRESET_CONFIGS.map((preset, index) => ({
      name: preset.name,
      announcement: `Preset ${index + 1}: ${preset.name}. Sample lines follow.`,
      sampleText,
      settings: { ...baseSettings, ...preset.settings }
    }));

    return {
      title: 'Preset Showcase Demo',
      content: sampleText,
      voice: null,
      presetShowcase: true,
      sequences
    };
  }

  function getVoiceSettings(project, voiceIndex) {
    const baseSettings = project.settings || {};
    if (!project.voiceSettings || !Array.isArray(project.voiceSettings)) {
      return { ...baseSettings };
    }

    const voiceSpecific = project.voiceSettings[voiceIndex];
    if (!voiceSpecific || typeof voiceSpecific !== 'object') {
      return { ...baseSettings };
    }

    return {
      stability: voiceSpecific.stability !== undefined ? voiceSpecific.stability : baseSettings.stability,
      similarity_boost: voiceSpecific.similarity_boost !== undefined ? voiceSpecific.similarity_boost : baseSettings.similarity_boost,
      style: voiceSpecific.style !== undefined ? voiceSpecific.style : baseSettings.style,
      speed: voiceSpecific.speed !== undefined ? voiceSpecific.speed : baseSettings.speed
    };
  }

  function splitIntoChunks(text, maxChars = 4500) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  function elevenLabsRequest(endpoint, method, headers, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: headers
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

    const data = await elevenLabsRequest(
      'https://api.elevenlabs.io/v2/voices',
      'GET',
      headers
    );

    return data.voices || [];
  }

  async function generateAudio(text, voiceId, apiKey, settings = {}) {
    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    };

    const body = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: settings.stability ?? 0.5,
        similarity_boost: settings.similarity_boost ?? 0.75,
        style: settings.style ?? 0,
        speed: settings.speed ?? 1.0
      }
    };

    const audioBuffer = await elevenLabsRequest(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      'POST',
      headers,
      body
    );

    return audioBuffer;
  }

  function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
      const listFile = outputFile + '.list';
      const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
      fs.writeFileSync(listFile, listContent);

      const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-c', 'copy',
        outputFile
      ];

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
      const args = [
        '-y',
        '-i', inputFile,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ar', '44100',
        outputFile
      ];

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

  async function processChapter(project, chapterIndex) {
    const chapter = project.chapters[chapterIndex];
    const chapterBase = getChapterFileBase(project, chapterIndex, chapter);
    const chapterSequenceNumber = (chapter && typeof chapter.sequenceNumber === 'number' && chapter.sequenceNumber > 0)
      ? chapter.sequenceNumber
      : chapterIndex + 1;
    const isDemo = Boolean(project.demoMode);
    const demoCharLimit = typeof project.demoCharLimit === 'number' && project.demoCharLimit > 0 ? project.demoCharLimit : 600;
    const demoChunksPerSegment = typeof project.demoChunksPerSegment === 'number' && project.demoChunksPerSegment > 0 ? project.demoChunksPerSegment : 1;
    const demoSegmentsPerChapter = typeof project.demoSegmentsPerChapter === 'number' && project.demoSegmentsPerChapter > 0 ? project.demoSegmentsPerChapter : 2;

    sendUpdate(project.id, {
      type: 'chapter_start',
      chapterIndex,
      title: chapter.title
    });

    const existingSegments = Array.isArray(chapter.segments) ? chapter.segments : [];
    chapter.status = 'processing';
    if (project.mode === 'single') {
      chapter.segments = [];
    } else {
      chapter.segments = existingSegments;
    }
    saveProjects();

    try {
      const chunkFiles = [];

      if (project.mode === 'single') {
        const singleVoiceSettings = getVoiceSettings(project, 0);
        const showcaseActive = Boolean(chapter.presetShowcase);

        if (showcaseActive && Array.isArray(chapter.sequences)) {
          let segmentCounter = 0;

          for (const sequence of chapter.sequences) {
            const steps = [
              { text: sequence.announcement, voiceIndex: 0, preset: sequence.name, type: 'announcement' },
              { text: sequence.sampleText, voiceIndex: 0, preset: sequence.name, type: 'sample' }
            ];

            for (const step of steps) {
              if (project.status === 'paused') {
                chapter.status = 'paused';
                saveProjects();
                return;
              }

              sendUpdate(project.id, {
                type: 'segment_start',
                chapterIndex,
                segmentIndex: segmentCounter,
                preset: sequence.name,
                stage: step.type
              });

              const stepChunks = splitIntoChunks(step.text, isDemo ? demoCharLimit : undefined);
              const stepLimitedChunks = isDemo ? stepChunks.slice(0, demoChunksPerSegment) : stepChunks;

              for (let i = 0; i < stepLimitedChunks.length; i++) {
                const chunkText = isDemo ? stepLimitedChunks[i].slice(0, demoCharLimit) : stepLimitedChunks[i];
                const chunkHash = createHash('sha1').update(chunkText).digest('hex').slice(0, 16);
                const segmentLabel = String(segmentCounter + 1).padStart(3, '0');
                const chunkFile = path.join(chunksDir, `${chapterBase}_seg${segmentLabel}_${chunkHash}.mp3`);

                const existingSegment = existingSegments[segmentCounter];
                if (existingSegment && existingSegment.hash && existingSegment.hash !== chunkHash && existingSegment.file && fs.existsSync(existingSegment.file)) {
                  try {
                    fs.unlinkSync(existingSegment.file);
                  } catch (error) {
                    console.warn('Unable to remove stale chunk file:', existingSegment.file, error.message);
                  }
                }

                const audioBuffer = await generateAudio(
                  chunkText,
                  project.voices[step.voiceIndex],
                  project.apiKey,
                  step.type === 'announcement' ? singleVoiceSettings : { ...singleVoiceSettings, ...sequence.settings }
                );
                fs.writeFileSync(chunkFile, audioBuffer);

                chunkFiles.push(chunkFile);

                chapter.segments[segmentCounter] = {
                  index: segmentCounter,
                  voice: step.voiceIndex,
                  voiceIndex: step.voiceIndex,
                  status: 'completed',
                  file: chunkFile,
                  hash: chunkHash,
                  label: `Chapter ${chapterSequenceNumber} · Segment ${segmentCounter + 1}`,
                  presetName: sequence.name,
                  presetStage: step.type
                };

                sendUpdate(project.id, {
                  type: 'segment_complete',
                  chapterIndex,
                  segmentIndex: segmentCounter,
                  preset: sequence.name,
                  stage: step.type
                });

                segmentCounter++;
                saveProjects();
              }
            }
          }
        } else {
          const chapterContent = isDemo ? chapter.content.slice(0, demoCharLimit) : chapter.content;
          let chunks = splitIntoChunks(chapterContent);
          if (isDemo) {
            chunks = chunks.slice(0, demoChunksPerSegment);
          }

          for (let i = 0; i < chunks.length; i++) {
            if (project.status === 'paused') {
              chapter.status = 'paused';
              saveProjects();
              return;
            }

            sendUpdate(project.id, {
              type: 'segment_start',
              chapterIndex,
              segmentIndex: i,
              total: chunks.length
            });

            const chunkText = isDemo ? chunks[i].slice(0, demoCharLimit) : chunks[i];
            const chunkHash = createHash('sha1').update(chunkText).digest('hex').slice(0, 16);
            const segmentLabel = String(i + 1).padStart(3, '0');
            const chunkFile = path.join(chunksDir, `${chapterBase}_seg${segmentLabel}_${chunkHash}.mp3`);

            const previousSegment = existingSegments[i];
            if (previousSegment && previousSegment.hash && previousSegment.hash !== chunkHash && previousSegment.file && fs.existsSync(previousSegment.file)) {
              try {
                fs.unlinkSync(previousSegment.file);
              } catch (error) {
                console.warn('Unable to remove stale chunk file:', previousSegment.file, error.message);
              }
            }

            const audioBuffer = await generateAudio(
              chunkText,
              project.voices[0],
              project.apiKey,
              singleVoiceSettings
            );
            fs.writeFileSync(chunkFile, audioBuffer);

            chunkFiles.push(chunkFile);

            chapter.segments[i] = {
              index: i,
              voice: 0,
              voiceIndex: 0,
              status: 'completed',
              file: chunkFile,
              hash: chunkHash,
              label: `Chapter ${chapterSequenceNumber} · Segment ${i + 1}`
            };

            sendUpdate(project.id, {
              type: 'segment_complete',
              chapterIndex,
              segmentIndex: i
            });

            saveProjects();
          }
        }
      } else {
        const segments = isDemo
          ? chapter.segments.slice(0, Math.min(chapter.segments.length, demoSegmentsPerChapter))
          : chapter.segments;
        let segmentIndex = 0;

        for (const segment of segments) {
          const segmentContent = isDemo ? segment.content.slice(0, demoCharLimit) : segment.content;
          let chunks = splitIntoChunks(segmentContent);
          if (isDemo) {
            chunks = chunks.slice(0, demoChunksPerSegment);
          }

          for (let i = 0; i < chunks.length; i++) {
            if (project.status === 'paused') {
              chapter.status = 'paused';
              saveProjects();
              return;
            }

            sendUpdate(project.id, {
              type: 'segment_start',
              chapterIndex,
              segmentIndex,
              voice: segment.voiceIndex
            });

            const chunkText = isDemo ? chunks[i].slice(0, demoCharLimit) : chunks[i];
            const chunkHash = createHash('sha1').update(chunkText).digest('hex').slice(0, 16);
            const segmentLabel = String(segmentIndex + 1).padStart(3, '0');
            const chunkFile = path.join(chunksDir, `${chapterBase}_seg${segmentLabel}_${chunkHash}.mp3`);

            if (segment.file && segment.hash && segment.hash !== chunkHash && fs.existsSync(segment.file)) {
              try {
                fs.unlinkSync(segment.file);
              } catch (error) {
                console.warn('Unable to remove stale chunk file:', segment.file, error.message);
              }
            }

            const voiceId = project.voices[segment.voiceIndex];
            const voiceSettings = getVoiceSettings(project, segment.voiceIndex);
            const audioBuffer = await generateAudio(
              chunkText,
              voiceId,
              project.apiKey,
              voiceSettings
            );
            fs.writeFileSync(chunkFile, audioBuffer);

            chunkFiles.push(chunkFile);

            segment.status = 'completed';
            segment.file = chunkFile;
            segment.hash = chunkHash;
            segment.label = `Chapter ${chapterSequenceNumber} · Segment ${segmentIndex + 1}`;

            sendUpdate(project.id, {
              type: 'segment_complete',
              chapterIndex,
              segmentIndex
            });

            segmentIndex++;
            saveProjects();
          }
        }

        if (isDemo && chapter.segments.length > segments.length) {
          for (let i = segments.length; i < chapter.segments.length; i++) {
            chapter.segments[i].status = 'skipped';
          }
          saveProjects();
        }
      }

      const chapterFile = path.join(chaptersDir, `${chapterBase}.mp3`);
      const normalizedFile = path.join(chaptersDir, `${chapterBase}_normalized.mp3`);

      sendUpdate(project.id, {
        type: 'chapter_merging',
        chapterIndex
      });

      await mergeAudioFiles(chunkFiles, chapterFile);
      await normalizeAudio(chapterFile, normalizedFile);

      if (fs.existsSync(chapterFile)) {
        fs.unlinkSync(chapterFile);
      }
      fs.renameSync(normalizedFile, chapterFile);

      chapter.status = 'completed';
      chapter.demo = isDemo;
      chapter.file = chapterFile;
      chapter.url = `/audio/chapters/${path.basename(chapterFile)}`;

      sendUpdate(project.id, {
        type: 'chapter_complete',
        chapterIndex,
        url: chapter.url
      });

      saveProjects();
    } catch (error) {
      chapter.status = 'error';
      chapter.error = error.message;

      sendUpdate(project.id, {
        type: 'chapter_error',
        chapterIndex,
        error: error.message
      });

      saveProjects();
      throw error;
    }
  }

  async function compileBook(projectId, options = {}) {
    const { manual = false } = options;
    const project = projects[projectId];

    if (!project) {
      throw new Error('Project not found');
    }

    if (project._bookPromise) {
      return project._bookPromise;
    }

    const taskPromise = (async () => {
      const completedChapters = project.chapters
        .map((chapter, index) => ({ chapter, index }))
        .filter(item => (
          item.chapter &&
          item.chapter.status === 'completed' &&
          item.chapter.file &&
          fs.existsSync(item.chapter.file)
        ));

      if (completedChapters.length === 0) {
        if (manual) {
          throw new Error('No completed chapters available to merge.');
        }
        return null;
      }

      sendUpdate(projectId, {
        type: 'book_merging',
        manual,
        chapters: completedChapters.length
      });

      const chapterFiles = completedChapters
        .sort((a, b) => a.index - b.index)
        .map(item => item.chapter.file);

      const bookFileName = `${buildProjectFilePrefix(project)}_audiobook.mp3`;
      const bookFile = path.join(bookDir, bookFileName);
      await mergeAudioFiles(chapterFiles, bookFile);

      project.bookFile = bookFile;
      project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
      project.bookGeneratedAt = new Date().toISOString();
      saveProjects();

      sendUpdate(projectId, {
        type: 'book_ready',
        manual,
        bookUrl: project.bookUrl,
        chapters: chapterFiles.length
      });

      return project.bookUrl;
    })();

    const trackedPromise = taskPromise.finally(() => {
      const freshProject = projects[projectId];
      if (freshProject && freshProject._bookPromise === trackedPromise) {
        delete freshProject._bookPromise;
      }
    });

    Object.defineProperty(project, '_bookPromise', {
      value: trackedPromise,
      enumerable: false,
      configurable: true,
      writable: true
    });

    return trackedPromise;
  }

  async function processProject(projectId) {
    const project = projects[projectId];
    if (!project) {
      return;
    }

    if (project._processingPromise) {
      return project._processingPromise;
    }

    const taskPromise = (async () => {
      project.status = 'processing';
      saveProjects();

      try {
        const totalChapters = project.chapters.length;
        const requestedLimit = typeof project.chapterLimit === 'number' && project.chapterLimit > 0
          ? Math.min(project.chapterLimit, totalChapters)
          : totalChapters;
        const chapterLimit = project.demoMode ? Math.min(requestedLimit, 1) : requestedLimit;

        for (let i = 0; i < project.chapters.length; i++) {
          if (i >= chapterLimit) {
            const chapter = project.chapters[i];
            if (chapter.status !== 'skipped') {
              chapter.status = 'skipped';
              if (Array.isArray(chapter.segments)) {
                chapter.segments.forEach(seg => {
                  seg.status = 'skipped';
                });
              }
              saveProjects();
              sendUpdate(projectId, {
                type: project.demoMode ? 'chapter_skipped_demo' : 'chapter_skipped',
                chapterIndex: i
              });
            }
            continue;
          }

          if (project.status === 'paused') {
            return;
          }

          const chapter = project.chapters[i];
          const chapterHasAudio = chapter.status === 'completed' && chapter.file && fs.existsSync(chapter.file);
          if (chapterHasAudio) {
            continue;
          }

          await processChapter(project, i);

          if (project.status === 'paused') {
            return;
          }

          if (chapter.status !== 'completed') {
            if (chapter.status === 'error') {
              throw new Error(chapter.error || `Chapter ${i + 1} failed to complete.`);
            }
            return;
          }
        }

        await compileBook(projectId, { manual: false });

        project.status = 'completed';
        project.completedAt = new Date().toISOString();

        sendUpdate(projectId, {
          type: 'project_complete',
          bookUrl: project.bookUrl
        });

        saveProjects();
      } catch (error) {
        project.status = 'error';
        project.error = error.message;

        sendUpdate(projectId, {
          type: 'project_error',
          error: error.message
        });

        saveProjects();
        throw error;
      }
    })();

    const trackedPromise = taskPromise.finally(() => {
      const currentProject = projects[projectId];
      if (currentProject && currentProject._processingPromise === trackedPromise) {
        delete currentProject._processingPromise;
      }
    });

    Object.defineProperty(project, '_processingPromise', {
      value: trackedPromise,
      enumerable: false,
      configurable: true,
      writable: true
    });

    return trackedPromise;
  }

  function createProject(payload) {
    const voiceSwitchToken = typeof payload.voiceSwitchToken === 'string' && payload.voiceSwitchToken.trim().length > 0
      ? payload.voiceSwitchToken.trim()
      : '*​*​*';

    let chapterLimit = null;
    if (payload.chapterLimit !== undefined && payload.chapterLimit !== null && payload.chapterLimit !== '') {
      const parsedLimit = parseInt(payload.chapterLimit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new Error('Chapter limit must be a positive integer when provided');
      }
      chapterLimit = parsedLimit;
    }

    let seriesNumber = null;
    if (payload.seriesNumber !== undefined && payload.seriesNumber !== null && payload.seriesNumber !== '') {
      const parsedSeries = parseInt(payload.seriesNumber, 10);
      if (Number.isNaN(parsedSeries) || parsedSeries <= 0) {
        throw new Error('Series number must be a positive integer when provided');
      }
      seriesNumber = parsedSeries;
    }

    let chapterStartNumber = null;
    if (payload.chapterStartNumber !== undefined && payload.chapterStartNumber !== null && payload.chapterStartNumber !== '') {
      const parsedChapterStart = parseInt(payload.chapterStartNumber, 10);
      if (Number.isNaN(parsedChapterStart) || parsedChapterStart <= 0) {
        throw new Error('Starting chapter number must be a positive integer when provided');
      }
      chapterStartNumber = parsedChapterStart;
    }

    const autoDetectChapterNumbers = payload.autoDetectChapterNumbers === undefined
      ? true
      : Boolean(payload.autoDetectChapterNumbers);

    const demoMode = Boolean(payload.demoMode);
    const demoCharLimit = typeof payload.demoCharLimit === 'number' && payload.demoCharLimit > 0 ? payload.demoCharLimit : undefined;
    const demoChunksPerSegment = typeof payload.demoChunksPerSegment === 'number' && payload.demoChunksPerSegment > 0 ? payload.demoChunksPerSegment : undefined;
    const demoSegmentsPerChapter = typeof payload.demoSegmentsPerChapter === 'number' && payload.demoSegmentsPerChapter > 0 ? payload.demoSegmentsPerChapter : undefined;
    const demoPresetShowcase = demoMode && Boolean(payload.demoPresetShowcase);
    const demoPresetSampleText = typeof payload.demoPresetSample === 'string' && payload.demoPresetSample.trim().length > 0
      ? payload.demoPresetSample.trim()
      : undefined;

    let voiceSettings = undefined;
    if (Array.isArray(payload.voiceSettings)) {
      voiceSettings = payload.voiceSettings.slice(0, 2).map((settings) => {
        if (settings && typeof settings === 'object') {
          const parsed = {};
          if (typeof settings.stability === 'number') parsed.stability = settings.stability;
          if (typeof settings.similarity_boost === 'number') parsed.similarity_boost = settings.similarity_boost;
          if (typeof settings.style === 'number') parsed.style = settings.style;
          if (typeof settings.speed === 'number') parsed.speed = settings.speed;
          return Object.keys(parsed).length > 0 ? parsed : null;
        }
        return null;
      });
    }

    let voicePresetLabels = undefined;
    if (Array.isArray(payload.voicePresetLabels)) {
      voicePresetLabels = payload.voicePresetLabels.slice(0, 2).map(label => (
        typeof label === 'string' && label.trim().length > 0 ? label.trim() : null
      ));
    }

    const projectId = generateId();
    let chapters = parseManuscript(payload.manuscript, payload.mode, { voiceSwitchToken });

    const primaryVoiceBaseSettings = voiceSettings && voiceSettings[0] ? voiceSettings[0] : (payload.settings || {});

    if (demoPresetShowcase) {
      chapters = [
        buildPresetShowcaseChapter(payload.manuscript, {
          baseSettings: primaryVoiceBaseSettings,
          sampleText: demoPresetSampleText
        })
      ];
    }

    const showcaseSampleText = demoPresetShowcase && chapters[0] && chapters[0].sequences && chapters[0].sequences.length > 0
      ? chapters[0].sequences[0].sampleText
      : undefined;

    const projectData = {
      id: projectId,
      title: payload.title,
      author: payload.author,
      language: payload.language,
      description: payload.description,
      mode: payload.mode,
      voices: payload.voices,
      apiKey: payload.apiKey,
      settings: payload.settings || {},
      chapterLimit: chapterLimit,
      demoMode,
      demoCharLimit,
      demoChunksPerSegment,
      demoSegmentsPerChapter,
      demoPresetShowcase,
      demoPresetSampleText: showcaseSampleText,
      voiceSettings,
      voicePresetLabels,
      voiceSwitchToken,
      chapters: chapters.map(ch => ({
        ...ch,
        status: 'pending',
        segments: ch.segments || [],
        sequenceNumber: typeof ch.sequenceNumber === 'number' ? ch.sequenceNumber : null
      })),
      status: 'pending',
      seriesNumber,
      chapterStartNumber,
      autoDetectChapterNumbers,
      createdAt: new Date().toISOString()
    };

    assignChapterSequenceNumbers(projectData, {
      autoDetectChapterNumbers,
      chapterStartNumber: chapterStartNumber || 1
    });

    projects[projectId] = projectData;

    saveProjects();

    return { projectId, chapters: chapters.length };
  }

  function getProject(projectId) {
    return projects[projectId] || null;
  }

  function listProjects() {
    return Object.values(projects);
  }

  function pauseProject(projectId) {
    const project = projects[projectId];
    if (!project) {
      return false;
    }
    project.status = 'paused';
    saveProjects();
    return true;
  }

  function setProjectProcessing(projectId) {
    const project = projects[projectId];
    if (!project) {
      return null;
    }
    project.status = 'processing';
    saveProjects();
    return project;
  }

  function resumeProject(projectId) {
    const project = setProjectProcessing(projectId);
    if (!project) {
      return false;
    }
    processProject(projectId).catch(console.error);
    return true;
  }

  function startProject(projectId) {
    const project = setProjectProcessing(projectId);
    if (!project) {
      return false;
    }
    processProject(projectId).catch(console.error);
    return true;
  }

  return {
    createProject,
    getProject,
    listProjects,
    startProject,
    pauseProject,
    resumeProject,
    compileBook,
    processProject,
    setUpdateHandler,
    getVoices,
    getOutputDirs: () => ({ outputDir, chunksDir, chaptersDir, bookDir })
  };
}

module.exports = {
  createProjectService,
  DEMO_PRESET_CONFIGS
};
