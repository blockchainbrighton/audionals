import Phaser from 'phaser';

const TILEMAP_KEYS = [
  'district_downtown',
  'district_industrial',
  'district_residential',
  'district_waterfront'
];

const DATA_FILES: Array<[string, string]> = [
  ['vehicles', 'vehicles.json'],
  ['weapons', 'weapons.json'],
  ['peds', 'peds.json'],
  ['missions', 'missions.json'],
  ['spawn_zones', 'spawn_zones.json']
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.setPath('assets');

    TILEMAP_KEYS.forEach((key) => {
      this.load.tilemapTiledJSON(key, `tilemaps/${key}.json`);
    });

    this.load.setPath('src/data');
    DATA_FILES.forEach(([key, fileName]) => {
      this.load.json(key, fileName);
    });
    this.load.setPath('');

    this.load.setPath('assets/sfx');
    this.load.audio('sfx_pistol', 'pistol.wav');
    this.load.audio('sfx_smg', 'smg.wav');
    this.load.audio('sfx_shotgun', 'shotgun.wav');
    this.load.audio('sfx_explosion', 'explosion.wav');
    this.load.audio('sfx_hit', 'hit.wav');
    this.load.audio('sfx_ui', 'ui.wav');

    this.load.setPath('assets/music');
    this.load.audio('music_ambient', 'ambient.wav');
    this.load.setPath('');

    this.createLoadingDisplay();
  }

  create(): void {
    this.generateCoreTextures();
    this.scene.start('city');
    this.scene.launch('ui');
  }

  private createLoadingDisplay(): void {
    const { width, height } = this.scale;
    const progressBar = this.add.rectangle(width * 0.5, height * 0.5, width * 0.5, 24, 0x222244);
    const progressFill = this.add.rectangle(progressBar.x - progressBar.width / 2, progressBar.y, 4, 20, 0x44aaff);
    progressFill.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      progressFill.width = progressBar.width * Phaser.Math.Clamp(value, 0, 1);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressFill.destroy();
    });
  }

  private generateCoreTextures(): void {
    this.generatePlayerTexture();
    this.generatePedTexture();
    this.generateVehicleTextures();
    this.generateWeaponTextures();
    this.generateEffectTextures();
    this.generateTileTextures();
  }

  private createTempGraphics(): Phaser.GameObjects.Graphics {
    const gfx = this.add.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    return gfx;
  }

  private generatePlayerTexture(): void {
    const size = 16;
    const gfx = this.createTempGraphics();
    gfx.fillStyle(0x3ac7c7, 1);
    gfx.fillRect(0, 0, size, size);
    gfx.fillStyle(0x1b2a36, 1);
    gfx.fillRect(0, 0, size, 6);
    gfx.fillRect(0, size - 6, size, 6);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(4, 4, 8, 8);
    gfx.generateTexture('player_base', size, size);
    gfx.destroy();
  }

  private generatePedTexture(): void {
    const size = 14;
    const gfx = this.createTempGraphics();
    gfx.fillStyle(0xf6c667, 1);
    gfx.fillRect(0, 0, size, size);
    gfx.fillStyle(0x222222, 1);
    gfx.fillRect(0, 10, size, 4);
    gfx.generateTexture('ped_base', size, size);
    gfx.destroy();
  }

  private generateVehicleTextures(): void {
    const body = this.createTempGraphics();
    body.fillStyle(0x3366cc, 1);
    body.fillRoundedRect(0, 0, 32, 64, 6);
    body.lineStyle(2, 0xffffff, 1);
    body.strokeRoundedRect(0, 0, 32, 64, 6);
    body.fillStyle(0x111111, 1);
    body.fillRect(6, 8, 20, 16);
    body.fillRect(6, 40, 20, 16);
    body.generateTexture('vehicle_compact', 32, 64);
    body.destroy();

    const sedan = this.createTempGraphics();
    sedan.fillStyle(0xcc3333, 1);
    sedan.fillRoundedRect(0, 0, 36, 72, 5);
    sedan.lineStyle(2, 0xffffff, 1);
    sedan.strokeRoundedRect(0, 0, 36, 72, 5);
    sedan.fillStyle(0x111111, 1);
    sedan.fillRect(8, 10, 20, 18);
    sedan.fillRect(8, 44, 20, 18);
    sedan.generateTexture('vehicle_sedan', 36, 72);
    sedan.destroy();

    const van = this.createTempGraphics();
    van.fillStyle(0x8899aa, 1);
    van.fillRoundedRect(0, 0, 40, 80, 8);
    van.lineStyle(2, 0xffffff, 1);
    van.strokeRoundedRect(0, 0, 40, 80, 8);
    van.fillStyle(0x111111, 1);
    van.fillRect(10, 14, 20, 20);
    van.fillRect(10, 46, 20, 20);
    van.generateTexture('vehicle_van', 40, 80);
    van.destroy();
  }

  private generateWeaponTextures(): void {
    const pistol = this.createTempGraphics();
    pistol.fillStyle(0x444444, 1);
    pistol.fillRect(0, 4, 14, 4);
    pistol.fillRect(4, 0, 4, 8);
    pistol.generateTexture('weapon_pistol', 14, 8);
    pistol.destroy();

    const smg = this.createTempGraphics();
    smg.fillStyle(0x444444, 1);
    smg.fillRect(0, 4, 18, 4);
    smg.fillRect(6, 0, 4, 8);
    smg.fillRect(14, 2, 4, 6);
    smg.generateTexture('weapon_smg', 18, 8);
    smg.destroy();

    const shotgun = this.createTempGraphics();
    shotgun.fillStyle(0x333333, 1);
    shotgun.fillRect(0, 4, 24, 6);
    shotgun.fillStyle(0x8b4513, 1);
    shotgun.fillRect(12, 6, 10, 4);
    shotgun.generateTexture('weapon_shotgun', 24, 10);
    shotgun.destroy();

    const grenade = this.createTempGraphics();
    grenade.fillStyle(0x2e8b57, 1);
    grenade.fillCircle(8, 8, 8);
    grenade.fillStyle(0x444444, 1);
    grenade.fillRect(6, 1, 4, 4);
    grenade.generateTexture('weapon_grenade', 16, 16);
    grenade.destroy();
  }

  private generateEffectTextures(): void {
    const bullet = this.createTempGraphics();
    bullet.fillStyle(0xffdd66, 1);
    bullet.fillRect(0, 0, 6, 2);
    bullet.generateTexture('projectile_bullet', 6, 2);
    bullet.destroy();

    const spark = this.createTempGraphics();
    spark.lineStyle(2, 0xffaa00, 1);
    spark.strokeCircle(6, 6, 4);
    spark.generateTexture('fx_impact', 12, 12);
    spark.destroy();

    const smoke = this.createTempGraphics();
    smoke.fillStyle(0x555566, 0.6);
    smoke.fillCircle(12, 12, 12);
    smoke.generateTexture('fx_smoke', 24, 24);
    smoke.destroy();
  }

  private generateTileTextures(): void {
    const size = 32;
    const colors = [0x1d2433, 0x242d3f, 0x2f3749, 0x343d56];

    colors.forEach((color, index) => {
      const gfx = this.createTempGraphics();
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, size, size);
      gfx.lineStyle(2, 0x0, 0.2);
      gfx.strokeRect(0, 0, size, size);
      gfx.generateTexture(`tile_${index}`, size, size);
      gfx.destroy();
    });

    // Combine generated tiles into a spritesheet-like atlas for tilemaps
    const atlas = this.textures.createCanvas('city_tiles', size * 2, size * 2);
    if (!atlas) {
      return;
    }
    const ctx = atlas.getContext();
    if (!ctx) {
      return;
    }
    colors.forEach((_color, index) => {
      const tx = this.textures.get(`tile_${index}`);
      const source = tx.getSourceImage() as HTMLCanvasElement;
      const dx = (index % 2) * size;
      const dy = Math.floor(index / 2) * size;
      ctx.drawImage(source, dx, dy);
      this.textures.remove(`tile_${index}`);
    });
    atlas.refresh();
  }
}
