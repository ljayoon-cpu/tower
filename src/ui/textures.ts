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

  g.clear(); g.fillStyle(COLORS.laser, 1); g.fillRect(2, 13, 30, 6); g.fillStyle(0xffe0e6, 1); g.fillRect(24, 12, 10, 8); g.generateTexture('projectile_laser', 36, 32);
  g.clear(); g.fillStyle(COLORS.command, 1); g.fillCircle(16, 16, 8); g.fillStyle(0xfff0c8, 1); g.fillCircle(13, 13, 3); g.generateTexture('projectile_command', 32, 32);
  g.clear(); g.fillStyle(COLORS.mine, 1); g.fillCircle(16, 16, 8); g.fillStyle(0xfff2c4, 1); g.fillCircle(13, 13, 3); g.generateTexture('projectile_mine', 32, 32);

  g.clear(); g.fillStyle(COLORS.arrow, 1); g.fillTriangle(34, 10, 34, 22, 8, 16); g.fillRect(2, 13, 23, 6); g.generateTexture('projectile_arrow', 36, 32);
  g.clear(); g.fillStyle(COLORS.cannon, 1); g.fillCircle(16, 16, 11); g.fillStyle(0xffe3bd, 1); g.fillCircle(12, 11, 4); g.generateTexture('projectile_cannon', 32, 32);
  g.clear(); g.fillStyle(COLORS.frost, 1); g.fillPoints([new Phaser.Math.Vector2(16, 2), new Phaser.Math.Vector2(22, 10), new Phaser.Math.Vector2(30, 16), new Phaser.Math.Vector2(22, 22), new Phaser.Math.Vector2(16, 30), new Phaser.Math.Vector2(10, 22), new Phaser.Math.Vector2(2, 16), new Phaser.Math.Vector2(10, 10)], true); g.generateTexture('projectile_frost', 32, 32);
  g.clear(); g.fillStyle(COLORS.bolt, 1); g.fillPoints([new Phaser.Math.Vector2(23, 2), new Phaser.Math.Vector2(8, 17), new Phaser.Math.Vector2(17, 17), new Phaser.Math.Vector2(11, 30), new Phaser.Math.Vector2(28, 12), new Phaser.Math.Vector2(19, 12)], true); g.generateTexture('projectile_bolt', 32, 32);
  g.clear(); g.fillStyle(COLORS.sniper, 1); g.fillRect(3, 12, 28, 8); g.fillStyle(0xffffff, 1); g.fillRect(24, 13, 10, 6); g.generateTexture('projectile_sniper', 36, 32);
  g.clear(); g.fillStyle(COLORS.poison, 1); g.fillCircle(16, 18, 10); g.fillTriangle(10, 12, 16, 2, 22, 12); g.fillStyle(0xd7ff9e, 1); g.fillCircle(12, 16, 3); g.generateTexture('projectile_poison', 32, 32);
  g.clear(); g.fillStyle(COLORS.ballista, 1); g.fillTriangle(34, 8, 34, 24, 6, 16); g.fillRect(2, 14, 24, 4);
  g.fillStyle(0xffffff, 1); g.fillRect(26, 14, 6, 4); g.generateTexture('projectile_ballista', 36, 32);

  // 지상 보병 + 재생충 + 소환사 + 조립 드론 + 분해 유닛은 애니메이션 시트를 Preload에서 로드한다.
  // 나머지 적은 실루엣만 봐도 대처법을 짐작하게 도형으로 만든다.
  // 분해 파편은 금 간 코어와 궤도 조각이 보이는 애니메이션 시트를 Preload에서 로드한다.
  // 과부하 병기는 화로 코어와 대검이 보이는 애니메이션 시트를 Preload에서 로드한다.
  // 파쇄 전차는 강철 궤도와 전면 분쇄기가 보이는 애니메이션 시트를 Preload에서 로드한다.
  // 공성 지휘관은 왕관·방패·지휘 코어가 보이는 애니메이션 시트를 Preload에서 로드한다.

  // 공중 편대는 Preload의 128px 4프레임 시트를 사용한다.

  circle('projectile', COLORS.text, 5);
  square('tile', 0xffffff, TILE); // tint 로 색 입힘

  g.destroy();
}
