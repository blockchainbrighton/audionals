
import { useState, useEffect } from 'react';

interface PlayerInput {
  up: boolean;
  left: boolean;
  right: boolean;
}

const usePlayerInput = (): PlayerInput => {
  const [input, setInput] = useState<PlayerInput>({
    up: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          setInput(prev => ({ ...prev, up: true }));
          break;
        case 'ArrowLeft':
        case 'a':
          setInput(prev => ({ ...prev, left: true }));
          break;
        case 'ArrowRight':
        case 'd':
          setInput(prev => ({ ...prev, right: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          setInput(prev => ({ ...prev, up: false }));
          break;
        case 'ArrowLeft':
        case 'a':
          setInput(prev => ({ ...prev, left: false }));
          break;
        case 'ArrowRight':
        case 'd':
          setInput(prev => ({ ...prev, right: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return input;
};

export default usePlayerInput;
