import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { simulate, trunkTiles } from './harness';
import { getStage } from '../../src/data/stages';
import { getTower } from '../../src/data/towers';
import type { StrategyContext } from './harness';
import type { Tower } from '../../src/entities/Tower';

/** 스테이지 1-1 에서 인접 두 칸에 두 타워를 놓고 관찰. (4,6)+(4,7) = 상하 4-인접. */
function pair(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 4, 7); // (4,6) 바로 아래 = 4-인접
    }
  };
}

/** 같은 두 타워를 서로 멀리 (비인접) 놓는다 → 충전되지 않아야 한다. */
function apart(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 6, 9);
    }
  };
}

describe('resonance charged set', () => {
  it('charges an elemental tower placed next to a non-support partner', () => {
    const report = simulate(getStage('1-1'), pair('frost', 'arrow'), 1);
    expect(report.waves.length).toBeGreaterThan(0);
  });
});

describe('resonance reactions fire', () => {
  it('charged frost + adjacent arrow detonates the ice mark (arrow is the detonator)', () => {
    let count = 0;
    const byKeys = new Set<string>();
    simulate(getStage('1-1'), pair('frost', 'arrow'), 7, 1, {
      onReaction: (el, by) => { if (el === 'ice') { count++; byKeys.add(by); } },
    });
    expect(count).toBeGreaterThan(0);
    expect([...byKeys]).toContain('arrow'); // 화살(원소 없음)이 서리 각인을 터뜨렸다
  });

  it('non-adjacent frost + arrow never reacts', () => {
    let count = 0;
    simulate(getStage('1-1'), apart('frost', 'arrow'), 7, 1, {
      onReaction: () => { count++; },
    });
    expect(count).toBe(0);
  });

  it('a lone elemental tower in a corner never charges → no reactions', () => {
    let count = 0;
    simulate(getStage('1-1'), (c) => {
      if (c.wave === 1 && !c.game.towers.length) c.buy('frost', 0, 0);
    }, 7, 3, { onReaction: () => { count++; } });
    expect(count).toBe(0);
  });

  it('adjacent frost + arrow leaves lives no worse than the non-adjacent pair', () => {
    const withPair = simulate(getStage('1-1'), pair('frost', 'arrow'), 7);
    const noPair = simulate(getStage('1-1'), apart('frost', 'arrow'), 7);
    const last = (r: typeof withPair) => r.waves[r.waves.length - 1].lives;
    expect(last(withPair)).toBeGreaterThanOrEqual(last(noPair));
  });
});

describe('resonance target band — the adjacent pair vs an identical non-adjacent pair', () => {
  const freeTrunk = (c: StrategyContext): [number, number] | undefined =>
    trunkTiles.find(([col, row]) => c.game.grid.canPlace({ col, row }));

  /** Buy `key` and raise it to `level` on `path`, feeding same-level towers built on
   *  scratch trunk tiles (which the merge releases). Returns null if it runs out of
   *  gold or free tiles — the caller just keeps whatever it managed to build. */
  const subtreeCost = (key: string, level: number) => getTower(key).cost * 2 ** (level - 1);

  function build(c: StrategyContext, key: string, level: number, path: 'a' | 'b'): Tower | null {
    // Check the whole sub-tree cost up front so we never leave half-built feeders behind.
    if (!c.game.eco.canAfford(subtreeCost(key, level))) return null;
    const tile = freeTrunk(c);
    if (!tile) return null;
    const t = c.buy(key, ...tile);
    if (!t) return null;
    while (t.level < level) {
      const feeder = build(c, key, t.level, path);
      if (!feeder) return null;
      c.merge(feeder, t, path);
    }
    return t;
  }

  /** Raise an already-placed core tower toward `toLevel`, feeding same-level towers. */
  function raise(c: StrategyContext, target: Tower, toLevel: number, path: 'a' | 'b') {
    while (target.level < toLevel) {
      const feeder = build(c, target.key, target.level, path);
      if (!feeder) return;
      c.merge(feeder, target, path);
    }
  }

  type Hold = { frost?: Tower; bolt?: Tower };

  /** frost @ (4,6) + bolt L3(a) @ boltTile. boltTile === [4,7] is orthogonally
   *  adjacent → both towers charge; [4,8] is two tiles away → neither charges
   *  (the control). Feeder towers land on earlier trunk tiles, never next to (4,6). */
  const pairBuild = (boltTile: [number, number], hold: Hold) => (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      hold.frost = c.buy('frost', 4, 6);
      hold.bolt = c.buy('bolt', ...boltTile);
    }
    if (hold.frost) raise(c, hold.frost, 3, 'a');
    if (hold.bolt) raise(c, hold.bolt, 3, 'a');
  };

  it('resonance speeds the pair up by a bounded factor (buff-sensitive, unlike a floored lives check)', () => {
    // The earlier "wave 2 of 1-3" lives comparison was one-directional: the charged
    // pair floored at startLives, so `Math.abs(pairLives - loneLives)` was driven
    // entirely by the *lone* build's leak — a resonance BUFF could never fail it.
    //
    // Clear-time does not floor: a stronger pair always clears faster. And the
    // non-adjacent control fires zero reactions (rx === 0), so its clear-time is
    // provably independent of reactions.ts — a fixed yardstick.
    //
    // Stage 1-1, frost(4,6) + bolt L3(a); deterministic across seeds:
    //   adjacent (charged)      -> 40.9s
    //   non-adjacent (control)  -> 80.3s   (rx 0)
    //   ratio 1.96.  Sensitivity: STATIC_DISCHARGE x2 -> 2.06 (fails ceiling);
    //   a broken detonation hook -> ratio ~1.0 (fails floor).
    //   Re-run and re-centre this band on any deliberate reactions.ts change.
    const stage = getStage('1-1');
    for (const seed of [1, 42, 20260831]) {
      const chg: Hold = {};
      const ctl: Hold = {};
      let rx = 0;
      let rxCtl = 0;
      const charged = simulate(stage, pairBuild([4, 7], chg), seed, 1, { onReaction: () => { rx++; } });
      const control = simulate(stage, pairBuild([4, 8], ctl), seed, 1, { onReaction: () => { rxCtl++; } });

      // Identical builds — same towers raised to the same levels; only adjacency differs.
      expect(chg.frost?.level).toBe(ctl.frost?.level);
      expect(chg.bolt?.level).toBe(ctl.bolt?.level);
      expect(chg.frost?.level).toBe(3);
      expect(chg.bolt?.level ?? 0).toBeGreaterThanOrEqual(2);
      expect(rx).toBeGreaterThan(0);      // adjacent ⇒ charged, reactions fire
      expect(rxCtl).toBe(0);              // 2 tiles apart ⇒ never charges — the control
      expect(charged.won && control.won).toBe(true);

      const ratio = control.seconds / charged.seconds;
      expect(ratio, `1-1 clear-time ratio, seed ${seed}`).toBeGreaterThanOrEqual(1.7);
      expect(ratio, `1-1 clear-time ratio, seed ${seed}`).toBeLessThanOrEqual(2.0);
    }
  });

  it('a charged adjacent pair still cannot solo 1-6 or the world-1 finale (combination stays required)', () => {
    for (const stageId of ['1-6', '1-8'] as const) {
      for (const seed of [1, 42, 20260831]) {
        const hold: Hold = {};
        const rep = simulate(getStage(stageId), pairBuild([4, 7], hold), seed);
        expect(rep.won, `charged frost+bolt pair must not solo ${stageId} (seed ${seed})`).toBe(false);
      }
    }
  });
});
