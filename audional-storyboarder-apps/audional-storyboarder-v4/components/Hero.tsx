import React, { useState } from 'react';
import { Music, Zap, Disc, ArrowRight, Loader2 } from 'lucide-react';
import { AppState } from '../types';

interface HeroProps {
  onGenerate: (type: string, vibe: string) => void;
  appState: AppState;
}

export const Hero: React.FC<HeroProps> = ({ onGenerate, appState }) => {
  const [musicianType, setMusicianType] = useState('');
  const [vibe, setVibe] = useState('Futuristic & Bold');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (musicianType.trim()) {
      onGenerate(musicianType, vibe);
    }
  };

  return (
    <div className="relative overflow-hidden bg-slate-900 min-h-[80vh] flex items-center justify-center border-b border-slate-800">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
         <div className="absolute top-10 left-10 w-64 h-64 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
        <div className="inline-flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm font-medium text-slate-300">Powered by Gemini 2.5 Flash</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-200 to-blue-400">
          The Audional Archives
        </h1>
        
        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
          Discover why thousands of musicians are moving their master tapes to the Bitcoin blockchain.
          Generate a custom <strong>informational booklet storyboard</strong> tailored to your genre.
        </p>

        <form onSubmit={handleSubmit} className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-2xl mx-auto transition-all duration-500 hover:border-orange-500/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-300 mb-2">I am a...</label>
              <input 
                type="text" 
                value={musicianType}
                onChange={(e) => setMusicianType(e.target.value)}
                placeholder="e.g. Techno Producer, Jazz Quartet, Rapper" 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-slate-600"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Booklet Vibe</label>
              <select 
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              >
                <option>Futuristic & Bold</option>
                <option>Gritty & Underground</option>
                <option>Elegant & Classical</option>
                <option>Technical & Educational</option>
                <option>Playful & Pop</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={appState === AppState.GENERATING}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all duration-300 ${
              appState === AppState.GENERATING 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/20'
            }`}
          >
            {appState === AppState.GENERATING ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Inscribing Storyboard...</span>
              </>
            ) : (
              <>
                <Disc className="w-6 h-6" />
                <span>Create My Booklet</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-500 text-sm">
            <div className="flex flex-col items-center">
                <Music className="w-8 h-8 mb-3 text-slate-400" />
                <p>Preserve your audio forever on-chain.</p>
            </div>
            <div className="flex flex-col items-center">
                <Zap className="w-8 h-8 mb-3 text-slate-400" />
                <p>No monthly fees. No link rot.</p>
            </div>
             <div className="flex flex-col items-center">
                <Disc className="w-8 h-8 mb-3 text-slate-400" />
                <p>True digital ownership for fans.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
