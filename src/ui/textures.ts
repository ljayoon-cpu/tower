import Phaser from 'phaser';
import { COLORS, TILE } from '../core/constants';

export function buildTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  const circle = (key: string, color: number, r: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
  };
  const square = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillRect(0, 0, s, s);
    g.generateTexture(key, s, s);
  };

  // 실루엣만 보고도 역할을 짐작할 수 있도록 포탑과 탄환을 같은 모티프로 만든다.
  g.clear();
  g.fillStyle(0x172845, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.arrow, 1); g.fillTriangle(24, 3, 40, 30, 24, 25);
  g.fillRect(21, 21, 6, 18); g.fillTriangle(21, 35, 15, 43, 21, 40); g.fillTriangle(27, 35, 33, 43, 27, 40);
  g.lineStyle(2, 0xd8f2ff, 0.9); g.strokeCircle(24, 24, 20); g.generateTexture('tower_arrow', 48, 48);

  g.clear();
  g.fillStyle(0x3f2618, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.cannon, 1); g.fillCircle(24, 29, 15); g.fillCircle(24, 29, 7);
  g.fillStyle(0xffd28d, 1); g.fillRect(20, 5, 8, 22); g.fillCircle(24, 6, 5);
  g.lineStyle(2, 0xffe0b3, 0.9); g.strokeCircle(24, 29, 15); g.generateTexture('tower_cannon', 48, 48);

  g.clear();
  g.fillStyle(0x183247, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.frost, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(24, 2), new Phaser.Math.Vector2(31, 16), new Phaser.Math.Vector2(45, 24),
    new Phaser.Math.Vector2(31, 32), new Phaser.Math.Vector2(24, 46), new Phaser.Math.Vector2(17, 32),
    new Phaser.Math.Vector2(3, 24), new Phaser.Math.Vector2(17, 16),
  ], true);
  g.fillStyle(0xe8fbff, 1); g.fillCircle(24, 24, 7); g.fillRect(21, 8, 6, 32); g.fillRect(8, 21, 32, 6);
  g.generateTexture('tower_frost', 48, 48);

  g.clear();
  g.fillStyle(0x3d3420, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.bolt, 1); g.fillCircle(24, 24, 15);
  g.fillStyle(0xffffbf, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(28, 4), new Phaser.Math.Vector2(15, 24), new Phaser.Math.Vector2(24, 24),
    new Phaser.Math.Vector2(19, 44), new Phaser.Math.Vector2(35, 20), new Phaser.Math.Vector2(26, 20),
  ], true);
  g.generateTexture('tower_bolt', 48, 48);

  g.clear();
  g.fillStyle(0x2c1d42, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.sniper, 1); g.fillCircle(24, 29, 14); g.fillRect(21, 4, 6, 27);
  g.fillStyle(0xf4ddff, 1); g.fillCircle(24, 14, 7); g.fillCircle(24, 14, 3);
  g.lineStyle(2, 0xf4ddff, 0.9); g.strokeCircle(24, 14, 10); g.generateTexture('tower_sniper', 48, 48);

  g.clear();
  g.fillStyle(0x173c2b, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.poison, 1); g.fillCircle(24, 29, 14); g.fillRect(17, 8, 14, 17);
  g.fillStyle(0xc8ff8d, 1); g.fillCircle(19, 28, 4); g.fillCircle(28, 34, 3);
  g.fillStyle(0xe9ffd3, 1); g.fillRect(19, 5, 10, 5); g.generateTexture('tower_poison', 48, 48);

  g.clear(); g.fillStyle(COLORS.arrow, 1); g.fillTriangle(34, 10, 34, 22, 8, 16); g.fillRect(2, 13, 23, 6); g.generateTexture('projectile_arrow', 36, 32);
  g.clear(); g.fillStyle(COLORS.cannon, 1); g.fillCircle(16, 16, 11); g.fillStyle(0xffe3bd, 1); g.fillCircle(12, 11, 4); g.generateTexture('projectile_cannon', 32, 32);
  g.clear(); g.fillStyle(COLORS.frost, 1); g.fillPoints([new Phaser.Math.Vector2(16, 2), new Phaser.Math.Vector2(22, 10), new Phaser.Math.Vector2(30, 16), new Phaser.Math.Vector2(22, 22), new Phaser.Math.Vector2(16, 30), new Phaser.Math.Vector2(10, 22), new Phaser.Math.Vector2(2, 16), new Phaser.Math.Vector2(10, 10)], true); g.generateTexture('projectile_frost', 32, 32);
  g.clear(); g.fillStyle(COLORS.bolt, 1); g.fillPoints([new Phaser.Math.Vector2(23, 2), new Phaser.Math.Vector2(8, 17), new Phaser.Math.Vector2(17, 17), new Phaser.Math.Vector2(11, 30), new Phaser.Math.Vector2(28, 12), new Phaser.Math.Vector2(19, 12)], true); g.generateTexture('projectile_bolt', 32, 32);
  g.clear(); g.fillStyle(COLORS.sniper, 1); g.fillRect(3, 12, 28, 8); g.fillStyle(0xffffff, 1); g.fillRect(24, 13, 10, 6); g.generateTexture('projectile_sniper', 36, 32);
  g.clear(); g.fillStyle(COLORS.poison, 1); g.fillCircle(16, 18, 10); g.fillTriangle(10, 12, 16, 2, 22, 12); g.fillStyle(0xd7ff9e, 1); g.fillCircle(12, 16, 3); g.generateTexture('projectile_poison', 32, 32);

  circle('enemy_normal', COLORS.enemyNormal, 14);
  circle('enemy_fast', COLORS.enemyFast, 11);
  circle('enemy_tank', COLORS.enemyTank, 20);
  square('enemy_boss', COLORS.enemyBoss, 40);

  circle('projectile', COLORS.text, 5);
  square('tile', 0xffffff, TILE); // tint 로 색 입힘

  g.destroy();
}
