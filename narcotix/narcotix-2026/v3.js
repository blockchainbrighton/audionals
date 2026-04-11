import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    cash: 1500,
    wanted: 0,
    health: 100,
    ammo: 150,
    weapon: 'PISTOL',
    isDriving: false,
    isDead: false,
    mission: null,
    message: "Welcome back to Liberty. Find the mission marker.",
    radio: "K-JAH FM: Heavy Dub Sessions..."
  });

  // Game Engine Constants
  const WORLD_SIZE = 6000;
  const BUILDINGS_COUNT = 100;
  const ROAD_WIDTH = 140;
  const MISSION_TYPES = ['STEAL_CAR', 'HITMAN', 'DELIVERY'];
  
  // Input Handling
  const keys = useRef({});
  
  // Game Objects
  const player = useRef({
    x: 3000, y: 3000, angle: 0, speed: 0, size: 16, 
    onFootSpeed: 4.0, rotSpeed: 0.15, health: 100, isDriving: false,
    lastFired: 0
  });
  
  const buildings = useRef([]);
  const vehicles = useRef([]);
  const bullets = useRef([]);
  const npcs = useRef([]);
  const policeCars = useRef([]);
  const particles = useRef([]);
  const missionMarkers = useRef({ x: 1200, y: 1200, active: true });
  const payNSpray = useRef({ x: 5000, y: 1000, w: 300, h: 300 });

  // Radio Station Loop
  useEffect(() => {
    const stations = [
      "HEAD RADIO: 'The sound of the city...'",
      "K-JAH: 'Serious dub for a serious city...'",
      "BREAKING NEWS: 'Madman seen driving sports car on sidewalk!'",
      "LIPS 106: 'All the hits, all the time...'",
      "POLICE BAND: 'All units, 10-34 in progress...'"
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % stations.length;
      setGameState(s => ({ ...s, radio: stations[i] }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
  };

  const createParticle = (x, y, color, type = 'smoke') => {
    particles.current.push({
      x, y, 
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: type === 'spark' ? 15 : 40,
      size: type === 'spark' ? 3 : 12,
      color
    });
  };

  useEffect(() => {
    // Generate City
    const b = [];
    for(let i=0; i<BUILDINGS_COUNT; i++) {
      const x = Math.floor(Math.random() * (WORLD_SIZE / 400)) * 400 + 150;
      const y = Math.floor(Math.random() * (WORLD_SIZE / 400)) * 400 + 150;
      if (Math.hypot(x-3000, y-3000) < 500) continue;
      b.push({
        x, y, w: 250, h: 250,
        color: `hsl(0, 0%, ${Math.random() * 20 + 10}%)`
      });
    }
    buildings.current = b;

    // Traffic & NPCs
    vehicles.current = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
      angle: Math.random() * Math.PI * 2, speed: Math.random() > 0.5 ? 1.8 : 0,
      type: 'sedan', color: `hsl(${Math.random() * 360}, 40%, 40%)`,
      health: 120, isTraffic: true, targetable: false
    }));

    npcs.current = Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
      angle: Math.random() * Math.PI * 2, speed: 0.9, health: 100,
      isTarget: false, isArmed: Math.random() > 0.85, lastFired: 0
    }));

    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyE') attemptAction();
      if (e.code === 'Digit1') setGameState(p => ({ ...p, weapon: 'PISTOL' }));
      if (e.code === 'Digit2') setGameState(p => ({ ...p, weapon: 'UZI' }));
    };
    const handleKeyUp = (e) => keys.current[e.code] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const attemptAction = () => {
      if (gameState.isDead) return;
      const p = player.current;
      if (p.isDriving) {
        p.isDriving = false;
        setGameState(prev => ({ ...prev, isDriving: false, message: "Left vehicle." }));
        p.x += 100; 
      } else {
        vehicles.current.forEach(v => {
          if (Math.hypot(p.x - v.x, p.y - v.y) < 90) {
            p.isDriving = true;
            p.currentVehicle = v;
            v.isTraffic = false;
            setGameState(prev => ({ ...prev, isDriving: true, message: "Engine started. Go!" }));
          }
        });
      }
    };

    const update = () => {
      if (gameState.isDead) return;
      const p = player.current;
      const now = Date.now();

      // Police & SWAT Spawning
      const maxCops = Math.floor(gameState.wanted) + 1;
      if (gameState.wanted >= 1 && policeCars.current.length < maxCops) {
         if (Math.random() > 0.98) {
            const isSwat = gameState.wanted >= 4 && Math.random() > 0.5;
            policeCars.current.push({
              x: p.x + (Math.random() > 0.5 ? 1300 : -1300),
              y: p.y + (Math.random() > 0.5 ? 1300 : -1300),
              angle: 0, speed: 0, 
              health: isSwat ? 600 : 250, 
              color: isSwat ? '#000' : '#111',
              type: isSwat ? 'SWAT' : 'COP'
            });
         }
      }

      // Mission Marker Collision
      if (missionMarkers.current.active && !p.isDriving) {
          if (Math.hypot(p.x - missionMarkers.current.x, p.y - missionMarkers.current.y) < 60) {
              const idx = Math.floor(Math.random() * npcs.current.length);
              npcs.current[idx].isTarget = true;
              npcs.current[idx].isArmed = true; // Target always shoots back
              setGameState(prev => ({ ...prev, mission: { type: 'HITMAN' }, message: "ELIMINATE THE SYNDICATE BOSS (RED DOT)!" }));
              missionMarkers.current.active = false;
          }
      }

      // Physics Loop
      if (p.isDriving) {
        const v = p.currentVehicle;
        const isHandbraking = keys.current['ShiftLeft'] || keys.current['ShiftRight'];
        
        if (keys.current['KeyW']) v.speed += 0.4;
        if (keys.current['KeyS']) v.speed -= 0.25;
        
        if (Math.abs(v.speed) > 0.5) {
          // Handbrake drift logic
          const driftFactor = isHandbraking ? 1.8 : 1.0;
          const turnSpeed = 0.08 * (Math.min(v.speed, 7) / 7) * driftFactor;
          if (keys.current['KeyA']) v.angle -= turnSpeed;
          if (keys.current['KeyD']) v.angle += turnSpeed;
          if (v.speed > 5) createParticle(v.x, v.y, isHandbraking ? '#555' : 'rgba(150,150,150,0.2)');
        }

        v.speed *= isHandbraking ? 0.94 : 0.97;
        let nx = v.x + Math.cos(v.angle) * v.speed;
        let ny = v.y + Math.sin(v.angle) * v.speed;
        
        buildings.current.forEach(b => {
          if (checkCollision({x: nx-40, y: ny-30, w: 80, h: 60}, b)) {
            if (Math.abs(v.speed) > 5) {
                p.health -= Math.abs(v.speed) * 4;
                createParticle(v.x, v.y, '#f59e0b', 'spark');
                setGameState(prev => ({ ...prev, health: Math.max(0, p.health) }));
            }
            v.speed = -v.speed * 0.4;
            nx = v.x; ny = v.y;
          }
        });
        v.x = nx; v.y = ny;
        p.x = v.x; p.y = v.y; p.angle = v.angle;
      } else {
        let dx = 0, dy = 0;
        if (keys.current['KeyW']) { dx += Math.cos(p.angle) * p.onFootSpeed; dy += Math.sin(p.angle) * p.onFootSpeed; }
        if (keys.current['KeyS']) { dx -= Math.cos(p.angle) * p.onFootSpeed; dy -= Math.sin(p.angle) * p.onFootSpeed; }
        if (keys.current['KeyA']) p.angle -= p.rotSpeed;
        if (keys.current['KeyD']) p.angle += p.rotSpeed;
        buildings.current.forEach(b => {
          if (checkCollision({x: p.x + dx - 15, y: p.y + dy - 15, w: 30, h: 30}, b)) { dx = 0; dy = 0; }
        });
        p.x += dx; p.y += dy;
      }

      // NPC AI & Combat
      npcs.current.forEach(n => {
          if (n.health > 0) {
              const dist = Math.hypot(n.x - p.x, n.y - p.y);
              if (n.isArmed && dist < 400) {
                  const targetAngle = Math.atan2(p.y - n.y, p.x - n.x);
                  n.angle += (targetAngle - n.angle) * 0.05;
                  if (now - n.lastFired > 1500) {
                      n.lastFired = now;
                      bullets.current.push({ x: n.x, y: n.y, vx: Math.cos(n.angle) * 12, vy: Math.sin(n.angle) * 12, life: 40, dmg: 10, owner: 'NPC' });
                  }
              } else {
                  n.x += Math.cos(n.angle) * n.speed;
                  n.y += Math.sin(n.angle) * n.speed;
                  if (Math.random() > 0.99) n.angle += (Math.random() - 0.5);
              }
          }
      });

      // Police / SWAT AI
      policeCars.current.forEach(pc => {
        const dist = Math.hypot(p.x - pc.x, p.y - pc.y);
        const tA = Math.atan2(p.y - pc.y, p.x - pc.x);
        pc.angle += (tA - pc.angle) * 0.12;
        pc.speed = pc.type === 'SWAT' ? 4.5 : 6.0;
        pc.x += Math.cos(pc.angle) * pc.speed;
        pc.y += Math.sin(pc.angle) * pc.speed;
        if (dist < 70) {
          p.health -= pc.type === 'SWAT' ? 1.5 : 0.8;
          setGameState(prev => ({ ...prev, health: Math.max(0, p.health) }));
          if (pc.type === 'SWAT') createParticle(p.x, p.y, '#fff', 'spark');
        }
      });

      // Bullet Logic
      bullets.current.forEach(b => {
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.owner === 'PLAYER') {
            npcs.current.forEach(n => {
              if (n.health > 0 && Math.hypot(b.x - n.x, b.y - n.y) < 25) {
                n.health -= b.dmg; b.life = 0;
                if (n.health <= 0) {
                    setGameState(prev => ({ ...prev, cash: prev.cash + 100, wanted: Math.min(prev.wanted + 0.4, 5) }));
                    if (n.isTarget) {
                        setGameState(prev => ({ ...prev, cash: prev.cash + 3000, mission: null, message: "BOSS ELIMINATED. MISSION PASSED!" }));
                        missionMarkers.current.active = true;
                    }
                }
              }
            });
            policeCars.current.forEach(pc => {
              if (Math.hypot(b.x - pc.x, b.y - pc.y) < 55) {
                pc.health -= b.dmg; b.life = 0;
                if (pc.health <= 0) setGameState(prev => ({ ...prev, cash: prev.cash + 500, wanted: Math.min(prev.wanted + 0.6, 5) }));
              }
            });
        } else {
            // NPC hitting player
            if (Math.hypot(b.x - p.x, b.y - p.y) < 25) {
                p.health -= b.dmg; b.life = 0;
                setGameState(prev => ({ ...prev, health: Math.max(0, p.health) }));
            }
        }
      });

      // Player Fire
      const rate = gameState.weapon === 'UZI' ? 120 : 500;
      if (keys.current['Space'] && !p.isDriving && now - p.lastFired > rate && gameState.ammo > 0) {
        p.lastFired = now;
        bullets.current.push({ 
            x: p.x, y: p.y, vx: Math.cos(p.angle) * 20, vy: Math.sin(p.angle) * 20, 
            life: 50, dmg: gameState.weapon === 'PISTOL' ? 100 : 40, owner: 'PLAYER' 
        });
        setGameState(prev => ({ ...prev, ammo: prev.ammo - 1 }));
      }

      bullets.current = bullets.current.filter(b => b.life > 0);
      particles.current = particles.current.filter(pt => pt.life > 0);
      policeCars.current = policeCars.current.filter(pc => pc.health > 0);
      if (p.health <= 0) setGameState(prev => ({ ...prev, isDead: true }));
    };

    const draw = () => {
      const p = player.current;
      ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 - p.x, canvas.height / 2 - p.y);

      // Roads
      ctx.fillStyle = '#2a2a2a';
      for(let i=0; i<WORLD_SIZE; i+=400) {
        ctx.fillRect(i-ROAD_WIDTH/2, 0, ROAD_WIDTH, WORLD_SIZE);
        ctx.fillRect(0, i-ROAD_WIDTH/2, WORLD_SIZE, ROAD_WIDTH);
      }

      // Buildings
      buildings.current.forEach(b => {
        ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#000'; ctx.strokeRect(b.x, b.y, b.w, b.h);
      });

      // Particles
      particles.current.forEach(pt => {
        ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life / 40;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // NPCs
      npcs.current.forEach(n => {
        if (n.health > 0) {
          ctx.fillStyle = n.isTarget ? '#ef4444' : (n.isArmed ? '#f97316' : '#facc15');
          ctx.beginPath(); ctx.arc(n.x, n.y, 12, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.fillStyle = '#450a0a'; ctx.fillRect(n.x-10, n.y-10, 20, 20);
        }
      });

      // Mission Marker
      if (missionMarkers.current.active) {
          ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
          ctx.beginPath(); ctx.arc(missionMarkers.current.x, missionMarkers.current.y, 50, 0, Math.PI*2); ctx.fill();
      }

      // Vehicles
      [...vehicles.current, ...policeCars.current].forEach(v => {
        ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
        ctx.fillStyle = v.color;
        const w = v.type === 'SWAT' ? 100 : 80;
        const h = v.type === 'SWAT' ? 55 : 44;
        ctx.fillRect(-w/2, -h/2, w, h);
        if (v.color === '#111' || v.color === '#000') {
           ctx.fillStyle = (Date.now() % 300 < 150) ? '#ef4444' : '#3b82f6';
           ctx.fillRect(10, -h/2 + 5, 12, h-10);
        }
        ctx.restore();
      });

      ctx.fillStyle = '#fff';
      bullets.current.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });

      // Player
      if (!p.isDriving && !gameState.isDead) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(14, -6, gameState.weapon === 'UZI' ? 22 : 14, 12);
        ctx.restore();
      }

      ctx.restore();

      // Radar
      const rS = 220;
      const rX = 20, rY = canvas.height - 280;
      const scale = rS / WORLD_SIZE;
      ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(rX, rY, rS, rS);
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.strokeRect(rX, rY, rS, rS);
      ctx.fillStyle = '#333'; buildings.current.forEach(b => ctx.fillRect(rX + b.x * scale, rY + b.y * scale, b.w * scale, b.h * scale));
      if (missionMarkers.current.active) { ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(rX + missionMarkers.current.x * scale, rY + missionMarkers.current.y * scale, 6, 0, Math.PI*2); ctx.fill(); }
      npcs.current.forEach(n => { if (n.isTarget && n.health > 0) { ctx.fillStyle = '#ef4444'; ctx.fillRect(rX + n.x * scale - 3, rY + n.y * scale - 3, 6, 6); } });
      policeCars.current.forEach(pc => { ctx.fillStyle = (Date.now() % 400 < 200) ? '#f00' : '#00f'; ctx.fillRect(rX + pc.x * scale - 3, rY + pc.y * scale - 3, 5, 5); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rX + player.current.x * scale, rY + player.current.y * scale, 4, 0, Math.PI*2); ctx.fill();
    };

    const loop = () => { update(); draw(); animationFrameId = requestAnimationFrame(loop); };
    loop();
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(animationFrameId); };
  }, [gameState.isDead, gameState.wanted, gameState.weapon, gameState.mission]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono uppercase text-white select-none">
      {/* HUD Top Left */}
      <div className="absolute top-8 left-8 flex flex-col gap-2 z-20">
        <div className="text-8xl text-green-500 font-black tracking-tighter drop-shadow-[6px_6px_0_rgba(0,0,0,1)]">
          ${gameState.cash.toLocaleString().padStart(8, '0')}
        </div>
        <div className="flex gap-3 py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-10 h-10 rotate-45 border-4 border-black ${i < Math.floor(gameState.wanted) ? 'bg-yellow-400 animate-pulse' : 'bg-neutral-800 opacity-40'}`}></div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xl">
            <div className={`px-6 py-2 border-4 ${gameState.weapon === 'PISTOL' ? 'bg-white text-black border-white shadow-[4px_4px_0_#999]' : 'border-white/20 opacity-50'}`}>1: PISTOL</div>
            <div className={`px-6 py-2 border-4 ${gameState.weapon === 'UZI' ? 'bg-white text-black border-white shadow-[4px_4px_0_#999]' : 'border-white/20 opacity-50'}`}>2: UZI</div>
        </div>
      </div>

      {/* HUD Top Right */}
      <div className="absolute top-8 right-8 text-right z-20 flex flex-col items-end gap-3">
        <div className="text-5xl font-black bg-red-700 px-8 py-3 border-b-8 border-red-950 shadow-2xl">HEALTH: {Math.floor(gameState.health)}%</div>
        <div className="text-3xl font-bold bg-blue-800 px-6 py-2 border-b-6 border-blue-950">AMMO: {gameState.ammo}</div>
      </div>

      {/* Ticker / News Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-blue-900/90 border-t-4 border-yellow-400 py-3 px-8 z-30 overflow-hidden">
        <div className="flex justify-between items-center">
            <div className="bg-yellow-400 text-black px-4 font-black text-xl italic mr-6">LIVE</div>
            <div className="flex-1 text-2xl font-bold truncate tracking-widest animate-pulse">{gameState.radio}</div>
            <div className="text-white/60 text-sm ml-6">09.00 - LIBERTY CITY NEWS</div>
        </div>
      </div>

      {/* Dead State */}
      {gameState.isDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 backdrop-blur-md">
           <div className="text-[20rem] font-black text-gray-400 italic opacity-10 absolute">WASTED</div>
           <div className="text-[12rem] font-black text-white italic drop-shadow-[15px_15px_0_#000] z-10 animate-bounce">WASTED</div>
           <button 
             onClick={() => window.location.reload()}
             className="mt-20 px-24 py-8 bg-white text-black text-4xl font-black hover:bg-green-500 transition-all shadow-[12px_12px_0_#444] active:translate-y-2"
           >
             RESPAWN
           </button>
        </div>
      )}

      {/* Mission Ticker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[400px] z-20 text-center pointer-events-none max-w-2xl">
        <div className="bg-black/80 px-12 py-6 border-x-8 border-pink-500 shadow-2xl">
            <div className="text-3xl font-black leading-tight tracking-tight">{gameState.message}</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className={`${gameState.isDead ? 'grayscale blur-xl brightness-50' : ''} transition-all duration-1000`}
      />
    </div>
  );
};

export default App;