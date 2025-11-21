import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GameCanvas from './components/GameCanvas';
import Hud from './components/Hud';
import MessageOverlay from './components/MessageOverlay';
import usePlayerInput from './hooks/usePlayerInput';
import { GameState, Rocket, CelestialBody, Vector2D } from './types';
import { 
  INITIAL_ROCKET_STATE_EARTH, 
  EARTH, 
  MOON, 
  SCALE, 
  THRUST, 
  ROTATION_SPEED, 
  FUEL_CONSUMPTION, 
  GRAVITATIONAL_CONSTANT, 
  SAFE_LANDING_SPEED,
  TIME_STEP,
  INITIAL_ROCKET_STATE_MOON
} from './constants';
import { getMissionBriefing } from './services/geminiService';

const App: React.FC = () => {
  const [rocket, setRocket] = useState<Rocket>(INITIAL_ROCKET_STATE_EARTH);
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [altitude, setAltitude] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [missionBriefing, setMissionBriefing] = useState<string>('');
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(true);

  const playerInput = usePlayerInput();

  const celestialBodies = useMemo(() => [EARTH, MOON], []);

  const resetGame = useCallback((startOnMoon = false) => {
    setRocket(startOnMoon ? INITIAL_ROCKET_STATE_MOON : INITIAL_ROCKET_STATE_EARTH);
    setGameState(GameState.Playing);
  }, []);
  
  const fetchBriefing = useCallback(async () => {
    setIsLoadingBriefing(true);
    try {
      const briefing = await getMissionBriefing();
      setMissionBriefing(briefing);
      setMessage(briefing);
    } catch (error) {
      console.error("Failed to fetch mission briefing:", error);
      const fallbackBriefing = "Your mission, should you choose to accept it: Launch from Earth, master orbital mechanics, land on the Moon, and return. Godspeed, pilot.";
      setMissionBriefing(fallbackBriefing);
      setMessage(fallbackBriefing);
    } finally {
      setIsLoadingBriefing(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const updateGame = useCallback(() => {
    // Create a new rocket object from the current state to modify
    const newRocket = {
        position: { ...rocket.position },
        velocity: { ...rocket.velocity },
        angle: rocket.angle,
        fuel: rocket.fuel,
        thrusting: rocket.thrusting
    };

    // isIdleOnPad check: Prevents gravity from acting on the rocket at the start.
    const isIdleOnPad = rocket.velocity.x === 0 && rocket.velocity.y === 0 && !playerInput.up;
    if (isIdleOnPad) {
      if (playerInput.left) newRocket.angle -= ROTATION_SPEED * TIME_STEP;
      if (playerInput.right) newRocket.angle += ROTATION_SPEED * TIME_STEP;
      newRocket.thrusting = false;
      setRocket(newRocket);
      return; // Exit early, no physics needed.
    }

    // Handle Player Input for thrust and rotation
    newRocket.thrusting = newRocket.fuel > 0 && playerInput.up;
    if (playerInput.left) newRocket.angle -= ROTATION_SPEED * TIME_STEP;
    if (playerInput.right) newRocket.angle += ROTATION_SPEED * TIME_STEP;

    // Physics Calculation
    let totalForce: Vector2D = { x: 0, y: 0 };
    if (newRocket.thrusting) {
        totalForce.x += Math.cos(newRocket.angle) * THRUST;
        totalForce.y += Math.sin(newRocket.angle) * THRUST;
        newRocket.fuel -= FUEL_CONSUMPTION * TIME_STEP;
        if (newRocket.fuel < 0) newRocket.fuel = 0;
    }

    // Gravitational Forces
    celestialBodies.forEach(body => {
        const dx = body.position.x - newRocket.position.x;
        const dy = body.position.y - newRocket.position.y;
        const distanceSq = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSq);

        if (distance > body.radius) {
            const forceMag = (GRAVITATIONAL_CONSTANT * body.mass) / distanceSq;
            totalForce.x += (dx / distance) * forceMag;
            totalForce.y += (dy / distance) * forceMag;
        }
    });

    // Update velocity and position
    newRocket.velocity.x += totalForce.x * TIME_STEP;
    newRocket.velocity.y += totalForce.y * TIME_STEP;
    newRocket.position.x += newRocket.velocity.x * TIME_STEP;
    newRocket.position.y += newRocket.velocity.y * TIME_STEP;

    // Collision, Landing, and HUD Updates
    let closestBody: CelestialBody | null = null;
    let minDistance = Infinity;

    for (const body of celestialBodies) {
        const dx = body.position.x - newRocket.position.x;
        const dy = body.position.y - newRocket.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            closestBody = body;
        }

        if (distance <= body.radius) {
            const currentSpeed = Math.sqrt(newRocket.velocity.x**2 + newRocket.velocity.y**2);
            if (currentSpeed > SAFE_LANDING_SPEED) {
                setGameState(GameState.Crashed);
                setMessage(`You crashed on ${body.name}! Speed: ${Math.round(currentSpeed * SCALE)} m/s. Too fast!`);
            } else {
                if (body.name === 'Earth') {
                    setGameState(GameState.LandedEarth);
                    setMessage('Welcome home, pilot! A perfect landing on Earth.');
                } else {
                    setGameState(GameState.LandedMoon);
                    setMessage('One small step... You\'ve landed on the Moon!');
                }
            }
            setRocket(newRocket);
            setSpeed(currentSpeed * SCALE);
            setAltitude(0);
            return; // Game state has changed, end the update for this frame.
        }
    }
    
    // If no collision, update all states
    setRocket(newRocket);
    if (closestBody) {
        setAltitude(Math.max(0, (minDistance - closestBody.radius) * SCALE));
    }
    setSpeed(Math.sqrt(newRocket.velocity.x**2 + newRocket.velocity.y**2) * SCALE);

  }, [rocket, playerInput, celestialBodies]);

  // Game loop using requestAnimationFrame for smooth, efficient updates.
  useEffect(() => {
    if (gameState !== GameState.Playing) {
      return; // Do nothing if the game is not active.
    }

    let animationFrameId: number;
    const gameLoop = () => {
      updateGame();
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, updateGame]);

  const handleStartGame = () => {
    setGameState(GameState.Playing);
  };
  
  const handleRestartFromMoon = () => {
    resetGame(true);
  };

  const handleRestartFromEarth = () => {
    resetGame(false);
  };

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-mono text-white">
      <Hud fuel={rocket.fuel} speed={speed} altitude={altitude} />
      <GameCanvas rocket={rocket} celestialBodies={celestialBodies} />
      {(gameState !== GameState.Playing) && (
        <MessageOverlay 
          gameState={gameState} 
          message={message}
          isLoading={isLoadingBriefing}
          onStartGame={handleStartGame}
          onRestartFromEarth={handleRestartFromEarth}
          onRestartFromMoon={handleRestartFromMoon}
        />
      )}
       <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-black bg-opacity-50 p-2 rounded">
          <p><span className="font-bold text-white">Controls:</span></p>
          <p><span className="font-bold text-white">Up Arrow:</span> Thrust</p>
          <p><span className="font-bold text-white">Left/Right Arrows:</span> Rotate</p>
        </div>
    </main>
  );
};

export default App;
