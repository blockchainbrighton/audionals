
import React, { useMemo } from 'react';
import { CelestialBody, Position } from '../types';
import { calculatePosition } from '../services/orbitalMechanics';

interface SolarSystemProps {
  bodies: CelestialBody[];
  positions: Record<string, Position>;
  selectedBody: CelestialBody | null;
  onSelectBody: (body: CelestialBody) => void;
  zoom: number;
  viewCenter: Position;
}

const AU_TO_PIXELS = 150; // Base scale: 1 AU = 150 pixels at zoom=1
const MIN_PLANET_RADIUS_PX = 1.5;
const MAX_PLANET_RADIUS_PX = 15;
const STAR_RADIUS_PX = 20;

const SolarSystem: React.FC<SolarSystemProps> = ({ bodies, positions, selectedBody, onSelectBody, zoom, viewCenter }) => {

  const getOrbitPath = (body: CelestialBody) => {
    if (!body.orbit) return '';
    const points: string[] = [];
    const steps = 180;
    const dummyEpoch = 2451545.0; // J2000
    // Simplified period calculation for orbit drawing
    const period = 2 * Math.PI * Math.sqrt(Math.pow(body.orbit.semiMajorAxis, 3));
    
    for (let i = 0; i <= steps; i++) {
        const timeOffset = (period / steps) * i;
        const pos = calculatePosition(body, dummyEpoch + timeOffset);
        points.push(`${pos.x},${pos.y}`);
    }

    if (points.length > 0) {
      const parentPos = body.parentId && positions[body.parentId] ? positions[body.parentId] : { x: 0, y: 0 };
      const transform = `translate(${parentPos.x * AU_TO_PIXELS}, ${parentPos.y * AU_TO_PIXELS})`;
      const d = `M ${points.map(p => p.split(',').map(c => parseFloat(c) * AU_TO_PIXELS).join(',')).join(' L ')}`;
      return <path d={d} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" fill="none" transform={transform} vectorEffect="non-scaling-stroke" />;
    }
    return null;
  };

  const orbitPaths = useMemo(() => {
    return bodies.filter(b => b.id !== 'sun').map(body => (
      <React.Fragment key={`${body.id}-orbit`}>
        {getOrbitPath(body)}
      </React.Fragment>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, positions]); // Update orbits if parent position changes (for moons)

  const getScaledRadius = (body: CelestialBody) => {
    if (body.type === 'Star') return STAR_RADIUS_PX / Math.sqrt(zoom);
    const logRadius = Math.log10(body.radius);
    // Scale radius logarithmically between min and max pixel sizes
    // log10 of radii are roughly 3 (1000km) to 5 (100000km)
    const scaled = MIN_PLANET_RADIUS_PX + (logRadius - 3) * (MAX_PLANET_RADIUS_PX - MIN_PLANET_RADIUS_PX) / 2;
    return Math.max(MIN_PLANET_RADIUS_PX, scaled) / Math.sqrt(zoom);
  };
  
  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g 
            transform={`translate(50, 50) scale(${zoom / AU_TO_PIXELS}) translate(${-viewCenter.x * AU_TO_PIXELS}, ${-viewCenter.y * AU_TO_PIXELS})`}
            className="transition-transform duration-300 ease-out"
        >
          {orbitPaths}
          {bodies.map(body => {
            const pos = positions[body.id];
            if (!pos) return null;
            const isSelected = selectedBody?.id === body.id;
            
            return (
              <g
                key={body.id}
                transform={`translate(${pos.x * AU_TO_PIXELS}, ${pos.y * AU_TO_PIXELS})`}
                onClick={() => onSelectBody(body)}
                className="cursor-pointer group"
              >
                <circle
                  r={getScaledRadius(body) * (isSelected ? 1.5 : 1)}
                  fill={body.color}
                  className="transition-all"
                  style={body.type === 'Star' ? { filter: 'url(#glow)' } : {}}
                />
                { (zoom > 5 || isSelected) && (
                  <text
                    y={-getScaledRadius(body) - 5 / zoom}
                    textAnchor="middle"
                    fill="white"
                    fontSize={12 / zoom}
                    className="font-semibold"
                    paintOrder="stroke"
                    stroke="black"
                    strokeWidth={0.5/zoom}
                    style={{ pointerEvents: 'none' }}
                  >
                    {body.name}
                  </text>
                )}
                {isSelected && (
                  <circle
                    r={getScaledRadius(body) + 8 / zoom}
                    fill="none"
                    stroke="cyan"
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                  >
                     <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 0 0"
                        to="360 0 0"
                        dur="10s"
                        repeatCount="indefinite"
                     />
                  </circle>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default SolarSystem;
