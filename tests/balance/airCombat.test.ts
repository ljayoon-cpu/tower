import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import type { StageDef, Wave } from '../../src/core/types';
import { parseGrid } from '../../src/data/stages/helpers';
import { TILE } from '../../src/core/constants';
import { simulate, type Strategy } from './harness';

// 세로 직선 단일 경로. col5 = 길, 나머지 설치 가능.
const rows = Array.from({ length: 20 }, () => '.....#.....');
const cx = 5 * TILE + TILE / 2;

function airWaveStage(wave: Wave): StageDef {
  return {
    id: 'air-test',
    grid: parseGrid(rows),
    spawn: { x: cx, y: 0 },
    goals: [{ x: cx, y: 19 * TILE + TILE / 2 }],
    path: { points: [{ x: cx, y: 0 }, { x: cx, y: 19 * TILE + TILE / 2 }] },
    startGold: 600,
    startLives: 12,
    starThresholds: [0.3, 0.6, 1.0],
    waves: [wave],
  };
}

const DRONE_WAVE: Wave = {
  clearBonus: 20,
  groups: [{ enemy: 'drone', count: 14, intervalMs: 260, startDelayMs: 0 }],
};

/** col4 에 한 종류 타워만 최대한 깐다(경로 col5 바로 옆). */
function wall(key: string): Strategy {
  return (c) => {
    for (let row = 2; row < 18; row += 2) {
      if (!c.game.eco.canAfford(200)) break;
      c.buy(key, 4, row);
    }
  };
}

describe('air layer is enforced in real combat (Game.updateTowers)', () => {
  it('역병탑/파열탑(지상 전용)은 공중 웨이브에 아무 것도 못 하고 방어에 실패한다', () => {
    for (const key of ['poison', 'cannon']) {
      const r = simulate(airWaveStage(DRONE_WAVE), wall(key), /* seed */ 1);
      expect(r.won, `${key} should not clear an all-air wave`).toBe(false);
      expect(r.lives, `${key} should leak every drone`).toBe(0);
    }
  });

  it('창공탑은 같은 공중 웨이브를 여유 있게 막는다 (대공 배율 적용)', () => {
    const r = simulate(airWaveStage(DRONE_WAVE), wall('ballista'), 1);
    expect(r.won).toBe(true);
    expect(r.lives).toBeGreaterThan(6);
  });

  it('저격탑(공중 타격 가능, 배율 없음)도 막긴 하지만 창공탑보다 라이프 손실이 크거나 같다', () => {
    const bal = simulate(airWaveStage(DRONE_WAVE), wall('ballista'), 1);
    const sni = simulate(airWaveStage(DRONE_WAVE), wall('sniper'), 1);
    expect(sni.lives).toBeLessThanOrEqual(bal.lives);
  });
});
