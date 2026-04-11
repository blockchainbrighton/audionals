import React, { useState } from 'react';
import { NovelConcept, Chapter, WorldContext } from '../types';
import { generateChapterContent } from '../services/geminiService';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Wand2, RefreshCw } from 'lucide-react';
import { ContextPanel } from './ContextPanel';
import { TTSButton } from './TTSButton';

interface WritingPhaseProps {
  concept: NovelConcept;
  outline: Chapter[];
  setOutline: React.Dispatch<React.SetStateAction<Chapter[]>>;
  worldContext: WorldContext;
  setWorldContext: React.Dispatch<React.SetStateAction<WorldContext>>;
  onBack: () => void;
}

export const WritingPhase: React.FC<WritingPhaseProps> = ({ 
  concept, outline, setOutline, worldContext, setWorldContext, onBack 
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");

  const currentChapter = outline[currentChapterIndex];
  
  const handleGenerateChapter = async () => {
    setIsGenerating(true);
    try {
      const prevContent = currentChapterIndex > 0 ? outline[currentChapterIndex - 1].content : null;
      
      const content = await generateChapterContent(
        currentChapter,
        concept,
        outline,
        worldContext,
        prevContent,
        instructions
      );
      
      const newOutline = [...outline];
      newOutline[currentChapterIndex] = { ...currentChapter, content };
      setOutline(newOutline);
    } catch (e) {
      console.error(e);
      alert("Error generating chapter content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCurrentContent = (text: string) => {
    const newOutline = [...outline];
    newOutline[currentChapterIndex] = { ...currentChapter, content: text };
    setOutline(newOutline);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">
                Chapter {currentChapter.number}: {currentChapter.title}
              </h2>
              <p className="text-xs text-gray-500">{concept.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button
              onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
              disabled={currentChapterIndex === 0}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentChapterIndex + 1} / {outline.length}
            </span>
            <button
              onClick={() => setCurrentChapterIndex(prev => Math.min(outline.length - 1, prev + 1))}
              disabled={currentChapterIndex === outline.length - 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3 flex flex-wrap gap-3 items-center">
            <div className="flex-1 flex gap-2">
                <input 
                    type="text" 
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Instructions (e.g., Focus on the description of the lab...)"
                    className="flex-1 p-2 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
                <button
                    onClick={handleGenerateChapter}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                    {currentChapter.content ? 'Rewrite' : 'Write Chapter'}
                </button>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-700 pl-3">
                 <TTSButton text={currentChapter.content} />
                 <span className="text-xs text-gray-500 font-medium">Read Aloud</span>
            </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-8">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 min-h-[calc(100vh-12rem)] shadow-lg rounded-lg p-12">
             <div className="mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                 <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">{currentChapter.title}</h1>
                 <p className="text-sm text-gray-500 italic font-serif">{currentChapter.summary}</p>
             </div>
             
             {isGenerating && !currentChapter.content ? (
                 <div className="flex flex-col items-center justify-center py-20 text-gray-400 animate-pulse">
                     <Wand2 size={48} className="mb-4 text-blue-300" />
                     <p>Drafting chapter content based on your outline and world context...</p>
                 </div>
             ) : (
                <textarea
                    value={currentChapter.content}
                    onChange={(e) => updateCurrentContent(e.target.value)}
                    placeholder="Start writing or generate content..."
                    className="w-full h-full min-h-[60vh] resize-none focus:outline-none font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-300 bg-transparent"
                />
             )}
          </div>
          <div className="h-20"></div> {/* Bottom scroll padding */}
        </div>
      </div>

      {/* Context Sidebar */}
      <ContextPanel worldContext={worldContext} setWorldContext={setWorldContext} />
    </div>
  );
};
