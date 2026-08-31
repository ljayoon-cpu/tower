export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const TILE = 64;              // 픽셀. 그리드 11열 x 20행 = 704x1280

export const GRID_COLS = 11;
export const GRID_ROWS = 20;

export const SAVE_KEY = 'mtd:save';
// Generated local effects; the player can mute them independently in the UI.
export const SOUND_ENABLED = true;

// 웨이브 클리어 이자: 남긴 골드의 8%, 웨이브당 최대 40G. 저축을 보상하되 폭주 방지.
export const WAVE_INTEREST_RATE = 0.08;
export const WAVE_INTEREST_CAP = 40;

export const COLORS = {
  bg: 0x0f1020,
  path: 0x2a2c44,
  buildable: 0x1b1d33,
  grid: 0x2f3350,
  text: 0xf2f2f7,
  gold: 0xffcc44,
  life: 0xff5566,
  arrow: 0x66ccff,
  cannon: 0xff9944,
  frost: 0x99e6ff,
  bolt: 0xffe066,
  sniper: 0xd59cff,
  poison: 0x71d957,
  laser: 0xff5a7a,
  command: 0xffd27d,
  mine: 0xd7b45a,
  enemyNormal: 0xff6688,
  enemyFast: 0x66ff99,
  enemyTank: 0xaa88ff,
  enemyBoss: 0xff3355,
} as const;

// 스테이지 id의 월드 번호로 타일 색을 고른다. 없으면 월드 1 팔레트.
export const WORLD_THEMES: Record<string, { path: number; buildable: number }> = {
  '1': { path: COLORS.path, buildable: COLORS.buildable },
  '2': { path: 0x5c4034, buildable: 0x2c211d }, // 붉은 바위 동굴
};
