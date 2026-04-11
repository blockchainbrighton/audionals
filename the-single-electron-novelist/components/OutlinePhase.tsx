import React, { useState } from 'react';
import { NovelConcept, Chapter } from '../types';
import { generateOutline } from '../services/geminiService';
import { ArrowRight, ArrowLeft, Plus, Trash2, GripVertical, RefreshCw, Wand2 } from 'lucide-react';
import { TTSButton } from './TTSButton';

interface OutlinePhaseProps {
  concept: NovelConcept;
  outline: Chapter[];
  setOutline: React.Dispatch<React.SetStateAction<Chapter[]>>;
  onNext: () => void;
  onBack: () => void;
}

export const OutlinePhase: React.FC<OutlinePhaseProps> = ({ concept, outline, setOutline, onNext, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [chapterCount, setChapterCount] = useState(20);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newOutline = await generateOutline(concept, chapterCount, instructions);
      setOutline(newOutline);
    } catch (e) {
      console.error(e);
      alert("Error generating outline.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateChapter = (id: string, field: keyof Chapter, value: string) => {
    setOutline(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch));
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      number: outline.length + 1,
      title: "New Chapter",
      summary: "",
      content: ""
    };
    setOutline([...outline, newChapter]);
  };

  const removeChapter = (id: string) => {
    setOutline(prev => {
        const filtered = prev.filter(ch => ch.id !== id);
        return filtered.map((ch, index) => ({...ch, number: index + 1})); // Re-index
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 h-full flex flex-col">
       <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft size={16} /> Back to Concept
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chapter Outline</h2>
        <div className="w-24"></div> {/* Spacer */}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
           <div className="md:col-span-8">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outline Instructions</label>
             <input
               type="text"
               value={instructions}
               onChange={(e) => setInstructions(e.target.value)}
               placeholder="e.g. Include a major twist in chapter 10 regarding the protagonist's father..."
               className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
             />
           </div>
           <div className="md:col-span-2">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapters</label>
             <input
                type="number"
                value={chapterCount}
                onChange={(e) => setChapterCount(parseInt(e.target.value) || 20)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
             />
           </div>
           <div className="md:col-span-2">
             <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded flex items-center justify-center gap-2"
             >
               {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
               Generate
             </button>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {outline.length === 0 && !isGenerating && (
          <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-300 rounded-xl">
            No chapters yet. Generate an outline or add chapters manually.
          </div>
        )}
        
        {outline.map((chapter) => (
          <div key={chapter.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-blue-400 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-2 text-gray-400 cursor-move">
                <GripVertical size={20} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    CH {chapter.number}
                  </span>
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                    className="flex-1 font-bold text-lg bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                    placeholder="Chapter Title"
                  />
                  <TTSButton text={chapter.summary} />
                  <button onClick={() => removeChapter(chapter.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
                <textarea
                  value={chapter.summary}
                  onChange={(e) => updateChapter(chapter.id, 'summary', e.target.value)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 bg-transparent resize-none focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-900 rounded p-2"
                  rows={2}
                  placeholder="Chapter summary..."
                />
              </div>
            </div>
          </div>
        ))}
        
        <button
          onClick={addChapter}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:border-blue-500 hover:text-blue-600 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} /> Add Chapter Manually
        </button>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onNext}
          disabled={outline.length === 0}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          Start Writing <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
