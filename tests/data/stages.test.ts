import { STAGES, getStage, nextStageId, STAGE_IDS } from '../../src/data/stages';
import { parseGrid } from '../../src/data/stages/helpers';
import { PathManager } from '../../src/systems/PathManager';
import { GridManager } from '../../src/systems/GridManager';
import { getEnemy } from '../../src/data/enemies';
import { GRID_COLS, GRID_ROWS } from '../../src/core/constants';

describe('parseGrid', () => {
  it('maps chars to tile types', () => {
    expect(parseGrid(['.#X'])).toEqual([['BUILDABLE', 'PATH', 'BLOCKED']]);
  });
});

describe('stage definitions', () => {
  it('stages are 1-1.. in order', () => {
    expect(STAGE_IDS).toEqual([
      '1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8',
      '2-1', '2-2', '2-3', '2-4', '2-5',
      '3-1', '3-2', '3-3', '3-4',
    ]);
  });

  it('every stage grid is GRID_COLS x GRID_ROWS', () => {
    for (const s of STAGES) {
      expect(s.grid.length).toBe(GRID_ROWS);
      for (const row of s.grid) expect(row.length).toBe(GRID_COLS);
    }
  });

  it('every stage path expands to at least one route ending near a goal', () => {
    for (const s of STAGES) {
      const pm = new PathManager(s.path);
      const routes = pm.routes();
      expect(routes.length).toBe(s.goals.length);
      routes.forEach((r, i) => {
        const end = r[r.length - 1];
        expect(Math.hypot(end.x - s.goals[i].x, end.y - s.goals[i].y)).toBeLessThan(1);
      });
    }
  });

  it('every wave references a known enemy', () => {
    for (const s of STAGES) {
      for (const w of s.waves) {
        for (const g of w.groups) expect(() => getEnemy(g.enemy)).not.toThrow();
      }
    }
  });

  it('starThresholds are ascending [1star, 2star, 3star] within (0,1]', () => {
    for (const s of STAGES) {
      const [a, b, c] = s.starThresholds;
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(b);
      expect(b).toBeLessThanOrEqual(c);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('1-1 has a single route, later stages branch', () => {
    expect(new PathManager(getStage('1-1').path).routes().length).toBe(1);
    expect(new PathManager(getStage('1-2').path).routes().length).toBe(2);
  });

  it('nextStageId chains and ends null', () => {
    expect(nextStageId('1-1')).toBe('1-2');
    expect(nextStageId('1-8')).toBe('2-1');
    expect(nextStageId('2-4')).toBe('2-5');
    expect(nextStageId('2-5')).toBe('3-1');
    expect(nextStageId('3-3')).toBe('3-4');
    expect(nextStageId('3-4')).toBeNull();
  });

  it('marks only the boss-showdown stages as bossStage', () => {
    expect(STAGES.filter((s) => s.bossStage).map((s) => s.id)).toEqual(['1-8', '2-5']);
  });

  it('ends world 2 with a dedicated commander boss stage', () => {
    const stage = getStage('2-5');
    const finalWave = stage.waves[stage.waves.length - 1];
    const commander = finalWave.groups.find((group) => group.enemy === 'boss');

    expect(stage.waves.length).toBeGreaterThanOrEqual(5);
    expect(commander).toMatchObject({ count: 1 });
    expect(commander?.hpMultiplier).toBeGreaterThan(1);
  });

  it('spawn tile and goal tiles are on PATH', () => {
    for (const s of STAGES) {
      const g = new GridManager(s.grid);
      expect(g.tileAt(g.pixelToTile(s.spawn))).toBe('PATH');
      for (const goal of s.goals) expect(g.tileAt(g.pixelToTile(goal))).toBe('PATH');
    }
  });
});
