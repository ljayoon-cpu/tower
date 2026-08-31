import { Game } from '../../src/scenes/Game';
import { createEventBus, type EventBus } from '../../src/core/eventBus';
import { Pool } from '../../src/core/pool';
import { Rng } from '../../src/core/rng';
import { starsFor } from '../../src/core/stars';
import type { GameEvents, StageDef, TileCoord } from '../../src/core/types';
import { getTower } from '../../src/data/towers';
import { Enemy } from '../../src/entities/Enemy';
import { Projectile } from '../../src/entities/Projectile';
import { Tower } from '../../src/entities/Tower';
import { EconomyManager } from '../../src/systems/EconomyManager';
import { WAVE_INTEREST_RATE, WAVE_INTEREST_CAP } from '../../src/core/constants';
import { GridManager } from '../../src/systems/GridManager';
import { canMerge } from '../../src/systems/MergeController';
import { PathManager } from '../../src/systems/PathManager';
import { WaveManager } from '../../src/systems/WaveManager';

// Rendering/input boundary only. Game.update and all combat/entities are production code.
class DisplayObject {
  visible = true;
  data: Record<string, unknown> = {};
  constructor(public x = 0, public y = 0) {}
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setVisible(v: boolean) { this.visible = v; return this; }
  setData(k: string, v: unknown) { this.data[k] = v; return this; }
  getData(k: string) { return this.data[k]; }
  setDepth() { return this; }
  setInteractive() { return this; }
  setStrokeStyle() { return this; }
  setScale() { return this; }
  setRotation() { return this; }
  setRadius() { return this; }
  setActive() { return this; }
  setTexture() { return this; }
  clear() { return this; }
  fillStyle() { return this; }
  fillRect() { return this; }
  on() { return this; }
  destroy() {}
}

interface GameBoundary {
  stage: StageDef;
  bus: EventBus<GameEvents>;
  grid: GridManager;
  path: PathManager;
  waves: WaveManager;
  eco: EconomyManager;
  rng: Rng;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  projectilePool: Pool<Projectile>;
  lives: number;
  running: boolean;
  paused: boolean;
  speedMul: number;
  placeTower(key: string, tile: TileCoord): void;
  removeTower(tower: Tower): void;
  endStage(won: boolean): void;
  update(time: number, dt: number): void;
}

export interface WaveReport {
  wave: number; lives: number; gold: number; seconds: number;
  bossKilled: number; bossEscaped: number;
  towers: string[]; actions: string[];
}
export interface BalanceReport {
  stage: string; seed: number; won: boolean; stars: number; lives: number;
  seconds: number; waves: WaveReport[];
}
export interface StrategyContext {
  game: GameBoundary;
  wave: number;
  buy(key: string, col: number, row: number): Tower | undefined;
  merge(from: Tower, to: Tower): void;
}
export type Strategy = (context: StrategyContext) => void;

