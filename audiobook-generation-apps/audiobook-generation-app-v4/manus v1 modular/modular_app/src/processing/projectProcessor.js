const fs = require('fs');
const path = require('path');
const { CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR } = require('../config');
const { splitIntoChunks } = require('../manuscript/parser');
const { generateAudio, mergeAudioFiles, normalizeAudio } = require('../services/audioService');
const {
  getProject,
  saveProjects,
  sendUpdate
} = require('../storage/projectStore');

async function processChapter(project, chapterIndex) {
  const chapter = project.chapters[chapterIndex];
  const chapterId = `${project.id}_ch${chapterIndex}`;

  sendUpdate(project.id, {
    type: 'chapter_start',
    chapterIndex,
    title: chapter.title
  });

  chapter.status = 'processing';
  chapter.segments = chapter.segments || [];
  saveProjects();

  try {
    const chunkFiles = [];

    if (project.mode === 'single') {
      const chunks = splitIntoChunks(chapter.content);

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

        const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${i}.mp3`);

        if (!fs.existsSync(chunkFile)) {
          const audioBuffer = await generateAudio(
            chunks[i],
            project.voices[0],
            project.apiKey,
            project.settings
          );
          fs.writeFileSync(chunkFile, audioBuffer);
        }

        chunkFiles.push(chunkFile);

        chapter.segments[i] = {
          index: i,
          voice: 0,
          status: 'completed',
          file: chunkFile
        };

        sendUpdate(project.id, {
          type: 'segment_complete',
          chapterIndex,
          segmentIndex: i
        });

        saveProjects();
      }
    } else {
      const segments = chapter.segments;
      let segmentIndex = 0;

      for (const segment of segments) {
        const chunks = splitIntoChunks(segment.content);

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

          const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${segmentIndex}.mp3`);

          if (!fs.existsSync(chunkFile)) {
            const voiceId = project.voices[segment.voiceIndex];
            const audioBuffer = await generateAudio(
              chunks[i],
              voiceId,
              project.apiKey,
              project.settings
            );
            fs.writeFileSync(chunkFile, audioBuffer);
          }

          chunkFiles.push(chunkFile);

          segment.status = 'completed';
          segment.file = chunkFile;

          sendUpdate(project.id, {
            type: 'segment_complete',
            chapterIndex,
            segmentIndex
          });

          segmentIndex++;
          saveProjects();
        }
      }
    }

    const chapterFile = path.join(CHAPTERS_DIR, `${chapterId}.mp3`);
    const normalizedFile = path.join(CHAPTERS_DIR, `${chapterId}_normalized.mp3`);

    sendUpdate(project.id, {
      type: 'chapter_merging',
      chapterIndex
    });

    await mergeAudioFiles(chunkFiles, chapterFile);
    await normalizeAudio(chapterFile, normalizedFile);

    fs.unlinkSync(chapterFile);
    fs.renameSync(normalizedFile, chapterFile);

    chapter.status = 'completed';
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

async function processProject(projectId) {
  const project = getProject(projectId);
  if (!project) {
    return;
  }

  project.status = 'processing';
  saveProjects();

  try {
    for (let i = 0; i < project.chapters.length; i++) {
      if (project.status === 'paused') {
        return;
      }

      await processChapter(project, i);
    }

    sendUpdate(projectId, {
      type: 'book_merging'
    });

    const chapterFiles = project.chapters
      .filter(chapter => chapter.file && fs.existsSync(chapter.file))
      .map(chapter => chapter.file);

    if (chapterFiles.length > 0) {
      const bookFile = path.join(BOOK_DIR, `${projectId}_audiobook.mp3`);
      await mergeAudioFiles(chapterFiles, bookFile);
      project.bookFile = bookFile;
      project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
    }

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
  }
}

module.exports = {
  processProject,
  processChapter
};
