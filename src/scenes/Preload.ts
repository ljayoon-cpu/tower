import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';
import { SOUND_ENABLED } from '../core/constants';
import { SFX_KEYS } from '../core/audio';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    // 지상 보병 4종은 128px 4프레임 걷기 시트를 쓰고, Enemy가 이동 시간에 맞춰 프레임을 순환한다.
    for (const [key, file] of [
      ['enemy_fast', 'fast-hound-walk-v1'],
      ['enemy_normal', 'normal-soldier-walk-v1'],
      ['enemy_tank', 'tank-siege-walk-v1'],
      ['enemy_shield', 'shield-soldier-walk-v1'],
      ['enemy_regenerator', 'regenerator-grub-walk-v1'],
      ['enemy_summoner', 'rift-summoner-walk-v1'],
      ['enemy_boss', 'siege-commander-walk-v1'],
    ] as const) {
      this.load.spritesheet(key, `art/enemies/${file}.png`, { frameWidth: 128, frameHeight: 128 });
    }
    if (SOUND_ENABLED) {
      for (const key of SFX_KEYS) this.load.audio(`sfx_${key}`, `sfx/${key}.wav`);
    }
  }
  create() {
    buildTextures(this);
    this.scene.start('mainmenu');
  }
}
