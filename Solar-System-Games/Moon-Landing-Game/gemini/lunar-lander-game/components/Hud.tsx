
import React from 'react';

interface HudProps {
  fuel: number;
  speed: number;
  altitude: number;
}

const Hud: React.FC<HudProps> = ({ fuel, speed, altitude }) => {
  const fuelPercentage = Math.max(0, fuel).toFixed(0);

  return (
    <div className="absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-20 backdrop-blur-sm z-10">
      <div className="container mx-auto flex justify-around text-center text-sm md:text-lg">
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">FUEL</span>
          <div className="w-24 h-4 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-green-500 transition-all duration-200" 
              style={{ width: `${fuelPercentage}%` }}
            ></div>
          </div>
          <span className="font-bold text-white">{fuelPercentage}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">SPEED</span>
          <span className="font-bold text-white">{speed.toFixed(0)} m/s</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">ALTITUDE</span>
          <span className="font-bold text-white">
            {altitude > 1000 ? `${(altitude / 1000).toFixed(2)} km` : `${altitude.toFixed(0)} m`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Hud;
