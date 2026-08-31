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

  // 레이저탑: 붉은 렌즈 + 조준선.
  g.clear();
  g.fillStyle(0x3a1420, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.laser, 1); g.fillCircle(24, 26, 13); g.fillRect(21, 3, 6, 22);
  g.fillStyle(0xffe0e6, 1); g.fillCircle(24, 26, 5);
  g.lineStyle(2, 0xffd0d8, 0.9); g.strokeCircle(24, 26, 13); g.generateTexture('tower_laser', 48, 48);

  // 지휘탑: 금빛 깃발/별.
  g.clear();
  g.fillStyle(0x3a3320, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.command, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(24, 4), new Phaser.Math.Vector2(29, 19), new Phaser.Math.Vector2(44, 19),
    new Phaser.Math.Vector2(32, 28), new Phaser.Math.Vector2(37, 43), new Phaser.Math.Vector2(24, 34),
    new Phaser.Math.Vector2(11, 43), new Phaser.Math.Vector2(16, 28), new Phaser.Math.Vector2(4, 19),
    new Phaser.Math.Vector2(19, 19),
  ], true);
  g.lineStyle(2, 0xfff0c8, 0.9); g.strokeCircle(24, 24, 20); g.generateTexture('tower_command', 48, 48);

  // 금광탑: 금괴 더미.
  g.clear();
  g.fillStyle(0x33291a, 1); g.fillCircle(24, 24, 22);
  g.fillStyle(COLORS.mine, 1);
  g.fillRect(10, 26, 16, 9); g.fillRect(23, 26, 16, 9); g.fillRect(16, 15, 16, 9);
  g.fillStyle(0xfff2c4, 1); g.fillRect(12, 27, 5, 3); g.fillRect(25, 27, 5, 3); g.fillRect(18, 16, 5, 3);
  g.generateTexture('tower_mine', 48, 48);

  g.clear(); g.fillStyle(COLORS.laser, 1); g.fillRect(2, 13, 30, 6); g.fillStyle(0xffe0e6, 1); g.fillRect(24, 12, 10, 8); g.generateTexture('projectile_laser', 36, 32);
  g.clear(); g.fillStyle(COLORS.command, 1); g.fillCircle(16, 16, 8); g.fillStyle(0xfff0c8, 1); g.fillCircle(13, 13, 3); g.generateTexture('projectile_command', 32, 32);
  g.clear(); g.fillStyle(COLORS.mine, 1); g.fillCircle(16, 16, 8); g.fillStyle(0xfff2c4, 1); g.fillCircle(13, 13, 3); g.generateTexture('projectile_mine', 32, 32);

  g.clear(); g.fillStyle(COLORS.arrow, 1); g.fillTriangle(34, 10, 34, 22, 8, 16); g.fillRect(2, 13, 23, 6); g.generateTexture('projectile_arrow', 36, 32);
  g.clear(); g.fillStyle(COLORS.cannon, 1); g.fillCircle(16, 16, 11); g.fillStyle(0xffe3bd, 1); g.fillCircle(12, 11, 4); g.generateTexture('projectile_cannon', 32, 32);
  g.clear(); g.fillStyle(COLORS.frost, 1); g.fillPoints([new Phaser.Math.Vector2(16, 2), new Phaser.Math.Vector2(22, 10), new Phaser.Math.Vector2(30, 16), new Phaser.Math.Vector2(22, 22), new Phaser.Math.Vector2(16, 30), new Phaser.Math.Vector2(10, 22), new Phaser.Math.Vector2(2, 16), new Phaser.Math.Vector2(10, 10)], true); g.generateTexture('projectile_frost', 32, 32);
  g.clear(); g.fillStyle(COLORS.bolt, 1); g.fillPoints([new Phaser.Math.Vector2(23, 2), new Phaser.Math.Vector2(8, 17), new Phaser.Math.Vector2(17, 17), new Phaser.Math.Vector2(11, 30), new Phaser.Math.Vector2(28, 12), new Phaser.Math.Vector2(19, 12)], true); g.generateTexture('projectile_bolt', 32, 32);
  g.clear(); g.fillStyle(COLORS.sniper, 1); g.fillRect(3, 12, 28, 8); g.fillStyle(0xffffff, 1); g.fillRect(24, 13, 10, 6); g.generateTexture('projectile_sniper', 36, 32);
  g.clear(); g.fillStyle(COLORS.poison, 1); g.fillCircle(16, 18, 10); g.fillTriangle(10, 12, 16, 2, 22, 12); g.fillStyle(0xd7ff9e, 1); g.fillCircle(12, 16, 3); g.generateTexture('projectile_poison', 32, 32);

  // 지상 보병 + 재생충 + 소환사는 걷기 스프라이트 시트를 Preload에서 로드한다.
  // 나머지 적은 실루엣만 봐도 대처법을 짐작하게 도형으로. (마름모=호위 부하)
  g.clear(); g.fillStyle(0xffd75a, 1); g.fillPoints([new Phaser.Math.Vector2(10, 1), new Phaser.Math.Vector2(19, 10), new Phaser.Math.Vector2(10, 19), new Phaser.Math.Vector2(1, 10)], true); g.lineStyle(2, 0xfff1ad, 1); g.strokePoints([new Phaser.Math.Vector2(10, 1), new Phaser.Math.Vector2(19, 10), new Phaser.Math.Vector2(10, 19), new Phaser.Math.Vector2(1, 10)], true); g.generateTexture('enemy_minion', 20, 20);
  // 분열체: 금 간 주황 덩어리. 조각은 작은 삼각형.
  g.clear(); g.fillStyle(0xe8963a, 1); g.fillCircle(16, 16, 15); g.lineStyle(2, 0x3a1f0c, 1);
  g.lineBetween(16, 2, 14, 16); g.lineBetween(14, 16, 16, 30); g.lineBetween(14, 16, 3, 12); g.lineBetween(14, 16, 28, 20);
  g.generateTexture('enemy_splitter', 32, 32);
  g.clear(); g.fillStyle(0xf0a85a, 1); g.fillTriangle(9, 3, 17, 16, 1, 16); g.generateTexture('enemy_splitterling', 18, 18);
  // 광전사: 붉은 톱니 원.
  g.clear(); g.fillStyle(0xd1362f, 1);
  g.fillPoints(Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2; const r = i % 2 ? 9 : 16;
    return new Phaser.Math.Vector2(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
  }), true);
  g.fillStyle(0xffd0b0, 1); g.fillCircle(16, 16, 5); g.generateTexture('enemy_berserker', 32, 32);
  // 파쇄 전차는 강철 궤도와 전면 분쇄기가 보이는 애니메이션 시트를 Preload에서 로드한다.
  // 왕관·방패·어깨 장갑을 써서, 화면에 나타나는 순간 보스임을 알아보게 한다.
  g.clear(); g.fillStyle(0x5d1727, 1); g.fillCircle(28, 32, 25);
  g.fillStyle(COLORS.enemyBoss, 1); g.fillCircle(28, 30, 19);
  g.fillStyle(0xffd65c, 1); g.fillTriangle(10, 20, 18, 4, 26, 20); g.fillTriangle(22, 20, 30, 1, 38, 20); g.fillTriangle(34, 20, 42, 6, 50, 20);
  g.fillStyle(0x35111b, 1); g.fillRect(16, 27, 24, 17); g.fillStyle(0xffc4cd, 1); g.fillCircle(22, 32, 3); g.fillCircle(34, 32, 3);
  g.lineStyle(3, 0xffe6a3, 0.9); g.strokeCircle(28, 30, 24); g.generateTexture('enemy_boss', 56, 56);

  circle('projectile', COLORS.text, 5);
  square('tile', 0xffffff, TILE); // tint 로 색 입힘

  g.destroy();
}
