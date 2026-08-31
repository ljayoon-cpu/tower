import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';
import { SOUND_ENABLED } from '../core/constants';
import { SFX_KEYS } from '../core/audio';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    // 4프레임 질주 시트. Enemy가 이동 시간에 맞춰 프레임을 순환한다.
    this.load.spritesheet('enemy_fast', 'art/enemies/fast-hound-walk-v1.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    if (SOUND_ENABLED) {
      for (const key of SFX_KEYS) this.load.audio(`sfx_${key}`, `sfx/${key}.wav`);
    }
  }
  create() {
    buildTextures(this);
    this.scene.start('mainmenu');
  }
}
