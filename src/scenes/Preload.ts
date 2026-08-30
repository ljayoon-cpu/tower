import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';
import { SOUND_ENABLED } from '../core/constants';
import { SFX_KEYS } from '../core/audio';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    if (SOUND_ENABLED) {
      for (const key of SFX_KEYS) this.load.audio(`sfx_${key}`, `sfx/${key}.wav`);
    }
  }
  create() {
    buildTextures(this);
    this.scene.start('mainmenu');
  }
}
