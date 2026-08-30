import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  create() {
    buildTextures(this);
    this.scene.start('mainmenu');
  }
}
