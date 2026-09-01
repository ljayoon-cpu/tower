/// <reference types="vite/client" />
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './core/constants';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { StageSelect } from './scenes/StageSelect';
import { Game } from './scenes/Game';
import { HUD } from './scenes/HUD';
import { Result } from './scenes/Result';
import { Shop } from './scenes/Shop';
import { Codex } from './scenes/Codex';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preload, MainMenu, StageSelect, Game, HUD, Result, Shop, Codex],
});

if (import.meta.env.DEV) {
  // dev-only handle
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}
