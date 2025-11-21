import React from 'react';
import { BookletData, StoryPage } from '../types';
import { Eye, Download, Share2, Layers, Image as ImageIcon, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

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

  const hasImages = data.pages.some(p => !!p.imageUrl);
  const allImagesGenerated = data.pages.every(p => !!p.imageUrl);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    data.pages.forEach((page, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Header
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`AUDIONAL GUIDE - ${data.targetAudience}`, margin, margin);
      doc.text(`Page ${page.pageNumber}`, pageWidth - margin, margin, { align: 'right' });

      // Title
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(page.title, pageWidth - (margin * 2));
      doc.text(titleLines, margin, margin + 15);

      let currentY = margin + 15 + (titleLines.length * 10);

      // Image (if available)
      if (page.imageUrl) {
        try {
            // Add image (square)
            const imgSize = 100;
            const xPos = (pageWidth - imgSize) / 2;
            doc.addImage(page.imageUrl, 'PNG', xPos, currentY, imgSize, imgSize);
            currentY += imgSize + 10;
        } catch (e) {
            console.error("Error adding image to PDF", e);
        }
      } else {
         // Spacer if no image
         currentY += 10;
      }

      // Content
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const contentLines = doc.splitTextToSize(page.content, pageWidth - (margin * 2));
      doc.text(contentLines, margin, currentY);
      
      currentY += (contentLines.length * 6) + 15;

      // Key Takeaway Box
      doc.setDrawColor(249, 115, 22); // Orange border
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 247, 237); // Light orange bg
      
      // Approximate height for takeaway
      const takeawayLines = doc.splitTextToSize(page.keyTakeaway, pageWidth - (margin * 2) - 10);
      const boxHeight = (takeawayLines.length * 6) + 15;

      doc.rect(margin, currentY, pageWidth - (margin * 2), boxHeight, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(249, 115, 22);
      doc.setFont("helvetica", "bold");
      doc.text("KEY INSIGHT", margin + 5, currentY + 8);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "italic");
      doc.text(takeawayLines, margin + 5, currentY + 18);
    });

    doc.save(`audional-booklet-${Date.now()}.pdf`);
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
          <div className="flex flex-wrap gap-4">
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
            <button 
                onClick={handleExportPDF}
                className="flex items-center space-x-2 text-slate-400 hover:text-orange-400 transition-colors px-6 py-3 rounded-full hover:bg-slate-900"
            >
                <Download className="w-5 h-5" />
                <span>Download PDF Booklet</span>
            </button>
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