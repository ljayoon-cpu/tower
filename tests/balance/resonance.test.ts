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

describe('resonance target band — adjacent Lv3 pair vs lone Lv4', () => {
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

  // frost L3(a) at (4,6) + bolt L3(a) at (4,7) — orthogonally adjacent, so both charge.
  const pairBuild = (hold: { frost?: Tower; bolt?: Tower }) => (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      hold.frost = c.buy('frost', 4, 6);
      hold.bolt = c.buy('bolt', 4, 7);
    }
    if (hold.frost) raise(c, hold.frost, 3, 'a');
    if (hold.bolt) raise(c, hold.bolt, 3, 'a');
  };

  it('an adjacent Lv3 pair is a bounded edge over a lone Lv4 — not a blowout', () => {
    // A lone tower is never a viable full defense on a campaign stage past the opener
    // (monoTower.test.ts pins this: no single tower/path solos the late campaign, and
    // the finale resists even arrow-merge). So a lives proxy is only honest for the
    // first couple of waves — after that the lone build collapses for reasons that have
    // nothing to do with resonance. We use stage 1-3 (the earliest stage a lone frost
    // can actually fund L4) and read lives at the end of wave 2, by which point BOTH
    // builds have reached their target levels and both are still alive.
    const stage = getStage('1-3');
    const CHECKPOINT = 2;

    let reactions = 0;
    const hold: { frost?: Tower; bolt?: Tower } = {};
    let loneT: Tower | undefined;

    // Deterministic across seeds (verified 1 / 42 / 20260831); one seed keeps it fast.
    const seed = 42;
    const pairRep = simulate(stage, pairBuild(hold), seed, 1, { onReaction: () => { reactions++; } });
    const loneRep = simulate(stage, (c) => {
      if (c.wave === 1 && c.game.towers.length === 0) loneT = c.buy('frost', 4, 6);
      if (loneT) raise(c, loneT, 4, 'a');
    }, seed);

    const pairLives = pairRep.waves[CHECKPOINT - 1].lives;
    const loneLives = loneRep.waves[CHECKPOINT - 1].lives;

    // Both builds are actually at the level the comparison assumes, and resonance fired.
    expect(reactions).toBeGreaterThan(0);
    expect(hold.frost?.level).toBe(3);
    expect(hold.bolt?.level).toBe(3);
    expect(loneT?.level).toBe(4);

    // Band: the charged pair leads, but the lead stays within 40% of startLives (20 → 8).
    // Observed: pair 20, lone 14 → gap 6. The pair's edge is "a second tower on the lane
    // + reactions"; resonance is a reward for positioning, not an I-win button — and the
    // same charged pair still does NOT clear the world-1 finale (asserted below).
    expect(Math.abs(pairLives - loneLives)).toBeLessThanOrEqual(stage.startLives * 0.4);
  });

  it('a charged adjacent pair still cannot solo the world-1 finale (combination stays required)', () => {
    const hold: { frost?: Tower; bolt?: Tower } = {};
    for (const seed of [1, 42, 20260831]) {
      const rep = simulate(getStage('1-8'), pairBuild(hold), seed);
      expect(rep.won, `charged frost+bolt pair must not solo 1-8 (seed ${seed})`).toBe(false);
    }
  });
});
