import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

interface WorldBackgroundTheme {
  sky: number;
  horizon: number;
  silhouette: number;
  accent: number;
}

const BACKGROUND_THEMES: Record<string, WorldBackgroundTheme> = {
  '1': { sky: 0x101b35, horizon: 0x1a3153, silhouette: 0x142641, accent: 0x7bd7ff },
  '2': { sky: 0x241315, horizon: 0x4a2420, silhouette: 0x35191b, accent: 0xff9a57 },
  '3': { sky: 0x0e1a2c, horizon: 0x24405e, silhouette: 0x172b40, accent: 0x9fd8ff },
};

/** 월드 번호에 따라 전투 맵 뒤에 놓을 절차적 배경 팔레트. */
export function worldBackgroundTheme(world: string): WorldBackgroundTheme {
  return BACKGROUND_THEMES[world] ?? BACKGROUND_THEMES['1'];
}

/** 에셋 없이도 월드별 분위기와 깊이감을 주는 저비용 배경 레이어. */
export class WorldBackground {
  private readonly layers: Phaser.GameObjects.Container[] = [];

  constructor(private readonly scene: Phaser.Scene, world: string) {
    const theme = worldBackgroundTheme(world);
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, theme.sky).setDepth(-500);
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, GAME_WIDTH, GAME_HEIGHT * 0.44, theme.horizon, 0.72)
      .setDepth(-490);

    if (world === '2') this.addCavern(theme);
    else this.addSkyline(theme);
    this.layers.push(this.addDriftLayer(theme, 0), this.addDriftLayer(theme, -GAME_HEIGHT));
  }

  update(dtMs: number): void {
    for (const layer of this.layers) {
      layer.y += dtMs * 0.006;
      if (layer.y >= GAME_HEIGHT) layer.y -= GAME_HEIGHT * 2;
    }
  }

  private addSkyline(theme: WorldBackgroundTheme): void {
    const moon = this.scene.add.circle(GAME_WIDTH - 108, 228, 74, theme.accent, 0.14).setDepth(-470);
    const moonCutout = this.scene.add.circle(GAME_WIDTH - 82, 204, 68, theme.sky).setDepth(-469);
    const ridge = this.scene.add.rectangle(GAME_WIDTH / 2, 970, GAME_WIDTH, 120, theme.silhouette, 0.9).setDepth(-468);
    const ridgeTwo = this.scene.add.rectangle(GAME_WIDTH / 2, 1120, GAME_WIDTH, 190, theme.silhouette, 0.98).setDepth(-467);
    // 참조를 유지하지 않아도 Phaser 씬 종료 때 함께 정리된다.
    void moon; void moonCutout; void ridge; void ridgeTwo;
  }

  private addCavern(theme: WorldBackgroundTheme): void {
    const ceiling = this.scene.add.rectangle(GAME_WIDTH / 2, 82, GAME_WIDTH, 164, theme.silhouette, 0.95).setDepth(-470);
    const leftRock = this.scene.add.rectangle(54, GAME_HEIGHT / 2, 108, GAME_HEIGHT, theme.silhouette, 0.92).setDepth(-469);
    const rightRock = this.scene.add.rectangle(GAME_WIDTH - 54, GAME_HEIGHT / 2, 108, GAME_HEIGHT, theme.silhouette, 0.92).setDepth(-469);
    const lavaGlow = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 74, GAME_WIDTH, 148, theme.accent, 0.1).setDepth(-468);
    void ceiling; void leftRock; void rightRock; void lavaGlow;
  }

  private addDriftLayer(theme: WorldBackgroundTheme, y: number): Phaser.GameObjects.Container {
    const layer = this.scene.add.container(0, y).setDepth(-460);
    for (let i = 0; i < 18; i++) {
      const x = 22 + ((i * 97) % (GAME_WIDTH - 44));
      const py = 48 + ((i * 173) % (GAME_HEIGHT - 96));
      const size = i % 3 === 0 ? 3 : 2;
      const particle = this.scene.add.circle(x, py, size, theme.accent, i % 3 === 0 ? 0.28 : 0.16);
      layer.add(particle);
    }
    return layer;
  }
}
