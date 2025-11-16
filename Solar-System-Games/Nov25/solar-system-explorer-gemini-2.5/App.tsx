

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { celestialBodies as initialBodies } from './data/celestialData';
import { CelestialBody, Position } from './types';
import { calculatePosition } from './services/orbitalMechanics';
import SolarSystem from './components/SolarSystem';
import Controls from './components/Controls';
import InfoPanel from './components/InfoPanel';

const App: React.FC = () => {
  const [bodies, setBodies] = useState<CelestialBody[]>(initialBodies);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(initialBodies.find(b => b.id === 'sun') || null);
  const [julianDate, setJulianDate] = useState<number>(2451545.0); // J2000.0 epoch
  const [timeScale, setTimeScale] = useState<number>(86400); // 1 day per second
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1); // Relative zoom level
  const [viewCenter, setViewCenter] = useState<Position>({ x: 0, y: 0, z: 0 });

  const animationFrameId = useRef<number>();

  const updatePositions = useCallback(() => {
    const newPositions: Record<string, Position> = {};
    // FIX: Explicitly type `bodyMap` to ensure correct type inference.
    const bodyMap: Map<string, CelestialBody> = new Map(bodies.map(b => [b.id, b]));

    function getPosition(body: CelestialBody): Position {
      if (newPositions[body.id]) {
        return newPositions[body.id];
      }
      const pos = calculatePosition(body, julianDate);
      if (body.parentId) {
        const parent = bodyMap.get(body.parentId);
        if (parent) {
          const parentPos = getPosition(parent);
          pos.x += parentPos.x;
          pos.y += parentPos.y;
          pos.z += parentPos.z;
        }
      }
      newPositions[body.id] = pos;
      return pos;
    }

    for (const body of bodies) {
      getPosition(body);
    }

    setPositions(newPositions);

    if (selectedBody && newPositions[selectedBody.id]) {
      setViewCenter(newPositions[selectedBody.id]);
    } else {
       setViewCenter({ x: 0, y: 0, z: 0 });
    }
  }, [julianDate, bodies, selectedBody]);

  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  const advanceTime = useCallback(() => {
    if (!isPaused) {
      setJulianDate(prevDate => prevDate + (timeScale / (3600 * 24)));
    }
    animationFrameId.current = requestAnimationFrame(advanceTime);
  }, [isPaused, timeScale]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(advanceTime);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [advanceTime]);

  const handleSelectBody = (body: CelestialBody | null) => {
    setSelectedBody(body);
    if (body) {
        const pos = positions[body.id] || {x: 0, y: 0, z: 0};
        setViewCenter(pos);
    } else {
        setViewCenter({ x: 0, y: 0, z: 0 });
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans">
      <header className="absolute top-0 left-0 z-20 p-4 text-white">
        <h1 className="text-2xl font-bold tracking-wider">Solar System Explorer</h1>
        <p className="text-sm text-gray-400">An interactive orbital mechanics simulation</p>
      </header>
      
      <SolarSystem
        bodies={bodies}
        positions={positions}
        selectedBody={selectedBody}
        onSelectBody={handleSelectBody}
        zoom={zoom}
        viewCenter={viewCenter}
      />
      
      <Controls
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        julianDate={julianDate}
        zoom={zoom}
        setZoom={setZoom}
      />
      
      <InfoPanel body={selectedBody} onClose={() => handleSelectBody(null)} />
    </div>
  );
};

export default App;