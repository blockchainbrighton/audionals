import React, { useState } from 'react';
import { BookletData } from '../types';
import { X, ChevronLeft, ChevronRight, Speaker } from 'lucide-react';

interface BookletModalProps {
  data: BookletData;
  onClose: () => void;
}

export const BookletModal: React.FC<BookletModalProps> = ({ data, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextPage = () => {
    if (currentIndex < data.pages.length - 1) setCurrentIndex(c => c + 1);
  };

  const prevPage = () => {
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  const currentPage = data.pages[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      
      {/* Container */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-slate-800 text-slate-300 rounded-full hover:bg-red-500 hover:text-white transition-colors"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Left Side: Visuals (Mocked) */}
        <div className="w-full md:w-1/2 bg-slate-950 relative flex items-center justify-center p-12 overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
             <div className={`absolute w-[500px] h-[500px] rounded-full filter blur-[100px] opacity-30 transition-all duration-1000 ${
                 currentIndex % 2 === 0 ? 'bg-orange-600 -top-20 -left-20' : 'bg-blue-600 -bottom-20 -right-20'
             }`}></div>

             <div className="relative z-10 text-center">
                 <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-8 border-2 border-slate-700 shadow-xl shadow-black/50">
                    <span className="text-4xl font-bold text-white">{currentPage.pageNumber}</span>
                 </div>
                 <h3 className="text-orange-500 uppercase tracking-[0.2em] text-sm font-bold mb-4">Visual Prompt</h3>
                 <p className="text-2xl font-light text-slate-200 leading-normal font-serif italic">
                    "{currentPage.visualDescription}"
                 </p>
             </div>
        </div>

        {/* Right Side: Copy */}
        <div className="w-full md:w-1/2 bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center mb-12">
                     <span className="text-slate-400 text-sm font-mono tracking-widest">AUDIONAL GUIDE V1.0</span>
                     <span className="text-slate-900 font-bold border-b-2 border-orange-500 pb-1">{currentIndex + 1} / {data.pages.length}</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-slate-900 leading-tight">{currentPage.title}</h2>
                <div className="prose prose-lg text-slate-600 mb-8 leading-relaxed">
                    {currentPage.content}
                </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-xl border-l-4 border-orange-500">
                <h4 className="font-bold text-slate-900 flex items-center mb-2">
                    <Speaker className="w-4 h-4 mr-2 text-orange-600" />
                    Key Insight
                </h4>
                <p className="text-slate-700 italic">{currentPage.keyTakeaway}</p>
            </div>
        </div>

        {/* Navigation Overlays (Mobile friendly) */}
        <div className="absolute bottom-0 left-0 right-0 md:static md:hidden flex justify-between p-4 bg-slate-900 border-t border-slate-800">
             <button onClick={prevPage} disabled={currentIndex === 0} className="p-3 bg-slate-800 text-white rounded-lg disabled:opacity-50">
                <ChevronLeft />
             </button>
             <button onClick={nextPage} disabled={currentIndex === data.pages.length - 1} className="p-3 bg-orange-600 text-white rounded-lg disabled:opacity-50">
                <ChevronRight />
             </button>
        </div>
      </div>

      {/* Desktop Navigation Arrows */}
      <button 
        onClick={prevPage} 
        disabled={currentIndex === 0}
        className="hidden md:block absolute left-8 top-1/2 -translate-y-1/2 p-4 bg-slate-800/50 text-white rounded-full hover:bg-orange-500 transition-all disabled:opacity-0 hover:scale-110"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      <button 
        onClick={nextPage} 
        disabled={currentIndex === data.pages.length - 1}
        className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-slate-800/50 text-white rounded-full hover:bg-orange-500 transition-all disabled:opacity-0 hover:scale-110"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

    </div>
  );
};
