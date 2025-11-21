
import React from 'react';
import { PlayIcon, PauseIcon } from './icons';

interface ControlsProps {
  timeScale: number;
  setTimeScale: (scale: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  julianDate: number;
  zoom: number;
  setZoom: (zoom: number) => void;
}

const timeScales = [
  { label: '1 hr/s', value: 3600 },
  { label: '1 day/s', value: 86400 },
  { label: '30 days/s', value: 86400 * 30 },
  { label: '1 year/s', value: 86400 * 365.25 },
  { label: '10 years/s', value: 86400 * 365.25 * 10 },
];

const Controls: React.FC<ControlsProps> = ({ timeScale, setTimeScale, isPaused, setIsPaused, julianDate, zoom, setZoom }) => {
  const gregorianDate = new Date((julianDate - 2440587.5) * 86400000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
        
        {/* Time and Playback */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-full bg-gray-700 hover:bg-cyan-500 transition-colors"
            aria-label={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? <PlayIcon className="h-6 w-6" /> : <PauseIcon className="h-6 w-6" />}
          </button>
          <div className="text-center">
            <div className="font-bold text-lg">{gregorianDate}</div>
            <div className="text-xs text-gray-400">JD {julianDate.toFixed(2)}</div>
          </div>
        </div>

        {/* Time Scale */}
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-300 mb-1">Time Warp</span>
          <div className="flex items-center gap-2 p-1 rounded-full bg-gray-800">
            {timeScales.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeScale(value)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  timeScale === value ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Zoom Control */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-gray-300">Zoom</span>
          <input
            type="range"
            min="0.1"
            max="15"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full sm:w-32 accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Controls;
