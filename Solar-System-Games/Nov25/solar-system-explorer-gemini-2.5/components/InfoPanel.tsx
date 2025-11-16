
import React from 'react';
import { CelestialBody } from '../types';
import { CloseIcon } from './icons';

interface InfoPanelProps {
  body: CelestialBody | null;
  onClose: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ body, onClose }) => {
  const formatNumber = (num?: number) => {
    if (num === undefined) return 'N/A';
    return num.toLocaleString();
  };
  
  const orbitalPeriodDays = body?.orbit ? 2 * Math.PI * Math.sqrt(Math.pow(body.orbit.semiMajorAxis, 3)) * 365.25 : undefined;

  return (
    <div
      className={`absolute top-0 right-0 h-full z-30 w-full max-w-sm bg-gray-900 bg-opacity-80 backdrop-blur-lg shadow-2xl transition-transform duration-300 ease-in-out
        ${body ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="p-6 h-full overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold" style={{ color: body?.color || '#FFF' }}>
            {body?.name}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {body && (
          <div className="space-y-4 text-sm">
            <p className="text-base text-gray-300 leading-relaxed">
              A {body.type.toLowerCase()} in our solar system, with a radius of {formatNumber(body.radius)} km.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
              <InfoItem label="Type" value={body.type} />
              <InfoItem label="Mass" value={`${formatNumber(body.mass)} x 10²⁴ kg`} />
              <InfoItem label="Radius" value={`${formatNumber(body.radius)} km`} />
              <InfoItem label="Rotation Period" value={`${formatNumber(body.rotationPeriod)} hours`} />
              <InfoItem label="Axial Tilt" value={`${formatNumber(body.axialTilt)}°`} />
              {orbitalPeriodDays !== undefined && (
                <InfoItem label="Orbital Period" value={`${formatNumber(Math.round(orbitalPeriodDays))} days`} />
              )}
            </div>

            {body.orbit && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-2 text-cyan-400">Orbital Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Semi-Major Axis" value={`${body.orbit.semiMajorAxis} AU`} />
                  <InfoItem label="Eccentricity" value={body.orbit.eccentricity.toString()} />
                  <InfoItem label="Inclination" value={`${body.orbit.inclination}°`} />
                  <InfoItem label="Arg. of Periapsis" value={`${body.orbit.argumentOfPeriapsis}°`} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-gray-400">{label}</p>
    <p className="font-semibold text-base">{value}</p>
  </div>
);

export default InfoPanel;
