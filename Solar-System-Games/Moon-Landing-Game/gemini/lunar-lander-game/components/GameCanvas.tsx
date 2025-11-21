
import React, { useRef, useEffect, useMemo } from 'react';
import { Rocket, CelestialBody } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants';

interface GameCanvasProps {
  rocket: Rocket;
  celestialBodies: CelestialBody[];
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ rocket, celestialBodies }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const stars = useMemo<Star[]>(() => {
    const starArray: Star[] = [];
    for (let i = 0; i < 300; i++) {
      starArray.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: Math.random() * 1.2,
        alpha: Math.random() * 0.5 + 0.5,
      });
    }
    return starArray;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Camera settings
    const camera = {
      x: rocket.position.x - width / 2,
      y: rocket.position.y - height / 2,
    };
    
    // Clear canvas
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // --- DRAWING ---
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw Stars
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fill();
    });

    // Draw Celestial Bodies
    celestialBodies.forEach(body => {
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
      // Draw atmosphere glow
      const grad = ctx.createRadialGradient(body.position.x, body.position.y, body.radius, body.position.x, body.position.y, body.radius + 20);
      grad.addColorStop(0, `${body.color}44`);
      grad.addColorStop(1, `${body.color}00`);
      ctx.fillStyle = grad;
      ctx.fillRect(body.position.x - body.radius - 20, body.position.y - body.radius - 20, (body.radius+20)*2, (body.radius+20)*2);
    });

    // Draw Rocket
    ctx.save();
    ctx.translate(rocket.position.x, rocket.position.y);
    ctx.rotate(rocket.angle);

    const rocketWidth = 8;
    const rocketHeight = 15;

    // Rocket Body
    ctx.beginPath();
    ctx.moveTo(rocketHeight / 2, 0);
    ctx.lineTo(-rocketHeight / 2, rocketWidth / 2);
    ctx.lineTo(-rocketHeight / 2, -rocketWidth / 2);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();

    // Rocket Thrust Flame
    if (rocket.thrusting) {
      ctx.beginPath();
      ctx.moveTo(-rocketHeight / 2 - 2, 0);
      ctx.lineTo(-rocketHeight / 2 - (Math.random() * 10 + 5), rocketWidth / 3);
      ctx.lineTo(-rocketHeight / 2 - (Math.random() * 10 + 5), -rocketWidth / 3);
      ctx.closePath();
      ctx.fillStyle = `rgba(251, 146, 60, ${Math.random() * 0.5 + 0.5})`; // orange-400
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();

  }, [rocket, celestialBodies, stars]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default GameCanvas;
