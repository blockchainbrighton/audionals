import Image from 'next/image';
import { useState } from 'react';

export default function FeaturedComposition({ title, creator, image, audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  return (
    <div className="featured-composition">
      <div className="composition-image">
        <div className="image-placeholder">
          {/* Replace with actual Image component when images are available */}
          <div className="placeholder-content">
            <span className="bitcoin-icon">₿</span>
            <span className="music-icon">♪</span>
          </div>
        </div>
        <button 
          className="play-overlay" 
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <span className={`play-icon ${isPlaying ? 'playing' : ''}`}>
            {isPlaying ? '❚❚' : '▶'}
          </span>
        </button>
      </div>
      <div className="composition-info">
        <h3 className="composition-title">{title}</h3>
        <p className="composition-creator">by {creator}</p>
      </div>
      
      <style jsx>{`
        .featured-composition {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .featured-composition:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        .composition-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background-color: #333;
        }
        
        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
        }
        
        .placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .bitcoin-icon {
          font-size: 3rem;
          color: var(--bitcoin-orange);
          margin-bottom: 0.5rem;
        }
        
        .music-icon {
          font-size: 2rem;
          color: var(--electric-purple);
        }
        
        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          border: none;
          cursor: pointer;
        }
        
        .composition-image:hover .play-overlay {
          opacity: 1;
        }
        
        .play-icon {
          width: 60px;
          height: 60px;
          background-color: var(--bitcoin-orange);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          transition: transform 0.3s ease, background-color 0.3s ease;
        }
        
        .play-icon:hover {
          transform: scale(1.1);
        }
        
        .play-icon.playing {
          background-color: var(--electric-purple);
        }
        
        .composition-info {
          padding: 1.5rem;
        }
        
        .composition-title {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
          color: var(--white);
        }
        
        .composition-creator {
          color: var(--light-gray);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
