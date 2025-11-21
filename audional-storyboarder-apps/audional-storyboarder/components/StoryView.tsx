import React from 'react';
import { BookletData, StoryPage } from '../types';
import { Eye, Download, Share2, Layers } from 'lucide-react';

interface StoryViewProps {
  data: BookletData;
  onReadMode: () => void;
  onReset: () => void;
}

export const StoryView: React.FC<StoryViewProps> = ({ data, onReadMode, onReset }) => {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-slate-800 pb-8 gap-6">
          <div>
            <span className="text-orange-500 font-bold tracking-widest uppercase text-xs mb-2 block">Project Target: {data.targetAudience}</span>
            <h2 className="text-4xl font-bold text-white mb-2">Storyboard Generated</h2>
            <p className="text-slate-400">A 6-page guide to Audionals for your audience.</p>
          </div>
          <div className="flex space-x-4">
             <button onClick={onReset} className="px-6 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                New Project
             </button>
             <button onClick={onReadMode} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-blue-900/20">
                <Eye className="w-5 h-5" />
                <span>Preview Booklet</span>
             </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.pages.map((page) => (
            <StoryCard key={page.pageNumber} page={page} />
          ))}
        </div>

        {/* Action Bar */}
        <div className="mt-16 flex justify-center space-x-6 opacity-50 hover:opacity-100 transition-opacity">
            <button className="flex items-center space-x-2 text-slate-400 hover:text-white">
                <Download className="w-5 h-5" />
                <span>Export PDF</span>
            </button>
            <button className="flex items-center space-x-2 text-slate-400 hover:text-white">
                <Share2 className="w-5 h-5" />
                <span>Share Link</span>
            </button>
        </div>
      </div>
    </div>
  );
};

const StoryCard: React.FC<{ page: StoryPage }> = ({ page }) => {
  return (
    <div className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 hover:-translate-y-1">
      {/* Page Number Badge */}
      <div className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-mono group-hover:bg-orange-500 group-hover:text-white transition-colors z-10">
        {page.pageNumber}
      </div>

      {/* Visual Placeholder */}
      <div className="h-48 bg-slate-800/50 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 z-10"></div>
        {/* Abstract visual pattern based on page number to mimic generation */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: `radial-gradient(circle at ${page.pageNumber * 15}% 50%, #f97316 0%, transparent 50%)`
             }}>
        </div>
        <Layers className="w-10 h-10 text-slate-600 mb-3 relative z-0 group-hover:text-orange-400 transition-colors" />
        <p className="text-xs text-slate-400 uppercase tracking-widest relative z-20">Visual Concept</p>
        <p className="text-sm text-slate-300 italic relative z-20 px-4 mt-2 line-clamp-3 group-hover:line-clamp-none transition-all">
          "{page.visualDescription}"
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">{page.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {page.content}
        </p>
        
        <div className="border-t border-slate-800 pt-4">
           <p className="text-xs font-semibold text-blue-400 uppercase mb-1">Key Takeaway</p>
           <p className="text-slate-200 text-sm font-medium">{page.keyTakeaway}</p>
        </div>
      </div>
    </div>
  );
};
