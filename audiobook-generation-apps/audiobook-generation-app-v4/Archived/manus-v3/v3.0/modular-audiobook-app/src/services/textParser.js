function parseDualVoiceSegments(text, delimiter = '***') {
  const segments = [];
  const token = typeof delimiter === 'string' && delimiter.length > 0 ? delimiter : '***';
  const parts = token ? text.split(token) : [text];

  for (let i = 0; i < parts.length; i += 1) {
    const content = parts[i].trim();
    if (!content) {
      continue;
    }

    segments.push({
      content,
      voiceIndex: i % 2,
    });
  }

  return segments;
}

function parseManuscript(text, mode, options = {}) {
  const chapters = [];
  const voiceSwitchToken = options.voiceSwitchToken || '***';

  if (mode === 'single') {
    const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;
    const matches = [...text.matchAll(chapterRegex)];

    if (matches.length === 0) {
      chapters.push({
        title: 'Full Text',
        content: text.trim(),
        voice: null,
      });
    } else {
      for (let i = 0; i < matches.length; i += 1) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterText = text.substring(start, end).trim();
        const title = matches[i][0].replace(/^#+\s*/, '').trim();

        chapters.push({
          title: title || `Chapter ${i + 1}`,
          content: chapterText,
          voice: null,
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
        segments: parseDualVoiceSegments(text.trim(), voiceSwitchToken),
      });
    } else {
      for (let i = 0; i < matches.length; i += 1) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterText = text.substring(start, end).trim();
        const title = matches[i][0].replace(/^#+\s*/, '').trim();

        chapters.push({
          title: title || `Chapter ${i + 1}`,
          content: chapterText,
          voice: null,
          segments: parseDualVoiceSegments(chapterText, voiceSwitchToken),
        });
      }
    }
  }

  return chapters;
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

module.exports = {
  parseManuscript,
  parseDualVoiceSegments,
  splitIntoChunks,
};
