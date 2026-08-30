import Phaser from 'phaser';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    // 이후 태스크에서 텍스처 생성 추가
  }
  create() { this.scene.start('mainmenu'); }
}
