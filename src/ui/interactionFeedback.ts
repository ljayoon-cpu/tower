import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import type { SoundEffects } from '../core/audio';

export const SCENE_FADE_MS = 180;
const TRANSITION_DEPTH = 10_000;

type PressTarget = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/** 버튼을 누르는 순간의 짧은 축소와 클릭음을 공통으로 적용한다. */
export function attachPressFeedback(
  scene: Phaser.Scene,
  hit: PressTarget,
  targets: PressTarget[],
  audio: Pick<SoundEffects, 'play'>,
  action: () => void,
  canActivate: () => boolean = () => true,
): void {
  let pressed = false;
  const baseScales = new Map(targets.map((target) => [target, { x: target.scaleX, y: target.scaleY }]));
  const scale = (multiplier: number, duration: number) => {
    for (const target of targets) {
      const base = baseScales.get(target);
      if (!base) continue;
      scene.tweens.add({
        targets: target,
        scaleX: base.x * multiplier,
        scaleY: base.y * multiplier,
        duration,
        ease: 'Quad.out',
      });
    }
  };
  const release = () => scale(1, 70);

  hit.on('pointerdown', () => {
    pressed = true;
    scale(0.94, 55);
  });
  hit.on('pointerout', () => {
    if (!pressed) return;
    pressed = false;
    release();
  });
  hit.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    release();
    if (!canActivate()) return;
    audio.play('click');
    action();
  });
}

/** 현재 장면을 180ms 동안 검게 덮은 뒤 다음 장면을 연다. */
export function fadeToScene(scene: Phaser.Scene, key: string, data?: object): void {
  const curtain = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
    .setDepth(TRANSITION_DEPTH)
    .setAlpha(0);
  scene.tweens.add({
    targets: curtain,
    alpha: 1,
    duration: SCENE_FADE_MS,
    ease: 'Linear',
    onComplete: () => scene.scene.start(key, data),
  });
}

/** 다음 장면이 검은 화면에서 180ms 동안 자연스럽게 드러난다. */
export function fadeInFromBlack(scene: Phaser.Scene): void {
  const curtain = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
    .setDepth(TRANSITION_DEPTH)
    .setAlpha(1);
  scene.tweens.add({
    targets: curtain,
    alpha: 0,
    duration: SCENE_FADE_MS,
    ease: 'Linear',
    onComplete: () => curtain.destroy(),
  });
}
