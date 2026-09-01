import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';
import { SOUND_ENABLED } from '../core/constants';
import { SFX_KEYS } from '../core/audio';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    for (const [key, file] of [
      ['tower_arrow', 'arrow-tower-sheet-v1'],
      ['tower_cannon', 'cannon-tower-sheet-v1'],
      ['tower_frost', 'frost-tower-sheet-v1'],
      ['tower_bolt', 'bolt-tower-sheet-v1'],
      ['tower_sniper', 'sniper-tower-sheet-v1'],
      ['tower_poison', 'poison-tower-sheet-v1'],
      ['tower_laser', 'laser-tower-sheet-v1'],
      ['tower_command', 'command-tower-sheet-v1'],
      ['tower_mine', 'mine-tower-sheet-v1'],
      ['tower_ballista', 'ballista-tower-sheet-v1'],
    ] as const) {
      this.load.spritesheet(key, `art/towers/${file}.png`, { frameWidth: 64, frameHeight: 64 });
    }
    // 지상 보병·공중 편대·분열체·특수 유닛은 128px 4프레임 시트를 쓰고, Enemy가 이동 시간에 맞춰 프레임을 순환한다.
    for (const [key, file] of [
      ['enemy_fast', 'fast-hound-walk-v1'],
      ['enemy_normal', 'normal-soldier-walk-v1'],
      ['enemy_tank', 'tank-siege-walk-v1'],
      ['enemy_shield', 'shield-soldier-walk-v1'],
      ['enemy_regenerator', 'regenerator-grub-walk-v1'],
      ['enemy_summoner', 'rift-summoner-walk-v1'],
      ['enemy_minion', 'assembly-drone-hover-v1'],
      ['enemy_splitter', 'disassembly-unit-walk-v1'],
      ['enemy_berserker', 'berserker-overload-walk-v1'],
      ['enemy_crusher', 'crusher-siege-walk-v1'],
      ['enemy_boss', 'siege-commander-walk-v1'],
      ['enemy_splitterling', 'splitterling-orbit-v1'],
      ['enemy_drone', 'scout-drone-hover-v1'],
      ['enemy_gunship', 'artillery-gunship-hover-v1'],
      ['enemy_carrier', 'drop-carrier-hover-v1'],
      ['enemy_airboss', 'air-flagship-hover-v1'],
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
