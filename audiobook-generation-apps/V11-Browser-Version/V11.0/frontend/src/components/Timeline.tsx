import React from 'react';

interface Chunk {
    text: string;
    audioUrl?: string;
    status: 'pending' | 'generating' | 'done' | 'error';
    role?: 'narrator' | 'character';
    voiceId?: string;
}

interface Chapter {
    title: string;
    chunks: Chunk[];
    chapterAudioUrl?: string;
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
                    <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-200">{chapter.title}</span>
                            <span className="text-xs text-slate-500">{chapter.chunks.length} segments</span>
                        </div>
                        
                        {chapter.chapterAudioUrl && (
                             <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded border border-slate-600">
                                <span className="text-xs text-success-green font-bold">✓ Merged</span>
                                <button 
                                    onClick={() => onPlayChunk(chapter.chapterAudioUrl!)}
                                    className="text-xs bg-success-green text-black px-2 py-1 rounded font-bold hover:bg-emerald-400"
                                >
                                    Play Chapter
                                </button>
                                <a 
                                    href={chapter.chapterAudioUrl} 
                                    download={`${chapter.title}.wav`}
                                    className="text-xs text-slate-300 hover:text-white border-l border-slate-500 pl-2 ml-1"
                                >
                                    ⇩
                                </a>
                             </div>
                        )}
                    </div>
                    <div className="divide-y divide-slate-800">
                        {chapter.chunks.map((chunk, ckIdx) => (
                            <div key={ckIdx} className={`p-3 hover:bg-slate-800 transition-colors flex items-center gap-4 group ${chunk.role === 'character' ? 'bg-slate-800/20' : ''}`}>
                                <div className="text-xs text-slate-600 font-mono w-6 text-center">{ckIdx + 1}</div>
                                
                                <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold w-16 text-center shrink-0 ${chunk.role === 'character' ? 'text-success-green bg-success-green/10' : 'text-primary-blue bg-primary-blue/10'}`}>
                                    {chunk.role || 'Narrator'}
                                </div>

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
