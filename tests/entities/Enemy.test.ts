import type Phaser from 'phaser';
import {
  berserkerWalkFrameAt, crusherWalkFrameAt, Enemy, fastWalkFrameAt, minionHoverFrameAt, normalWalkFrameAt, regeneratorWalkFrameAt,
  shieldWalkFrameAt, splitterWalkFrameAt, summonerWalkFrameAt, tankWalkFrameAt,
} from '../../src/entities/Enemy';
import type { EnemyDef } from '../../src/core/types';

// Minimal rendering boundary; movement and status effects use the real Enemy.
function makeEnemy(hp = 100, extras: Partial<EnemyDef> = {}) {
  const sprite = {
    x: 0, y: 0,
    frame: 0,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setFrame(frame: number) { this.frame = frame; return this; },
    setScale() { return this; },
    setVisible() { return this; },
    setDepth() { return this; },
  };
  const bar = {
    clear() { return this; }, fillStyle() { return this; }, fillRect() { return this; },
    setDepth() { return this; }, setVisible() { return this; }, setPosition() { return this; },
    destroy() {},
  };
  const arc = {
    setDepth() { return this; }, setVisible() { return this; }, setPosition() { return this; },
    setStrokeStyle() { return this; }, destroy() {},
  };
  const scene = {
    add: {
      image: () => sprite, graphics: () => bar, circle: () => arc,
      ellipse: () => arc,
    },
  } as unknown as Phaser.Scene;
  return new Enemy(scene, { key: 'normal', name: '', hp, speed: 100, bounty: 1, lifeDamage: 1, ...extras },
    [{ x: 0, y: 0 }, { x: 0, y: 10000 }]);
}

describe('enemy health ratio', () => {
  it('reports full health until damaged, then clamps at zero', () => {
    const e = makeEnemy(100);
    expect(e.healthRatio).toBe(1);
    e.takeDamage(25);
    expect(e.healthRatio).toBe(0.75);
    e.takeDamage(999);
    expect(e.healthRatio).toBe(0);
  });
});

describe('fast hound walk animation', () => {
  it('loops through four frames every 90ms while it moves', () => {
    expect([0, 89, 90, 179, 180, 270, 360].map(fastWalkFrameAt)).toEqual([0, 0, 1, 1, 2, 3, 0]);
  });

  it('updates the rendered frame only while the hound advances', () => {
    const hound = makeEnemy(100, { key: 'fast' });
    hound.update(90, 1);
    expect((hound.sprite as unknown as { frame: number }).frame).toBe(1);

    hound.applyFreezeHit(3, 180, 1000);
    hound.applyFreezeHit(3, 180, 1000);
    hound.applyFreezeHit(3, 180, 1000);
    hound.update(180, 1);
    expect((hound.sprite as unknown as { frame: number }).frame).toBe(1);
  });
});

describe('normal soldier walk animation', () => {
  it('uses a slower four-frame cycle than the fast hound', () => {
    expect([0, 159, 160, 319, 320, 480, 640].map(normalWalkFrameAt)).toEqual([0, 0, 1, 1, 2, 3, 0]);
  });

  it('updates the rendered frame as the soldier walks', () => {
    const soldier = makeEnemy();
    soldier.update(160, 1);
    expect((soldier.sprite as unknown as { frame: number }).frame).toBe(1);
  });
});