export function simulate(stage: StageDef, strategy: Strategy, seed = 1, speed = 1): BalanceReport {
  const scene = new Game();
  const game = scene as unknown as GameBoundary;
  Object.assign(scene, {
    add: {
      image: (x: number, y: number) => new DisplayObject(x, y),
      circle: (x: number, y: number) => new DisplayObject(x, y),
      graphics: () => new DisplayObject(),
    },
    input: { setDraggable() {}, manager: { pointers: [] } },
    buildMenu: { close() {} },
    sound: { mute: true, play() {} },
    cache: { audio: { exists: () => false } },
    audio: { play() {}, stop() {} },
  });
  game.stage = stage;
  game.bus = createEventBus<GameEvents>();
  game.grid = new GridManager(stage.grid);
  game.path = new PathManager(stage.path);
  game.waves = new WaveManager(stage.waves, game.bus);
  game.eco = new EconomyManager(stage.startGold, game.bus);
  game.rng = new Rng(seed);
  game.enemies = []; game.towers = []; game.projectiles = [];
  game.projectilePool = new Pool(() => new Projectile(scene));
  game.lives = stage.startLives; game.running = true; game.paused = false; game.speedMul = speed;
  let won = false;
  game.endStage = (result) => { game.running = false; won = result; };
  game.bus.on('enemy:killed', ({ bounty }) => game.eco.earn(bounty));
  game.bus.on('enemy:reachedGoal', ({ lifeDamage }) => {
    game.lives = Math.max(0, game.lives - lifeDamage);
    if (game.lives === 0) game.endStage(false);
  });
  game.bus.on('wave:cleared', () => {
    game.eco.earn(game.waves.currentClearBonus());
    game.eco.applyInterest(WAVE_INTEREST_RATE, WAVE_INTEREST_CAP); // Game.create wires the same
    if (game.waves.isFinished) game.endStage(true);
  });
  const waves: WaveReport[] = [];
  let totalMs = 0;
  for (let wave = 1; wave <= stage.waves.length && game.running; wave++) {
    const actions: string[] = [];
    strategy({ game, wave,
      buy(key, col, row) {
        const before = game.towers.length;
        game.placeTower(key, { col, row });
        if (game.towers.length === before) return undefined;
        actions.push(`buy ${key} (${col},${row}) ${getTower(key).cost}G`);
        return game.towers[game.towers.length - 1];
      },
      merge(from, to) {
        if (!game.towers.includes(from) || !game.towers.includes(to) || !canMerge(from, to, from.maxLevel)) throw Error('illegal merge');
        actions.push(`merge ${from.key} L${from.level} (${from.tile.col},${from.tile.row}) -> (${to.tile.col},${to.tile.row})`);
        to.setLevel(to.level + 1);
        game.grid.release(from.tile); game.removeTower(from);
      },
    });
    game.waves.startNextWave();
    let waveMs = 0, bossKilled = 0, bossEscaped = 0;
    const bosses = new Set<Enemy>();
    while (game.running && game.waves.isWaveActive && waveMs < 180000) {
      // Retain boss references before Game removes completed enemies.
      game.update(totalMs, 1000 / 60);
      for (const enemy of game.enemies) if (enemy.def.isBoss) bosses.add(enemy);
      waveMs += 1000 / 60 * speed;
      totalMs += 1000 / 60 * speed;
    }
    if (waveMs >= 180000) throw Error('wave timeout');
    for (const enemy of bosses) {
      if (enemy.hp <= 0) bossKilled++;
      if (enemy.reachedGoal) bossEscaped++;
    }
    waves.push({ wave, lives: game.lives, gold: game.eco.gold, seconds: Math.round(waveMs / 100) / 10,
      bossKilled, bossEscaped, actions,
      towers: game.towers.map(t => `${t.key} L${t.level} (${t.tile.col},${t.tile.row})`),
    });
  }
  return { stage: stage.id, seed, won, lives: game.lives,
    stars: starsFor(game.lives, stage.startLives, stage.starThresholds, won),
    seconds: Math.round(totalMs / 100) / 10, waves };
}

// Purchase priority down the shared trunk; no movement/selling or mid-wave purchases.
export const trunkTiles: [number, number][] = [
  [4, 4], [6, 7], [4, 9], [6, 2], [4, 6], [6, 9], [4, 2], [6, 5],
  [3, 9], [7, 9], [4, 11], [6, 11], [2, 12], [8, 12], [2, 15], [8, 15],
  [2, 17], [8, 17], [4, 7], [6, 4], [4, 8], [6, 8], [4, 3], [6, 3],
];

export const noDefense: Strategy = () => {};
export const oneArrow: Strategy = c => { if (c.wave === 1) c.buy('arrow', 4, 6); };

export function spread(keys: string[]): Strategy {
  return c => {
    for (;;) {
      const key = keys[c.game.towers.length % keys.length];
      if (!c.game.eco.canAfford(getTower(key).cost)) break;
      const tile = trunkTiles.find(([col, row]) => c.game.grid.canPlace({ col, row }));
      if (!tile || !c.buy(key, ...tile)) break;
    }
  };
}

export function mergeArmy(keys: string[], maxLevel = 3): Strategy {
  return c => {
    // Keep a small mixed core, then raise each core tower in rotation.
    for (let i = 0; i < keys.length; i++) {
      const [col, row] = trunkTiles[i];
      if (!c.game.towers.some(t => t.tile.col === col && t.tile.row === row)) {
        if (!c.buy(keys[i], col, row)) return;
      }
    }
    const core = [...c.game.towers];
    for (let level = 2; level <= maxLevel; level++) for (const tower of core) {
      if (tower.level >= level) continue;
      const cost = getTower(tower.key).cost * 2 ** (tower.level - 1);
      if (!c.game.eco.canAfford(cost)) return;
      const make = (targetLevel: number): Tower => {
        const tile = trunkTiles.find(([col, row]) => c.game.grid.canPlace({ col, row }));
        if (!tile) throw Error('no merge workspace');
        const result = c.buy(tower.key, ...tile);
        if (!result) throw Error('insufficient merge funds');
        while (result.level < targetLevel) c.merge(make(result.level), result);
        return result;
      };
      c.merge(make(tower.level), tower);
    }
    spread(keys)(c);
  };
}
