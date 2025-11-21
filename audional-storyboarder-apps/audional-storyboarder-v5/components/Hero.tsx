import React, { useState } from 'react';
import { Music, Zap, Disc, ArrowRight, Loader2, Building2, Mic2 } from 'lucide-react';
import { AppState } from '../types';

interface HeroProps {
  onGenerate: (type: string, vibe: string, category: 'creative' | 'industry') => void;
  appState: AppState;
}

export const Hero: React.FC<HeroProps> = ({ onGenerate, appState }) => {
  const [category, setCategory] = useState<'creative' | 'industry'>('creative');
  const [targetName, setTargetName] = useState('');
  const [vibe, setVibe] = useState('Futuristic & Bold');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetName.trim()) {
      onGenerate(targetName, vibe, category);
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
          Generate a custom <strong>informational booklet storyboard</strong> tailored to your audience.
          Explain the future of on-chain music, from creative freedom to automated rights management.
        </p>

        <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-slate-800 p-1 rounded-xl inline-flex w-full md:w-auto">
                <button 
                    onClick={() => { setCategory('creative'); setTargetName(''); }}
                    className={`flex-1 md:w-48 py-3 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                        category === 'creative' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Mic2 className="w-4 h-4" />
                    <span>For Musicians</span>
                </button>
                <button 
                    onClick={() => { setCategory('industry'); setTargetName(''); }}
                    className={`flex-1 md:w-48 py-3 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                        category === 'industry' ? 'bg-blue-900/50 text-blue-200 shadow-lg ring-1 ring-blue-700' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    <span>For PROs & Industry</span>
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-2xl mx-auto transition-all duration-500 hover:border-orange-500/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {category === 'creative' ? 'I am a...' : 'Organization Type'}
              </label>
              <input 
                type="text" 
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={category === 'creative' ? "e.g. Techno Producer, Jazz Quartet" : "e.g. PRO (ASCAP), Rights Dao, Label"} 
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
                {category === 'creative' ? (
                    <>
                        <option>Futuristic & Bold</option>
                        <option>Gritty & Underground</option>
                        <option>Elegant & Classical</option>
                        <option>Playful & Pop</option>
                    </>
                ) : (
                    <>
                        <option>Professional & Technical</option>
                        <option>Disruptive & Visionary</option>
                        <option>Analytical & Data-Driven</option>
                        <option>Institutional & Secure</option>
                    </>
                )}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={appState === AppState.GENERATING}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all duration-300 ${
              appState === AppState.GENERATING 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : category === 'creative'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20'
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
                <span>Create {category === 'creative' ? 'Artist' : 'Industry'} Booklet</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-500 text-sm">
            <div className="flex flex-col items-center">
                <Music className="w-8 h-8 mb-3 text-slate-400" />
                <p>{category === 'creative' ? 'Preserve your audio forever.' : 'Immutable production history.'}</p>
            </div>
            <div className="flex flex-col items-center">
                <Zap className="w-8 h-8 mb-3 text-slate-400" />
                <p>{category === 'creative' ? 'No monthly fees. No link rot.' : 'Efficient Layer 2 scaling.'}</p>
            </div>
             <div className="flex flex-col items-center">
                <Disc className="w-8 h-8 mb-3 text-slate-400" />
                <p>{category === 'creative' ? 'True digital ownership.' : 'Automated royalty distribution.'}</p>
            </div>
        </div>
      </div>
    </div>
  );
};