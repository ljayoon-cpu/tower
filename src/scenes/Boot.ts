import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { this.scene.start('preload'); }
}
