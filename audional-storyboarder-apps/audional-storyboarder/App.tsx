import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { StoryView } from './components/StoryView';
import { BookletModal } from './components/BookletModal';
import { AppState, BookletData } from './types';
import { generateAudionalBooklet } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [bookletData, setBookletData] = useState<BookletData | null>(null);

  const handleGenerate = async (musicianType: string, vibe: string) => {
    setAppState(AppState.GENERATING);
    try {
      const data = await generateAudionalBooklet(musicianType, vibe);
      setBookletData(data);
      setAppState(AppState.VIEWING);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      // In a real app, show a toast or error modal
      setTimeout(() => setAppState(AppState.IDLE), 3000); 
    }
  };

  const [isReading, setIsReading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-orange-500 selection:text-white">
      {appState === AppState.IDLE && (
        <Hero onGenerate={handleGenerate} appState={appState} />
      )}
      
      {appState === AppState.GENERATING && (
         <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950">
            <Hero onGenerate={() => {}} appState={AppState.GENERATING} />
         </div>
      )}

      {appState === AppState.VIEWING && bookletData && (
        <StoryView 
          data={bookletData} 
          onReadMode={() => setIsReading(true)}
          onReset={() => {
            setAppState(AppState.IDLE);
            setBookletData(null);
            setIsReading(false);
          }}
        />
      )}

      {appState === AppState.ERROR && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-slate-800 p-8 rounded-xl border border-red-500 text-center">
             <h3 className="text-xl font-bold text-red-400 mb-2">Generation Failed</h3>
             <p className="text-slate-300">Could not connect to the Creative Director AI.</p>
          </div>
        </div>
      )}

      {isReading && bookletData && (
        <BookletModal 
          data={bookletData} 
          onClose={() => setIsReading(false)} 
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 py-8 border-t border-slate-900 text-center text-slate-600 text-sm">
        <p>© 2024 Audional Storyboarder. Powered by Google Gemini.</p>
        <p className="mt-2 text-xs">Research based on Bitcoin Ordinals & Audionals Protocol.</p>
      </footer>
    </div>
  );
};

export default App;
