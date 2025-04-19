import { useState } from 'react';

export default function SequencerPreview({ isPlaying, setIsPlaying }) {
  const [currentBPM, setCurrentBPM] = useState(120);
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleBPMChange = (e) => {
    setCurrentBPM(e.target.value);
  };
  
  return (
    <div className="sequencer-preview-container">
      <div className="sequencer-controls">
        <div className="play-controls">
          <button 
            className={`play-button ${isPlaying ? 'hidden' : ''}`} 
            onClick={togglePlay}
            aria-label="Play"
          >
            <span className="play-icon">▶</span>
          </button>
          <button 
            className={`stop-button ${!isPlaying ? 'hidden' : ''}`} 
            onClick={togglePlay}
            aria-label="Stop"
          >
            <span className="stop-icon">■</span>
          </button>
          <span className="control-label">Plays</span>
        </div>
        
        <div className="bpm-control">
          <label htmlFor="bpm-slider">BPM:</label>
          <input 
            type="range" 
            id="bpm-slider" 
            min="60" 
            max="180" 
            value={currentBPM} 
            onChange={handleBPMChange} 
            className="bpm-slider"
          />
          <span className="bpm-value">{currentBPM}</span>
        </div>
      </div>
      
      <div className="sequencer-interface">
        <div className="sequencer-header">
          <h3 className="sequencer-title">Audional Sequencer</h3>
          <div className="sequencer-subtitle">BitcoinBeats<span className="beta-tag">Beta</span></div>
        </div>
        
        <div className="sequencer-grid">
          {/* Simplified representation of the sequencer grid */}
          {Array(4).fill().map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="sequencer-row">
              <div className="channel-controls">
                <button className="channel-button">Load Sample</button>
                <div className="channel-buttons">
                  <button className="control-button">V</button>
                  <button className="control-button">P</button>
                  <button className="control-button">T</button>
                  <button className="control-button">C</button>
                  <button className="control-button">M</button>
                  <button className="control-button">S</button>
                </div>
              </div>
              <div className="step-buttons">
                {Array(16).fill().map((_, colIndex) => (
                  <button 
                    key={`step-${rowIndex}-${colIndex}`} 
                    className={`step-button ${(colIndex % 4 === 0) ? 'beat-marker' : ''} ${Math.random() > 0.8 ? 'active' : ''}`}
                    aria-label={`Step ${colIndex + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="sequencer-footer">
          <div className="sequence-controls">
            <button className="sequence-button">Previous Sequence</button>
            <span className="sequence-display">Sequence 0</span>
            <button className="sequence-button">Next Sequence</button>
            <label className="continuous-play">
              <input type="checkbox" /> Continuous Play
            </label>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .sequencer-preview-container {
          background-color: var(--dark-charcoal);
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          margin: 2rem 0;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .sequencer-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .play-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .play-button, .stop-button {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .play-button {
          background-color: #2ecc71;
        }
        
        .stop-button {
          background-color: #e74c3c;
        }
        
        .play-icon, .stop-icon {
          color: white;
          font-size: 1.5rem;
        }
        
        .hidden {
          display: none;
        }
        
        .control-label {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: var(--light-gray);
        }
        
        .bpm-control {
          display: flex;
          align-items: center;
        }
        
        .bpm-slider {
          width: 200px;
          margin: 0 1rem;
        }
        
        .bpm-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--white);
          min-width: 50px;
          text-align: center;
        }
        
        .sequencer-interface {
          background-color: #2a2a2a;
          border-radius: 6px;
          padding: 1rem;
        }
        
        .sequencer-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .sequencer-title {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }
        
        .sequencer-subtitle {
          font-size: 1.2rem;
          color: var(--bitcoin-orange);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .beta-tag {
          font-size: 0.7rem;
          background-color: var(--bitcoin-orange);
          color: var(--white);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          margin-left: 0.5rem;
          vertical-align: super;
        }
        
        .sequencer-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .sequencer-row {
          display: flex;
          align-items: center;
        }
        
        .channel-controls {
          display: flex;
          flex-direction: column;
          margin-right: 1rem;
          width: 120px;
        }
        
        .channel-button {
          background-color: #444;
          border: none;
          color: var(--white);
          padding: 0.3rem;
          border-radius: 3px;
          margin-bottom: 0.3rem;
          cursor: pointer;
          font-size: 0.8rem;
        }
        
        .channel-buttons {
          display: flex;
          gap: 0.2rem;
        }
        
        .control-button {
          width: 18px;
          height: 18px;
          background-color: #555;
          border: none;
          color: var(--white);
          border-radius: 2px;
          font-size: 0.7rem;
          cursor: pointer;
        }
        
        .step-buttons {
          display: grid;
          grid-template-columns: repeat(16, 1fr);
          gap: 0.2rem;
          flex: 1;
        }
        
        .step-button {
          width: 100%;
          aspect-ratio: 1;
          background-color: #444;
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        
        .step-button.beat-marker {
          border-left: 2px solid #666;
        }
        
        .step-button.active {
          background-color: var(--bitcoin-orange);
        }
        
        .sequencer-footer {
          margin-top: 1.5rem;
          display: flex;
          justify-content: center;
        }
        
        .sequence-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .sequence-button {
          background-color: #444;
          border: none;
          color: var(--white);
          padding: 0.3rem 0.6rem;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        
        .sequence-display {
          padding: 0.3rem 0.6rem;
          background-color: #333;
          border-radius: 3px;
          font-size: 0.8rem;
        }
        
        .continuous-play {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          margin-left: 1rem;
        }
        
        @media (max-width: 768px) {
          .sequencer-controls {
            flex-direction: column;
            gap: 1rem;
          }
          
          .channel-controls {
            width: 100px;
          }
          
          .step-buttons {
            gap: 0.1rem;
          }
          
          .sequence-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
