import React, { useState } from 'react';
import { NovelConcept } from '../types';
import { generateConcept } from '../services/geminiService';
import { Sparkles, ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import { TTSButton } from './TTSButton';

interface ConceptPhaseProps {
  concept: NovelConcept;
  setConcept: (concept: NovelConcept) => void;
  onNext: () => void;
}

export const ConceptPhase: React.FC<ConceptPhaseProps> = ({ concept, setConcept, onNext }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newConcept = await generateConcept(instructions);
      setConcept(newConcept);
    } catch (e) {
      console.error(e);
      alert("Failed to generate concept. Please check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-3">
          <Sparkles className="text-blue-500" />
          Single Electron Novelist
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Collaborate with AI to write your next novel, one section at a time.
          Start by defining the core concept.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="space-y-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructions for AI (Optional)
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Make it a noir detective story set in 1940s Princeton..."
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg"
            >
              {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
              {concept.title ? 'Regenerate' : 'Generate Concept'}
            </button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Title</label>
                <TTSButton text={concept.title} />
             </div>
            <input
              value={concept.title}
              onChange={(e) => setConcept({ ...concept, title: e.target.value })}
              className="w-full text-2xl font-bold p-2 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-blue-500 focus:outline-none"
              placeholder="Novel Title"
            />
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Premise</label>
                <TTSButton text={concept.premise} />
            </div>
            <textarea
              value={concept.premise}
              onChange={(e) => setConcept({ ...concept, premise: e.target.value })}
              rows={4}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="The core idea of the story..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Style</label>
                   <TTSButton text={concept.style} />
              </div>
              <textarea
                value={concept.style}
                onChange={(e) => setConcept({ ...concept, style: e.target.value })}
                rows={3}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Writing style (e.g. Fast-paced, philosophical)..."
              />
            </div>
             <div className="space-y-2">
              <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Theme</label>
                   <TTSButton text={concept.theme} />
              </div>
              <textarea
                value={concept.theme}
                onChange={(e) => setConcept({ ...concept, theme: e.target.value })}
                rows={3}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Underlying themes..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!concept.title}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
        >
          Proceed to Outline <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
