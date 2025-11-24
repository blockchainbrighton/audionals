import React, { useState, useRef, useMemo } from 'react';
import { 
  AppMode, 
  LayerId, 
  AppState, 
  Asset,
  LayerState
} from './types';
import { 
  POSTER_ASSETS, 
  BOOK_ASSETS, 
  INITIAL_STATE_POSTER, 
  INITIAL_STATE_BOOK,
  MODE_CONFIG 
} from './constants';
import DraggableLayer from './components/DraggableLayer';
import { generateAndDownload } from './utils/download';

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<AppMode>(AppMode.POSTER);
  
  // We keep separate history/state for both modes so switching back and forth preserves work
  const [posterState, setPosterState] = useState<AppState>({
    mode: AppMode.POSTER,
    layers: INITIAL_STATE_POSTER,
    activeTab: LayerId.BACKGROUND
  });

  const [bookState, setBookState] = useState<AppState>({
    mode: AppMode.BOOK,
    layers: INITIAL_STATE_BOOK,
    activeTab: LayerId.BACKGROUND
  });

  // Derived based on current mode
  const currentState = mode === AppMode.POSTER ? posterState : bookState;
  const setUiState = mode === AppMode.POSTER ? setPosterState : setBookState;
  const currentAssets = mode === AppMode.POSTER ? POSTER_ASSETS : BOOK_ASSETS;
  const config = MODE_CONFIG[mode];

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
  };

  const handleLayerUpdate = (layerId: LayerId, updates: Partial<AppState['layers'][LayerId]>) => {
    setUiState(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerId]: { ...prev.layers[layerId], ...updates }
      }
    }));
  };

  const handleAssetSelect = (layerId: LayerId, assetId: string) => {
    handleLayerUpdate(layerId, { assetId });
  };

  const handleTabChange = (tabId: LayerId) => {
    setUiState(prev => ({ ...prev, activeTab: tabId }));
  };

  const handleDownload = () => {
    const layers = Object.values(currentState.layers) as LayerState[];
    generateAndDownload(mode, layers, currentAssets);
  };

  const handleReset = () => {
    const freshState = mode === AppMode.POSTER ? INITIAL_STATE_POSTER : INITIAL_STATE_BOOK;
    setUiState(prev => ({ ...prev, layers: freshState }));
  };

  // --- UI Helpers ---

  const getAssetsForTab = (tabId: LayerId) => {
    const tabConfig = config.tabs.find(t => t.id === tabId);
    if (!tabConfig) return [];
    return currentAssets.filter(a => a.category === tabConfig.category);
  };

  // --- Render ---

  return (
    <div className="min-h-screen font-sans text-gray-100 flex flex-col pb-8">
      {/* Header */}
      <header className="text-center py-8 px-4 bg-gradient-to-b from-black/20 to-transparent">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 drop-shadow-sm">
          BURGESS DESIGNER
        </h1>
        <p className="text-purple-200 opacity-80 mb-6">Create the perfect visual for your work</p>
        
        {/* Mode Switcher */}
        <div className="inline-flex bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
          <button
            onClick={() => handleModeSwitch(AppMode.POSTER)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === AppMode.POSTER 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-purple-200 hover:bg-white/5'
            }`}
          >
            Poster Mode
          </button>
          <button
            onClick={() => handleModeSwitch(AppMode.BOOK)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === AppMode.BOOK 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-purple-200 hover:bg-white/5'
            }`}
          >
            Book Cover Mode
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        
        {/* Left Column: Canvas */}
        <div className="flex flex-col gap-4 sticky top-4">
          <div className="bg-black/30 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 text-purple-200 font-medium">
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span>Preview</span>
              </div>
              <span className="text-xs uppercase tracking-wider opacity-60 bg-white/10 px-2 py-1 rounded">
                {mode === AppMode.POSTER ? '3:2 Ratio' : '1:1.6 Ratio'}
              </span>
            </div>
            
            {/* The Canvas Area */}
            <div 
              ref={canvasRef}
              className={`relative w-full ${config.aspectRatio} bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-purple-500/40 transition-all duration-300 shadow-inner`}
            >
              {(Object.values(currentState.layers) as LayerState[]).sort((a,b) => a.zIndex - b.zIndex).map((layer) => {
                 if (!layer.visible || !layer.assetId) return null;
                 const asset = currentAssets.find(a => a.id === layer.assetId);
                 if (!asset) return null;

                 return (
                   <DraggableLayer
                      key={layer.id}
                      layer={layer}
                      src={asset.src}
                      isActive={currentState.activeTab === layer.id}
                      containerRef={canvasRef}
                      onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
                   />
                 );
              })}
            </div>

            {/* Canvas Actions */}
            <div className="flex gap-4 mt-6">
              <button 
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-xl border border-white/20 hover:bg-white/10 transition font-semibold text-purple-200 flex items-center justify-center gap-2"
              >
                <span>↺</span> Reset
              </button>
              <button 
                onClick={handleDownload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition shadow-lg shadow-purple-900/40 font-bold flex items-center justify-center gap-2"
              >
                <span>⬇</span> Download
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="flex flex-col gap-6">
          
          {/* Tab Navigation */}
          <div className="bg-black/30 backdrop-blur-md border border-purple-500/30 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex border-b border-purple-500/20 bg-black/20">
              {config.tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative
                    ${currentState.activeTab === tab.id 
                      ? 'text-white bg-purple-600/20' 
                      : 'text-purple-300/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {tab.label}
                  {currentState.activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500 shadow-[0_-2px_8px_rgba(168,85,247,0.5)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 min-h-[300px]">
              <div className="grid grid-cols-2 gap-4">
                {getAssetsForTab(currentState.activeTab).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleAssetSelect(currentState.activeTab, asset.id)}
                    className={`group relative rounded-xl overflow-hidden border-2 transition-all aspect-video
                      ${currentState.layers[currentState.activeTab].assetId === asset.id 
                        ? 'border-purple-500 ring-2 ring-purple-500/50 scale-[1.02]' 
                        : 'border-white/10 hover:border-purple-400/50 hover:scale-[1.02]'
                      }
                    `}
                  >
                    <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                       <span className="text-xs font-medium text-white truncate w-full text-center">{asset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scale Controls (Only for non-background layers) */}
          {currentState.activeTab !== LayerId.BACKGROUND && (
            <div className="bg-black/30 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 shadow-xl animate-fade-in">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>⚙️</span> Size Adjustments
              </h3>
              
              <div className="space-y-6">
                 <div>
                   <div className="flex justify-between mb-2">
                     <label className="text-sm text-purple-200">Scale</label>
                     <span className="text-sm font-mono text-purple-300">
                       {currentState.layers[currentState.activeTab].scale}%
                     </span>
                   </div>
                   <input
                     type="range"
                     min="50"
                     max="200"
                     value={currentState.layers[currentState.activeTab].scale}
                     onChange={(e) => handleLayerUpdate(currentState.activeTab, { scale: Number(e.target.value) })}
                     className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-purple-500"
                   />
                 </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-black/20 border border-purple-500/20 rounded-2xl p-6">
             <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-3">Quick Guide</h3>
             <ul className="space-y-2 text-sm text-purple-200/70">
               <li className="flex items-start gap-2">
                 <span className="text-purple-500">•</span>
                 Select a category tab to choose your assets.
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-purple-500">•</span>
                 Drag elements on the canvas to position them.
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-purple-500">•</span>
                 Use the scale slider to resize the selected element.
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-purple-500">•</span>
                 Switch between Poster and Book mode anytime.
               </li>
             </ul>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;