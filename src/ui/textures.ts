import Phaser from 'phaser';
import { COLORS, TILE } from '../core/constants';

export function buildTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  const circle = (key: string, color: number, r: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
  };
  const triangle = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    g.fillTriangle(s / 2, 4, s - 4, s - 4, 4, s - 4);
    g.generateTexture(key, s, s);
  };
  const diamond = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(s / 2, 2), new Phaser.Math.Vector2(s - 2, s / 2),
      new Phaser.Math.Vector2(s / 2, s - 2), new Phaser.Math.Vector2(2, s / 2),
    ], true);
    g.generateTexture(key, s, s);
  };
  const star = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    const cx = s / 2, cy = s / 2, spikes = 5, outer = s / 2 - 2, inner = outer * 0.45;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
    g.fillPoints(pts, true);
    g.generateTexture(key, s, s);
  };
  const square = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillRect(0, 0, s, s);
    g.generateTexture(key, s, s);
  };

  triangle('tower_arrow', COLORS.arrow, 44);
  circle('tower_cannon', COLORS.cannon, 22);
  diamond('tower_frost', COLORS.frost, 44);
  star('tower_bolt', COLORS.bolt, 46);

  circle('enemy_normal', COLORS.enemyNormal, 14);
  circle('enemy_fast', COLORS.enemyFast, 11);
  circle('enemy_tank', COLORS.enemyTank, 20);
  square('enemy_boss', COLORS.enemyBoss, 40);

  circle('projectile', COLORS.text, 5);
  square('tile', 0xffffff, TILE); // tint 로 색 입힘

  g.destroy();
}
