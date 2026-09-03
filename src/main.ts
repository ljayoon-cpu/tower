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

// PWA 자동 업데이트를 실제로 자주 확인한다 — 기본은 새로고침 전까지 옛 버전이 남는다.
// autoUpdate 모드라 새 서비스워커는 즉시 활성화(skipWaiting)되고, update()가 새 버전을
// 발견하면 다음 진입에 새 번들을 받는다. 앱을 계속 켜둬도 1분마다, 다시 볼 때마다 확인.
if ('serviceWorker' in navigator) {
  const check = () => navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  setInterval(check, 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
}
