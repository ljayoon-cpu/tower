import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './core/constants';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { HUD } from './scenes/HUD';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preload, MainMenu, Game, HUD],
});