describe('tank walk animation', () => {
  it('uses the slowest four-frame cycle', () => {
    expect([0, 219, 220, 440, 660, 880].map(tankWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('shield soldier walk animation', () => {
  it('cycles four frames at its steady walking cadence', () => {
    expect([0, 139, 140, 280, 420, 560].map(shieldWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('regenerator / summoner walk animation', () => {
  it('regenerator crawls on a four-frame cycle', () => {
    expect([0, 184, 185, 370, 555, 740].map(regeneratorWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
  it('summoner drifts on a four-frame cycle', () => {
    expect([0, 204, 205, 410, 615, 820].map(summonerWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('assembly drone hover animation', () => {
  it('cycles four frames through its quick hover rhythm', () => {
    expect([0, 119, 120, 240, 360, 480].map(minionHoverFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('disassembly unit walk animation', () => {
  it('cycles four frames as its shard pods shift in formation', () => {
    expect([0, 174, 175, 350, 525, 700].map(splitterWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('berserker walk animation', () => {
  it('loops through the furnace flare after three heavy steps', () => {
    expect([0, 209, 210, 420, 630, 840].map(berserkerWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('crusher walk animation', () => {
  it('loops through four slow tread frames', () => {
    expect([0, 259, 260, 520, 780, 1040].map(crusherWalkFrameAt)).toEqual([0, 0, 1, 2, 3, 0]);
  });
});

describe('enemy simulation time', () => {
  it('expires slow at the same game time at 1x and 2x', () => {
    const normal = makeEnemy();
    const fast = makeEnemy();
    normal.applySlow(0.5, 1000);
    fast.applySlow(0.5, 1000);
    for (let i = 0; i < 20; i++) normal.update(100, 1);
    for (let i = 0; i < 10; i++) fast.update(100, 2);
    expect(normal.pos.y).toBeCloseTo(150);
    expect(fast.pos.y).toBeCloseTo(150);
  });
  it('applies poison damage over simulation time and stops when the effect expires', () => {
    const e = makeEnemy();
    e.applyPoison(10, 1000);
    e.update(500, 1);
    expect(e.hp).toBeCloseTo(95);
    e.update(500, 1);
    expect(e.hp).toBeCloseTo(90);
    e.update(100, 1);
    expect(e.hp).toBeCloseTo(90);
  });

  it('stops movement for the freeze duration after the third frost hit', () => {
    const e = makeEnemy();

    e.applyFreezeHit(3, 350, 4000);
    e.applyFreezeHit(3, 350, 4000);
    e.applyFreezeHit(3, 350, 4000);
    e.update(350, 1);

    expect(e.pos.y).toBeCloseTo(0);

    e.update(100, 1);
    expect(e.pos.y).toBeCloseTo(10);
  });
});

const AIR_ALTITUDE = 22;

describe('air enemy', () => {
  it('reports the air layer; pos stays on the ground projection, renderPos rides at altitude', () => {
    const e = makeEnemy(100, { key: 'drone', movementLayer: 'air' });
    e.update(100, 1); // 경로 (0,0)->(0,10000), speed 100 -> 10px 진행
    expect(e.layer).toBe('air');
    expect(e.pos.y).toBeCloseTo(10, 0);                    // 그림자(지상) 기준 — 사거리/타겟팅
    expect(e.renderPos.x).toBeCloseTo(e.pos.x, 5);
    expect(e.renderPos.y).toBeCloseTo(e.pos.y - AIR_ALTITUDE, -1); // 스프라이트 = 지상점 - 고도 (±부유 2px)
    expect(e.renderPos.y).toBeLessThan(e.pos.y - AIR_ALTITUDE + 2.001);
    expect((e.sprite as unknown as { y: number }).y).toBe(e.renderPos.y);
  });

  it('defaults to ground layer with pos === renderPos === sprite', () => {
    const e = makeEnemy(100, { key: 'normal' });
    e.update(100, 1);
    expect(e.layer).toBe('ground');
    expect(e.renderPos).toEqual(e.pos);
    expect(e.renderPos.y).toBe((e.sprite as unknown as { y: number }).y);
  });
});

describe('enemy summons', () => {
  it('spawns only up to its living-minion cap, and frees a slot when a minion is removed', () => {
    const e = makeEnemy(100, { summon: { enemyKey: 'minion', intervalMs: 500, maxAlive: 1 } });

    e.update(500, 1);
    expect(e.collectSummons()).toEqual(['minion']);
    e.update(1000, 1);
    expect(e.collectSummons()).toEqual([]);

    e.notifySummonRemoved();
    expect(e.collectSummons()).toEqual(['minion']);
  });
});

describe('boss phases', () => {
  it('speeds up once at each health threshold, restores its shield, and calls reinforcements', () => {
    const boss = makeEnemy(100, {
      isBoss: true,
      speed: 100,
      shield: { energy: 10, rechargeDelayMs: 5000, rechargePerSecond: 0 },
      bossPhases: [
        { name: '돌격', atHealthRatio: 0.65, speedMultiplier: 1.8 },
        {
          name: '최후 방어선', atHealthRatio: 0.35, speedMultiplier: 2.3,
          shieldRestoreRatio: 1,
          summon: { enemyKey: 'minion', count: 2 },
        },
      ],
    });

    boss.takeDamage(45); // 10 shield + 35 HP = first threshold
    expect(boss.collectBossPhases().map((phase) => phase.name)).toEqual(['돌격']);
    expect(boss.movementSpeedMultiplier).toBe(1.8);
    boss.update(1000, 1);
    expect(boss.pos.y).toBeCloseTo(180);

    boss.takeDamage(30); // 65% -> 35%, second threshold
    expect(boss.collectBossPhases().map((phase) => phase.name)).toEqual(['최후 방어선']);
    expect(boss.movementSpeedMultiplier).toBe(2.3);
    expect(boss.state.shield).toBe(10);
    expect(boss.collectSummons()).toEqual(['minion', 'minion']);

    // Already-crossed phases never repeat on later damage.
    boss.takeDamage(1);
    expect(boss.collectBossPhases()).toEqual([]);
  });
});
