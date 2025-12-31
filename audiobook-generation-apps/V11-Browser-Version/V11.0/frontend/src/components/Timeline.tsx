import React from 'react';

interface Chunk {
    text: string;
    audioUrl?: string;
    status: 'pending' | 'generating' | 'done' | 'error';
}

interface Chapter {
    title: string;
    chunks: Chunk[];
}

interface TimelineProps {
    chapters: Chapter[];
    onPlayChunk: (audioUrl: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ chapters, onPlayChunk }) => {
    if (!chapters || chapters.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 italic">
                No chapters detected. Use headers (e.g. "# Chapter 1") in your manuscript to split sections.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
            {chapters.map((chapter, chIdx) => (
                <div key={chIdx} className="bg-bg-card border border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                        <span className="font-semibold text-slate-200">{chapter.title}</span>
                        <span className="text-xs text-slate-500">{chapter.chunks.length} segments</span>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {chapter.chunks.map((chunk, ckIdx) => (
                            <div key={ckIdx} className="p-3 hover:bg-slate-800 transition-colors flex items-center gap-4 group">
                                <div className="text-xs text-slate-600 font-mono w-6 text-center">{ckIdx + 1}</div>
                                <div className="flex-1 text-sm text-slate-400 truncate pr-4" title={chunk.text}>
                                    {chunk.text}
                                </div>
                                <div className="flex items-center gap-2">
                                    {chunk.status === 'done' && (
                                        <button 
                                            onClick={() => chunk.audioUrl && onPlayChunk(chunk.audioUrl)}
                                            className="text-primary-blue hover:text-white text-xs px-2 py-1 rounded bg-blue-900/20 hover:bg-blue-600 transition-colors"
                                        >
                                            ▶ Play
                                        </button>
                                    )}
                                    {chunk.status === 'generating' && (
                                        <span className="text-warning-orange text-xs animate-pulse">Generating...</span>
                                    )}
                                    {chunk.status === 'error' && (
                                        <span className="text-danger-red text-xs">Error</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
