
import React from 'react';
import { GameState } from '../types';

interface MessageOverlayProps {
  gameState: GameState;
  message: string;
  isLoading: boolean;
  onStartGame: () => void;
  onRestartFromEarth: () => void;
  onRestartFromMoon: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
);

const MessageOverlay: React.FC<MessageOverlayProps> = ({
  gameState,
  message,
  isLoading,
  onStartGame,
  onRestartFromEarth,
  onRestartFromMoon,
}) => {
  const renderButtons = () => {
    switch (gameState) {
      case GameState.Start:
        return <button onClick={onStartGame} className={buttonClasses}>Begin Mission</button>;
      case GameState.Crashed:
        return <button onClick={onRestartFromEarth} className={buttonClasses}>Try Again</button>;
      case GameState.LandedMoon:
        return <button onClick={onRestartFromMoon} className={buttonClasses}>Launch from Moon</button>;
      case GameState.LandedEarth:
        return <button onClick={onRestartFromEarth} className={buttonClasses}>Fly Again</button>;
      default:
        return null;
    }
  };

  const buttonClasses = "mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold transition-colors shadow-lg";

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
      <div className="text-center p-8 max-w-lg bg-gray-800 bg-opacity-80 backdrop-blur-md rounded-lg shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-blue-300">
          {gameState === GameState.Start && 'MISSION BRIEFING'}
          {gameState === GameState.Crashed && 'MISSION FAILED'}
          {gameState === GameState.LandedMoon && 'TOUCHDOWN CONFIRMED'}
          {gameState === GameState.LandedEarth && 'MISSION ACCOMPLISHED'}
        </h2>
        {isLoading ? (
            <div className="flex justify-center items-center h-20">
                <LoadingSpinner/>
            </div>
        ) : (
            <p className="text-gray-200">{message}</p>
        )}
        {!isLoading && renderButtons()}
      </div>
    </div>
  );
};

export default MessageOverlay;
