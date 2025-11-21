import React, { useState, useRef, useEffect } from 'react';
import { BookletData, StoryPage } from '../types';
import { Eye, Download, Layers, Image as ImageIcon, Loader2, ChevronDown, Printer, Monitor } from 'lucide-react';
import { generatePDF, PDFFormat, PDFTheme } from '../utils/pdfGenerator';

interface StoryViewProps {
  data: BookletData;
  onReadMode: () => void;
  onReset: () => void;
  onGenerateImages: () => void;
  isGeneratingImages: boolean;
}

export const StoryView: React.FC<StoryViewProps> = ({ 
  data, 
  onReadMode, 
  onReset, 
  onGenerateImages,
  isGeneratingImages 
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasImages = data.pages.some(p => !!p.imageUrl);
  const allImagesGenerated = data.pages.every(p => !!p.imageUrl);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = (format: PDFFormat, theme: PDFTheme) => {
    generatePDF(data, format, theme);
    setShowDownloadMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-end mb-12 border-b border-slate-800 pb-8 gap-6">
          <div className="flex-1">
            <span className="text-orange-500 font-bold tracking-widest uppercase text-xs mb-2 block">Project Target: {data.targetAudience}</span>
            <h2 className="text-4xl font-bold text-white mb-2">Storyboard Generated</h2>
            <p className="text-slate-400">A 6-page guide to Audionals for your audience.</p>
          </div>
          <div className="flex flex-wrap gap-4 items-center relative">
             <button onClick={onReset} className="px-5 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-semibold">
                New Project
             </button>
             
             {!allImagesGenerated && (
                <button 
                    onClick={onGenerateImages} 
                    disabled={isGeneratingImages}
                    className={`px-5 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg ${
                        isGeneratingImages 
                        ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                    }`}
                >
                    {isGeneratingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    <span>{isGeneratingImages ? 'Creating Art...' : 'Generate Illustrations'}</span>
                </button>
             )}

             <button onClick={onReadMode} className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-blue-900/20">
                <Eye className="w-5 h-5" />
                <span>Preview Booklet</span>
             </button>

             <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="px-5 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-orange-900/20"
                >
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </button>

                {showDownloadMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-slate-800">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booklet (Presentation)</span>
                        </div>
                        <button onClick={() => handleDownload('booklet', 'dark')} className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-3">
                            <Monitor className="w-4 h-4 text-blue-400" />
                            <span>Digital (Dark Mode)</span>
                        </button>
                        <button onClick={() => handleDownload('booklet', 'light')} className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-3">
                            <Printer className="w-4 h-4 text-slate-400" />
                            <span>Printable (White)</span>
                        </button>

                        <div className="p-3 border-b border-slate-800 border-t">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Storyboard (Planning)</span>
                        </div>
                        <button onClick={() => handleDownload('storyboard', 'dark')} className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-3">
                            <Monitor className="w-4 h-4 text-blue-400" />
                            <span>Digital (Dark Mode)</span>
                        </button>
                        <button onClick={() => handleDownload('storyboard', 'light')} className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-3">
                            <Printer className="w-4 h-4 text-slate-400" />
                            <span>Printable (White)</span>
                        </button>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.pages.map((page) => (
            <StoryCard key={page.pageNumber} page={page} />
          ))}
        </div>

        {/* Action Bar */}
        <div className="mt-16 flex justify-center space-x-6">
            <p className="text-slate-500 text-sm">
                Pro Tip: Generate illustrations first for the best looking digital booklet.
            </p>
        </div>
      </div>
    </div>
  );
};

const StoryCard: React.FC<{ page: StoryPage }> = ({ page }) => {
  return (
    <div className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 hover:-translate-y-1 flex flex-col">
      {/* Page Number Badge */}
      <div className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-mono group-hover:bg-orange-500 group-hover:text-white transition-colors z-10 shadow-lg">
        {page.pageNumber}
      </div>

      {/* Visual Area */}
      <div className="h-64 bg-slate-800/50 relative overflow-hidden flex-shrink-0">
        {page.imageUrl ? (
             <img 
                src={page.imageUrl} 
                alt={page.visualDescription} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
             />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 z-10"></div>
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
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">{page.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
          {page.content}
        </p>
        
        <div className="border-t border-slate-800 pt-4 mt-auto">
           <p className="text-xs font-semibold text-blue-400 uppercase mb-1">Key Takeaway</p>
           <p className="text-slate-200 text-sm font-medium">{page.keyTakeaway}</p>
        </div>
      </div>
    </div>
  );
};