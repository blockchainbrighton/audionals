const { MAX_CHUNK_CHARS, DUAL_VOICE_TOKEN } = require('../config');

const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDualVoiceMarkers(text) {
  const withoutZeroWidth = text.replace(ZERO_WIDTH_REGEX, '');
  const tokenPattern = new RegExp(`\\s*${escapeForRegex(DUAL_VOICE_TOKEN)}\\s*`, 'g');
  return withoutZeroWidth.replace(tokenPattern, DUAL_VOICE_TOKEN);
}

function buildSegmentsFromNormalized(normalizedText) {
  const parts = normalizedText.split(DUAL_VOICE_TOKEN);
  const segments = [];

  for (let i = 0; i < parts.length; i++) {
    const content = parts[i].trim();
    if (!content) {
      continue;
    }
    segments.push({
      content,
      voiceIndex: i % 2
    });
  }

  return segments;
}

function parseManuscript(text, mode) {
  const chapters = [];
  const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;

  if (mode === 'single') {
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
    const matches = [...text.matchAll(chapterRegex)];

    if (matches.length === 0) {
      const normalized = normalizeDualVoiceMarkers(text.trim());
      chapters.push({
        title: 'Full Text',
        content: normalized,
        voice: null,
        segments: buildSegmentsFromNormalized(normalized)
      });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterText = text.substring(start, end).trim();
        const title = matches[i][0].replace(/^#+\s*/, '').trim();
        const normalized = normalizeDualVoiceMarkers(chapterText);

        chapters.push({
          title: title || `Chapter ${i + 1}`,
          content: normalized,
          voice: null,
          segments: buildSegmentsFromNormalized(normalized)
        });
      }
    }
  }

  return chapters;
}

function parseDualVoiceSegments(text) {
  const normalized = normalizeDualVoiceMarkers(text);
  return buildSegmentsFromNormalized(normalized);
}

function splitIntoChunks(text, maxChars = MAX_CHUNK_CHARS) {
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

module.exports = {
  parseManuscript,
  parseDualVoiceSegments,
  splitIntoChunks
};
