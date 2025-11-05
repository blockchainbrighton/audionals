const fs = require('fs');
const path = require('path');
const {
  CHUNKS_DIR,
  CHAPTERS_DIR,
  BOOK_DIR,
} = require('../config');

function createProjectProcessor({ projectStore, audioService, sseHub, splitIntoChunks }) {
  async function processChapter(projectId, chapterIndex) {
    const project = projectStore.getProject(projectId);
    if (!project) {
      return;
    }

    const chapter = project.chapters[chapterIndex];
    const chapterKey = `${project.id}_ch${chapterIndex}`;
    const isDemo = Boolean(project.demoMode);
    const demoCharLimit = typeof project.demoCharLimit === 'number' && project.demoCharLimit > 0
      ? project.demoCharLimit
      : 600;
    const demoChunksPerSegment = typeof project.demoChunksPerSegment === 'number' && project.demoChunksPerSegment > 0
      ? project.demoChunksPerSegment
      : 1;
    const demoSegmentsPerChapter = typeof project.demoSegmentsPerChapter === 'number' && project.demoSegmentsPerChapter > 0
      ? project.demoSegmentsPerChapter
      : 2;

    sseHub.broadcast(projectId, {
      type: 'chapter_start',
      chapterIndex,
      title: chapter.title,
    });

    chapter.status = 'processing';
    chapter.segments = chapter.segments || [];
    projectStore.persist();

    try {
      const chunkFiles = [];

      if (project.mode === 'single') {
        const content = isDemo ? chapter.content.slice(0, demoCharLimit) : chapter.content;
        let chunks = splitIntoChunks(content);
        if (isDemo) {
          chunks = chunks.slice(0, demoChunksPerSegment);
        }

        for (let i = 0; i < chunks.length; i += 1) {
          if (project.status === 'paused') {
            chapter.status = 'paused';
            projectStore.persist();
            return;
          }

          sseHub.broadcast(projectId, {
            type: 'segment_start',
            chapterIndex,
            segmentIndex: i,
            total: chunks.length,
          });

          const chunkFile = path.join(CHUNKS_DIR, `${chapterKey}_${i}.mp3`);

          if (!fs.existsSync(chunkFile)) {
            const audioBuffer = await audioService.generateAudio(
              chunks[i],
              project.voices[0],
              project.apiKey,
              project.settings,
            );
            fs.writeFileSync(chunkFile, audioBuffer);
          }

          chunkFiles.push(chunkFile);

          chapter.segments[i] = {
            index: i,
            voice: 0,
            status: 'completed',
            file: chunkFile,
          };

          sseHub.broadcast(projectId, {
            type: 'segment_complete',
            chapterIndex,
            segmentIndex: i,
          });

          projectStore.persist();
        }
      } else {
        const availableSegments = isDemo
          ? chapter.segments.slice(0, Math.min(chapter.segments.length, demoSegmentsPerChapter))
          : chapter.segments;

        let segmentIndex = 0;

        for (const segment of availableSegments) {
          const segmentContent = isDemo ? segment.content.slice(0, demoCharLimit) : segment.content;
          let chunks = splitIntoChunks(segmentContent);
          if (isDemo) {
            chunks = chunks.slice(0, demoChunksPerSegment);
          }

          for (let i = 0; i < chunks.length; i += 1) {
            if (project.status === 'paused') {
              chapter.status = 'paused';
              projectStore.persist();
              return;
            }

            sseHub.broadcast(projectId, {
              type: 'segment_start',
              chapterIndex,
              segmentIndex,
              voice: segment.voiceIndex,
            });

            const chunkFile = path.join(CHUNKS_DIR, `${chapterKey}_${segmentIndex}.mp3`);

            if (!fs.existsSync(chunkFile)) {
              const voiceId = project.voices[segment.voiceIndex];
              const audioBuffer = await audioService.generateAudio(
                chunks[i],
                voiceId,
                project.apiKey,
                project.settings,
              );
              fs.writeFileSync(chunkFile, audioBuffer);
            }

            chunkFiles.push(chunkFile);

            segment.status = 'completed';
            segment.file = chunkFile;

            sseHub.broadcast(projectId, {
              type: 'segment_complete',
              chapterIndex,
              segmentIndex,
            });

            segmentIndex += 1;
            projectStore.persist();
          }
        }

        if (isDemo && chapter.segments.length > availableSegments.length) {
          for (let i = availableSegments.length; i < chapter.segments.length; i += 1) {
            chapter.segments[i].status = 'skipped';
          }
          projectStore.persist();
        }
      }

      const chapterFile = path.join(CHAPTERS_DIR, `${chapterKey}.mp3`);
      const normalizedFile = path.join(CHAPTERS_DIR, `${chapterKey}_normalized.mp3`);

      sseHub.broadcast(projectId, {
        type: 'chapter_merging',
        chapterIndex,
      });

      await audioService.mergeAudioFiles(chunkFiles, chapterFile);
      await audioService.normalizeAudio(chapterFile, normalizedFile);

      fs.unlinkSync(chapterFile);
      fs.renameSync(normalizedFile, chapterFile);

      chapter.status = 'completed';
      chapter.demo = isDemo;
      chapter.file = chapterFile;
      chapter.url = `/audio/chapters/${path.basename(chapterFile)}`;

      sseHub.broadcast(projectId, {
        type: 'chapter_complete',
        chapterIndex,
        url: chapter.url,
      });

      projectStore.persist();
    } catch (error) {
      chapter.status = 'error';
      chapter.error = error.message;

      sseHub.broadcast(projectId, {
        type: 'chapter_error',
        chapterIndex,
        error: error.message,
      });

      projectStore.persist();
      throw error;
    }
  }

  async function processProject(projectId) {
    const project = projectStore.getProject(projectId);
    if (!project) {
      return;
    }

    project.status = 'processing';
    projectStore.persist();

    try {
      const totalChapters = project.chapters.length;
      const requestedLimit = typeof project.chapterLimit === 'number' && project.chapterLimit > 0
        ? Math.min(project.chapterLimit, totalChapters)
        : totalChapters;
      const chapterLimit = project.demoMode ? Math.min(requestedLimit, 1) : requestedLimit;

      for (let chapterIndex = 0; chapterIndex < project.chapters.length; chapterIndex += 1) {
        if (chapterIndex >= chapterLimit) {
          const chapter = project.chapters[chapterIndex];
          if (chapter.status !== 'skipped') {
            chapter.status = 'skipped';
            if (Array.isArray(chapter.segments)) {
              chapter.segments.forEach((segment) => {
                segment.status = 'skipped';
              });
            }
          }

          sseHub.broadcast(projectId, {
            type: project.demoMode ? 'chapter_skipped_demo' : 'chapter_skipped',
            chapterIndex,
          });
          projectStore.persist();
          continue;
        }

        if (project.status === 'paused') {
          return;
        }

        await processChapter(projectId, chapterIndex);
      }

      const completedChapters = project.chapters.filter((chapter) => {
        return chapter.status === 'completed' && chapter.file && fs.existsSync(chapter.file);
      });
      if (completedChapters.length > 0) {
        sseHub.broadcast(projectId, { type: 'book_merging' });

        const bookFile = path.join(BOOK_DIR, `${project.id}_audiobook.mp3`);
        const bookNormalized = path.join(BOOK_DIR, `${project.id}_audiobook_normalized.mp3`);

        await audioService.mergeAudioFiles(
          completedChapters.map((chapter) => chapter.file),
          bookFile,
        );
        await audioService.normalizeAudio(bookFile, bookNormalized);

        fs.unlinkSync(bookFile);
        fs.renameSync(bookNormalized, bookFile);

        project.bookFile = bookFile;
        project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
      }

      project.status = 'completed';
      project.completedAt = new Date().toISOString();

      sseHub.broadcast(projectId, {
        type: 'project_complete',
        bookUrl: project.bookUrl,
      });

      projectStore.persist();
    } catch (error) {
      project.status = 'error';
      project.error = error.message;

      sseHub.broadcast(projectId, {
        type: 'project_error',
        error: error.message,
      });

      projectStore.persist();
    }
  }

  return {
    processProject,
    processChapter,
  };
}

module.exports = {
  createProjectProcessor,
};
