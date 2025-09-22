import Phaser from 'phaser';
import BootScene from '@game/BootScene';
import CityScene from '@game/CityScene';
import UIScene from '@game/UIScene';

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#101018',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 }
    }
  },
  scene: [BootScene, CityScene, UIScene],
  input: {
    gamepad: true
  }
};

window.addEventListener('load', () => {
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
});
