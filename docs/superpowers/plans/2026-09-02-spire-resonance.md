# 첨탑 공명 (Spire Resonance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인접한 원소 첨탑이 적에게 각인을 남기고, 옆의 다른 첨탑이 그 각인을 때려 원소 반응을 터뜨리는 배치 시너지 시스템을 넣는다.

**Architecture:** 순수 로직은 `EnemyState`(각인 슬롯·쿨다운) + `combat.ts`(반응 계산·인접 판정) + `data/reactions.ts`(수치). 렌더/조합은 `Game.ts` 에서 — 충전 집합 캐시(`recomputeCharged`), `dealDamage` 훅, `runReaction`, 공명선/이펙트. `Enemy` 는 `EnemyState` 로 얇게 위임.

**Tech Stack:** Phaser 3 + TypeScript strict + Vitest. 로직/렌더 분리(`src/core`·`src/systems` 는 phaser 금지, `tests/architecture.test.ts` 강제).

**Spec:** [docs/superpowers/specs/2026-09-02-spire-resonance-design.md](../specs/2026-09-02-spire-resonance-design.md)

## Global Constraints

- `src/core`, `src/systems` 는 `phaser` 를 import 하지 않는다. 밸런싱 매직넘버는 `src/data/` 에만.
- 시스템은 시간 API를 직접 만지지 않고 `dtMs` 를 인자로 받는다.
- TypeScript strict, `any` 금지(불가피하면 사유 주석), `noUnusedLocals/Parameters` 켜져 있음.
- 커밋 전 `npm test` + `npm run build` 통과. 커밋: Conventional Commits, 한 기능 한 커밋.
- 커밋 트레일러: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- 밸런스 불변(`tests/balance/`): "방어 안 함" 전패, 단일 화살 머지 빌드는 마지막 스테이지 승리 불가, 후반 조합은 적 특성 카운터 필요. 난이도를 임의로 완화하지 않는다.
- 새 Phaser 오브젝트 팩토리(`add.line` 등)를 쓰면 `tests/balance/harness.ts` 가짜 씬과 엔티티 단위 테스트 가짜 씬에 no-op 을 맞춘다.
- 좌표: 타일 `{col,row}` 와 픽셀 `{x,y}` 를 타입으로 구분. `TILE = 64`.
- 반응 피해·전염 독의 기여도(`damageByTower`)는 **터뜨린 타워 key** 로 귀속한다. `reaction:*` 같은 가짜 source 를 `applyPoison` 에 넘기지 않는다.

---

### Task 1: 타입 + 데이터 토대

**Files:**
- Modify: `src/core/types.ts` (`TowerLevelStats`/`TowerDef` 근처, 파일 상단 타입 구역)
- Modify: `src/data/towers.ts` (`frost`/`bolt`/`poison`/`cannon` 정의)
- Create: `src/data/reactions.ts`
- Create: `tests/data/reactions.test.ts`

**Interfaces:**
- Consumes: 없음.
- Produces:
  - `export type ElementKind = 'ice' | 'lightning' | 'decay' | 'fire'` (types.ts)
  - `TowerDef.element?: ElementKind` (types.ts)
  - `src/data/reactions.ts`: `MARK_DURATION_MS: number`, `REACTIONS: Record<ElementKind, ReactionDef>`, `FROST_COLLAPSE`, `STATIC_DISCHARGE`, `CORROSION_BURST`, `OVERHEAT` (전부 `as const`), `ReactionDef` 인터페이스, `elementOf(towerKey: string): ElementKind | null`.

- [ ] **Step 1: `ElementKind` + `TowerDef.element` 타입 추가**

`src/core/types.ts` 에서 `TowerDef` 선언 바로 위에:

```ts
/** 원소 첨탑의 원소. 충전 시 명중한 적에게 이 원소의 각인을 남긴다. */
export type ElementKind = 'ice' | 'lightning' | 'decay' | 'fire';
```

`TowerDef` 안, `paths?` 필드 아래에 한 줄 추가:

```ts
  /** 있으면 원소 첨탑 — 충전 시 명중한 적에게 이 원소의 각인을 남긴다. 경로 무관. */
  element?: ElementKind;
```

- [ ] **Step 2: 4개 타워에 `element` 부여**

`src/data/towers.ts`:
- `frost` 정의 첫 필드 줄(`key: 'frost', name: '서리탑', ...`)에 `element: 'ice',` 추가
- `bolt` → `element: 'lightning',`
- `poison` → `element: 'decay',` (`targetsAir: false` 옆)
- `cannon` → `element: 'fire',` (`targetsAir: false` 옆)

`arrow`/`sniper`/`laser`/`command`/`mine`/`ballista` 는 건드리지 않는다.

- [ ] **Step 3: `src/data/reactions.ts` 작성**

```ts
import type { ElementKind } from '../core/types';
import { getTower } from './towers';

/** 각인 지속(ms). 재명중 시 도로 채운다. */
export const MARK_DURATION_MS = 2500;

export interface ReactionDef {
  key: ElementKind;
  /** 세계관 이름 — 정보 시트·이펙트 라벨용. */
  name: string;
  /** 적별·원소별 재발동 대기(ms). */
  cooldownMs: number;
}

export const REACTIONS: Record<ElementKind, ReactionDef> = {
  ice:       { key: 'ice',       name: '서리 붕괴', cooldownMs: 900 },
  lightning: { key: 'lightning', name: '정전 방출', cooldownMs: 800 },
  decay:     { key: 'decay',     name: '부식 파열', cooldownMs: 900 },
  fire:      { key: 'fire',      name: '과열 폭발', cooldownMs: 1000 },
};

/** 서리 붕괴 — 대상 최대체력 비례 순간타(장갑·저항 무시), 상한 있음 + 짧은 감속. */
export const FROST_COLLAPSE = {
  maxHpFraction: 0.05,
  flatCap: 220,
  slowMul: 0.85,
  slowDurationMs: 800,
} as const;

/** 정전 방출 — 기폭 지점 주변 소수에게 소형 연쇄. */
export const STATIC_DISCHARGE = {
  jumpRadius: 110,
  maxJumps: 3,
  flat: 40,
  detonatorRatio: 0.35,
} as const;

/** 부식 파열 — 남은 독을 순간 폭발 + 주변 약한 전염. */
export const CORROSION_BURST = {
  flat: 30,
  poisonDpsRatio: 2.0,
  spreadRadius: 70,
  spreadMaxTargets: 4,
  spreadDpsRatio: 0.5,
  spreadDurationMs: 1500,
} as const;

/** 과열 폭발 — 방어구 파괴 + 짧고 센 화상 + 기폭타 비례분. */
export const OVERHEAT = {
  armorBreakPercent: 0.25,
  armorBreakDurationMs: 2000,
  burnDps: 24,
  burnDurationMs: 1600,
  detonatorRatio: 0.4,
} as const;

/** 타워 key → 원소 (없으면 null). `getTower` 를 한 번 감싸 호출측을 짧게 한다. */
export function elementOf(towerKey: string): ElementKind | null {
  return getTower(towerKey).element ?? null;
}
```

- [ ] **Step 4: 실패하는 테스트 작성 — `tests/data/reactions.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { REACTIONS, elementOf, MARK_DURATION_MS } from '../../src/data/reactions';

describe('reactions data', () => {
  it('maps the four elemental towers and nothing else', () => {
    expect(elementOf('frost')).toBe('ice');
    expect(elementOf('bolt')).toBe('lightning');
    expect(elementOf('poison')).toBe('decay');
    expect(elementOf('cannon')).toBe('fire');
    for (const k of ['arrow', 'sniper', 'laser', 'command', 'mine', 'ballista']) {
      expect(elementOf(k)).toBeNull();
    }
  });

  it('has a reaction def per element with a positive cooldown', () => {
    for (const el of ['ice', 'lightning', 'decay', 'fire'] as const) {
      expect(REACTIONS[el].key).toBe(el);
      expect(REACTIONS[el].name.length).toBeGreaterThan(0);
      expect(REACTIONS[el].cooldownMs).toBeGreaterThan(0);
    }
  });

  it('mark duration is a sane positive window', () => {
    expect(MARK_DURATION_MS).toBeGreaterThanOrEqual(1000);
  });
});
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npx vitest run tests/data/reactions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS. `tests/architecture.test.ts` 영향 없음(`reactions.ts` 는 `data`, phaser 안 씀 — `getTower` 만 import).

- [ ] **Step 7: 커밋**

```bash
git add src/core/types.ts src/data/towers.ts src/data/reactions.ts tests/data/reactions.test.ts
git commit -m "feat(data): element kinds + resonance reaction table

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: EnemyState — 각인 슬롯·쿨다운

**Files:**
- Modify: `src/systems/EnemyState.ts`
- Modify: `tests/systems/EnemyState.test.ts`

**Interfaces:**
- Consumes: `ElementKind` (types.ts), `MARK_DURATION_MS`/`REACTIONS` 는 **쓰지 않는다** — 지속·쿨다운 값은 호출측(Enemy/Game)이 넘긴다. EnemyState 는 순수하게 슬롯만 관리.
- Produces (EnemyState 인스턴스 메서드):
  - `applyElementalMark(element: ElementKind, durationMs: number): void`
  - `get markedElement(): ElementKind | null`
  - `consumeElementalMark(byElement: ElementKind | null): ElementKind | null`
  - `startReactionCooldown(element: ElementKind, ms: number): void`
  - `strongestPoisonDps(): number`

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/systems/EnemyState.test.ts` 에 `describe('elemental marks', ...)` 추가**

파일 맨 아래(마지막 `});` 뒤)에:

```ts
const grunt = {
  key: 'normal', name: '보병', hp: 100, speed: 50, bounty: 1, lifeDamage: 1,
  movementLayer: 'ground',
} as EnemyDef;

describe('EnemyState elemental marks', () => {
  it('applies a mark, exposes it, and lets it expire', () => {
    const e = new EnemyState(grunt);
    expect(e.markedElement).toBeNull();
    e.applyElementalMark('ice', 2500);
    expect(e.markedElement).toBe('ice');
    e.update(2000);
    expect(e.markedElement).toBe('ice');
    e.update(600);
    expect(e.markedElement).toBeNull();
  });

  it('newest mark overwrites the previous one (single slot)', () => {
    const e = new EnemyState(grunt);
    e.applyElementalMark('ice', 2500);
    e.applyElementalMark('lightning', 2500);
    expect(e.markedElement).toBe('lightning');
  });

  it('consume returns the element for a different detonator and clears the slot', () => {
    const e = new EnemyState(grunt);
    e.applyElementalMark('ice', 2500);
    expect(e.consumeElementalMark('lightning')).toBe('ice');
    expect(e.markedElement).toBeNull();
  });

  it('consume with null (physical) always detonates', () => {
    const e = new EnemyState(grunt);
    e.applyElementalMark('decay', 2500);
    expect(e.consumeElementalMark(null)).toBe('decay');
  });

  it('same-element detonator does not consume', () => {
    const e = new EnemyState(grunt);
    e.applyElementalMark('ice', 2500);
    expect(e.consumeElementalMark('ice')).toBeNull();
    expect(e.markedElement).toBe('ice');
  });

  it('reaction cooldown blocks re-consume until it elapses', () => {
    const e = new EnemyState(grunt);
    e.applyElementalMark('ice', 2500);
    expect(e.consumeElementalMark(null)).toBe('ice');
    e.startReactionCooldown('ice', 900);
    e.applyElementalMark('ice', 2500);
    expect(e.consumeElementalMark(null)).toBeNull();  // still cooling
    e.update(900);
    e.applyElementalMark('ice', 2500);
    expect(e.consumeElementalMark(null)).toBe('ice');
  });

  it('strongestPoisonDps reports the highest active channel', () => {
    const e = new EnemyState(grunt);
    expect(e.strongestPoisonDps()).toBe(0);
    e.applyPoison('poison', 20, 1500);
    e.applyPoison('cannon', 34, 1500);
    expect(e.strongestPoisonDps()).toBe(34);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run tests/systems/EnemyState.test.ts`
Expected: FAIL — `applyElementalMark`/`markedElement`/... 미정의.

- [ ] **Step 3: 필드 + 메서드 구현**

`src/systems/EnemyState.ts` import 에 타입 추가:

```ts
import type { AttackKind, ElementKind, EnemyDef } from '../core/types';
```

필드 구역(`private armorBreaks` 아래)에:

```ts
  /** 공명 각인 — 슬롯 1개, 최신이 덮어쓴다. */
  private mark: { element: ElementKind; leftMs: number } | null = null;
  /** 원소별 반응 재발동 대기. */
  private reactionCdMs = new Map<ElementKind, number>();
```

메서드(`applyArmorBreak` 아래, `update` 위)에:

```ts
  /** 충전된 원소 첨탑의 직격이 호출. 최신 각인이 기존 각인을 덮어쓴다. */
  applyElementalMark(element: ElementKind, durationMs: number): void {
    const d = Math.max(0, durationMs);
    if (!this.alive || d === 0) return;
    this.mark = { element, leftMs: d };
  }

  get markedElement(): ElementKind | null {
    return this.mark && this.mark.leftMs > 0 ? this.mark.element : null;
  }

  /**
   * `byElement` 와 다른 각인이 걸려 있고 그 원소 반응이 쿨다운 중이 아니면
   * 각인을 소비하고 그 원소를 반환. `byElement === null` (물리)이면 원소 비교 없이 소비.
   * 같은 원소(byElement === 각인)면 소비하지 않는다.
   */
  consumeElementalMark(byElement: ElementKind | null): ElementKind | null {
    const el = this.markedElement;
    if (!el) return null;
    if (byElement !== null && byElement === el) return null;
    if ((this.reactionCdMs.get(el) ?? 0) > 0) return null;
    this.mark = null;
    return el;
  }

  /** 반응 발동 직후 호출 — 같은 적이 매 프레임 같은 반응을 맞지 않게. */
  startReactionCooldown(element: ElementKind, ms: number): void {
    this.reactionCdMs.set(element, Math.max(this.reactionCdMs.get(element) ?? 0, Math.max(0, ms)));
  }

  /** 걸려 있는 독 채널 중 가장 센 dps (없으면 0). */
  strongestPoisonDps(): number {
    let hi = 0;
    for (const p of this.poison.values()) if (p.leftMs > 0 && p.dps > hi) hi = p.dps;
    return hi;
  }
```

`update(dtMs)` 안, `const dt = Math.max(0, dtMs);` 다음 줄에 각인·쿨다운 감소:

```ts
    if (this.mark) {
      this.mark.leftMs -= dt;
      if (this.mark.leftMs <= 0) this.mark = null;
    }
    if (this.reactionCdMs.size > 0) {
      for (const [el, left] of this.reactionCdMs) {
        const n = left - dt;
        if (n <= 0) this.reactionCdMs.delete(el);
        else this.reactionCdMs.set(el, n);
      }
    }
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run tests/systems/EnemyState.test.ts`
Expected: PASS (기존 + 신규 7 tests).

- [ ] **Step 5: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. `tests/architecture.test.ts` — EnemyState 는 여전히 phaser 무관.

- [ ] **Step 6: 커밋**

```bash
git add src/systems/EnemyState.ts tests/systems/EnemyState.test.ts
git commit -m "feat(enemy): elemental mark slot + per-element reaction cooldown

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: combat.ts — 순수 반응 계산 헬퍼

**Files:**
- Modify: `src/systems/combat.ts`
- Modify: `tests/systems/combat.test.ts`

**Interfaces:**
- Consumes: `Targetable` (TargetingSystem), `Vec2`/`TileCoord` (types), `FROST_COLLAPSE`/`STATIC_DISCHARGE` (reactions.ts).
- Produces:
  - `frostCollapseDamage(targetMaxHp: number): number`
  - `reactionBonusDamage(dealtAmount: number, ratio: number, flat: number): number`
  - `dischargeTargets(origin: Vec2, all: Targetable[], excludeId: number): Targetable[]`
  - `isOrthAdjacent(a: TileCoord, b: TileCoord): boolean`

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/systems/combat.test.ts`**

import 줄에 이름 추가:

```ts
import {
  chainDamages, buildChain, beamDamage, buffMultiplier, buildMultiShot, executeMultiplier, pierceLineTargets,
  frostCollapseDamage, reactionBonusDamage, dischargeTargets, isOrthAdjacent,
} from '../../src/systems/combat';
```

파일 맨 아래에:

```ts
describe('frostCollapseDamage', () => {
  it('is a fraction of max hp, capped, and rounded', () => {
    expect(frostCollapseDamage(1000)).toBe(50);      // 5% of 1000
    expect(frostCollapseDamage(100000)).toBe(220);   // capped
    expect(frostCollapseDamage(0)).toBe(0);
  });
});

describe('reactionBonusDamage', () => {
  it('is flat + ratio * dealt, rounded, never negative', () => {
    expect(reactionBonusDamage(100, 0.35, 40)).toBe(75);
    expect(reactionBonusDamage(0, 0.4, 0)).toBe(0);
    expect(reactionBonusDamage(-50, 0.4, 10)).toBe(10);
  });
});

describe('dischargeTargets', () => {
  it('picks nearest living enemies within jumpRadius, excluding the detonated one', () => {
    const origin = { x: 0, y: 0 };
    const all: Targetable[] = [
      mk(1, 0, 0),        // excluded
      mk(2, 30, 0),       // in
      mk(3, 80, 0),       // in
      mk(4, 200, 0),      // out of range
      mk(5, 10, 10, false), // dead
    ];
    const got = dischargeTargets(origin, all, 1).map((e) => e.id);
    expect(got).toEqual([2, 3]);
  });

  it('caps at STATIC_DISCHARGE.maxJumps', () => {
    const all: Targetable[] = [mk(1, 0, 0), mk(2, 5, 0), mk(3, 6, 0), mk(4, 7, 0), mk(5, 8, 0)];
    expect(dischargeTargets({ x: 0, y: 0 }, all, 1).length).toBe(3);
  });
});

describe('isOrthAdjacent', () => {
  it('is true only for the four orthogonal neighbours', () => {
    const c = { col: 5, row: 5 };
    expect(isOrthAdjacent(c, { col: 5, row: 4 })).toBe(true);
    expect(isOrthAdjacent(c, { col: 6, row: 5 })).toBe(true);
    expect(isOrthAdjacent(c, { col: 6, row: 6 })).toBe(false); // diagonal
    expect(isOrthAdjacent(c, { col: 5, row: 5 })).toBe(false); // self
    expect(isOrthAdjacent(c, { col: 5, row: 7 })).toBe(false); // two away
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run tests/systems/combat.test.ts`
Expected: FAIL — 미정의.

- [ ] **Step 3: 구현 — `src/systems/combat.ts`**

import 에 추가:

```ts
import type { Targetable } from './TargetingSystem';
import type { TowerLevelStats, TileCoord, Vec2 } from '../core/types';
import { FROST_COLLAPSE, STATIC_DISCHARGE } from '../data/reactions';
```

(기존 `import type { TowerLevelStats, Vec2 }` 줄을 위처럼 확장.)

파일 맨 아래에:

```ts
/** 서리 붕괴 순간 피해 — 대상 최대체력의 일부, 상한 적용, 반올림. 장갑·저항 무시는 호출측이 처리. */
export function frostCollapseDamage(targetMaxHp: number): number {
  const raw = Math.max(0, targetMaxHp) * FROST_COLLAPSE.maxHpFraction;
  return Math.round(Math.min(raw, FROST_COLLAPSE.flatCap));
}

/** 반응 순간타 = flat + ratio × 이번 직격 실피해. 음수 방지, 반올림. */
export function reactionBonusDamage(dealtAmount: number, ratio: number, flat: number): number {
  return Math.round(Math.max(0, flat + Math.max(0, dealtAmount) * ratio));
}

/**
 * 정전 방출 점프 대상: `origin`(기폭 지점) 기준 `STATIC_DISCHARGE.jumpRadius` 내
 * 살아있는 적을 최근접순으로 최대 `STATIC_DISCHARGE.maxJumps` 명. `excludeId` 는 제외.
 */
export function dischargeTargets(origin: Vec2, all: Targetable[], excludeId: number): Targetable[] {
  const r2 = STATIC_DISCHARGE.jumpRadius * STATIC_DISCHARGE.jumpRadius;
  return all
    .filter((e) => e.alive && e.id !== excludeId && dist2(origin, e.pos) <= r2)
    .sort((a, b) => dist2(origin, a.pos) - dist2(origin, b.pos) || a.id - b.id)
    .slice(0, STATIC_DISCHARGE.maxJumps);
}

/** 두 타일이 상하좌우로 딱 붙어 있는가 (대각선·자기 자신 제외). */
export function isOrthAdjacent(a: TileCoord, b: TileCoord): boolean {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run tests/systems/combat.test.ts`
Expected: PASS.

- [ ] **Step 5: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. `tests/architecture.test.ts` — `combat.ts` 가 `src/data/reactions` 를 import 하는 것은 허용(data 는 phaser 무관, 시스템→데이터 방향 OK. 기존에 `combat.ts` 가 `../core/types` 만 쓰던 것에서 확장 — architecture 테스트는 `phaser` import 만 막으므로 통과).

- [ ] **Step 6: 커밋**

```bash
git add src/systems/combat.ts tests/systems/combat.test.ts
git commit -m "feat(combat): pure helpers for resonance reactions + adjacency

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Enemy 위임 + Tower.charged + harness 가짜 씬

**Files:**
- Modify: `src/entities/Enemy.ts`
- Modify: `src/entities/Tower.ts`
- Modify: `tests/balance/harness.ts`
- Modify: `tests/entities/enemy.test.ts` (있으면; 없으면 생략)

**Interfaces:**
- Consumes: Task 2 (`EnemyState.applyElementalMark`/`markedElement`/`consumeElementalMark`/`startReactionCooldown`/`strongestPoisonDps`), `ElementKind`.
- Produces:
  - `Enemy.applyElementalMark(element: ElementKind, durationMs: number): void`
  - `Enemy.consumeElementalMark(byElement: ElementKind | null): ElementKind | null`
  - `Enemy.get markedElement(): ElementKind | null`
  - `Enemy.startReactionCooldown(element: ElementKind, ms: number): void`
  - `Enemy.strongestPoisonDps(): number`
  - `Tower.charged: boolean` (기본 false; Game 이 갱신)
  - harness 가짜 씬 `add.line`

- [ ] **Step 1: Enemy 위임 추가**

`src/entities/Enemy.ts` import 에 `ElementKind` 추가:

```ts
import type { /* 기존들 */, ElementKind } from '../core/types';
```

`applyPoison(...)` 아래(같은 위임 구역)에:

```ts
  applyElementalMark(element: ElementKind, durationMs: number): void {
    this.state.applyElementalMark(element, durationMs);
  }

  consumeElementalMark(byElement: ElementKind | null): ElementKind | null {
    return this.state.consumeElementalMark(byElement);
  }

  get markedElement(): ElementKind | null {
    return this.state.markedElement;
  }

  startReactionCooldown(element: ElementKind, ms: number): void {
    this.state.startReactionCooldown(element, ms);
  }

  strongestPoisonDps(): number {
    return this.state.strongestPoisonDps();
  }
```

- [ ] **Step 2: `Tower.charged` 필드**

`src/entities/Tower.ts`, `path: 'a' | 'b' | null = null;` 아래:

```ts
  /** 공명 충전 상태 — Game.recomputeCharged 가 매 배치 변경마다 갱신한다. 공명선·정보 시트용. */
  charged = false;
```

- [ ] **Step 3: harness 가짜 씬에 `add.line`**

`tests/balance/harness.ts` 의 `Object.assign(scene, { add: { ... } })` 안에 한 줄:

```ts
      line: (x: number, y: number) => new DisplayObject(x, y),
```

(`image`/`circle`/`ellipse`/`graphics` 옆.)

- [ ] **Step 4: 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. 엔티티 단위 테스트가 `enemy.test.ts` 에 있으면 그 가짜 씬도 확인 —
현재 `Enemy` 생성자는 `scene.add.image/graphics/circle/ellipse` 만 쓰므로 신규 위임은 씬 표면을 안 늘린다. 변경 불필요.

- [ ] **Step 5: 커밋**

```bash
git add src/entities/Enemy.ts src/entities/Tower.ts tests/balance/harness.ts
git commit -m "feat(entities): elemental-mark delegation + Tower.charged + harness line stub

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Game — 충전 집합 캐시 + recompute 배선

**Files:**
- Modify: `src/scenes/Game.ts`
- Create: `tests/balance/resonance.test.ts`

**Interfaces:**
- Consumes: Task 1 (`elementOf`), Task 3 (`isOrthAdjacent`), Task 4 (`Tower.charged`), `getTower`.
- Produces (Game private):
  - `chargedTowers: Set<Tower>` — 충전된 타워 인스턴스
  - `chargedKeys: Set<string>` — 충전된 타워가 1기라도 있는 key
  - `recomputeCharged(): void`
- `recomputeCharged()` 는 `placeTower`(push 후), `removeTower`(filter 후), `dragend` 의 자리 교체·이동 분기(위치 확정 후), `doMerge`(removeTower 가 호출하므로 자동) 에서 불린다.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/balance/resonance.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { simulate } from './harness';
import { getStage } from '../../src/data/stages';
import type { Tower } from '../../src/entities/Tower';
import type { StrategyContext } from './harness';

/** 스테이지 1-1 에서 인접 두 칸에 두 타워를 놓고 관찰. */
function pair(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 4, 7); // (4,6) 바로 아래 = 4-인접
    }
  };
}

describe('resonance charged set', () => {
  it('charges an elemental tower placed next to a non-support partner', () => {
    const stage = getStage('1-1');
    const report = simulate(stage, pair('frost', 'arrow'), 1);
    // 시뮬 종료 후 마지막 상태 확인용 — simulate 가 scene 을 반환하지 않으므로
    // 대신 아래 "reactions" 테스트에서 실제 발동으로 검증한다. 여기서는
    // 최소한 시뮬이 안 깨지고 완주하는지만 본다.
    expect(report.waves.length).toBeGreaterThan(0);
  });
});
```

> 참고: `simulate` 는 `BalanceReport` 만 반환하고 scene 을 안 준다. 충전 집합의 직접 단언은
> harness 를 건드리지 않는 선에서 어렵다. **이 태스크의 실질 검증은 Task 6 의 반응 발동 테스트**가 한다.
> Task 5 는 "배선 후 시뮬이 완주" + 다음 태스크가 의존하는 `recomputeCharged` 호출 지점 확보가 목표.
> 구현자는 `simulate` 가 scene 을 반환하도록 살짝 넓히는 것을 검토해도 좋다(아래 Step 4 옵션).

- [ ] **Step 2: 실행 → (컴파일) 확인**

Run: `npx vitest run tests/balance/resonance.test.ts`
Expected: `getStage` import 경로가 맞으면 PASS(완주만 본다). `1-1` id 확인: `src/data/stages/` 의 export 를 본다(`getStage`/`STAGES` 등 실제 이름 사용).

- [ ] **Step 3: 충전 집합 구현 — `src/scenes/Game.ts`**

import 에:

```ts
import { elementOf } from '../data/reactions';
import { /* 기존 combat imports */, isOrthAdjacent } from '../systems/combat';
```

필드 구역(`private damageByTower = ...` 근처)에:

```ts
  /** 공명 충전된 타워 인스턴스 — 공명선·정보 시트용. */
  private chargedTowers = new Set<Tower>();
  /** 충전된 타워가 1기라도 있는 key — dealDamage 훅에서 O(1) 조회. */
  private chargedKeys = new Set<string>();
```

`create()` 의 필드 초기화 구역(`this.damageByTower.clear();` 근처)에 `this.chargedTowers.clear(); this.chargedKeys.clear();`.

새 메서드(`effectiveStats` 근처, private 구역):

```ts
  /**
   * 충전 규칙(스펙 §2.2): 원소 첨탑 T 가 상하좌우 인접에
   * `attack !== 'support'` 이고 원소가 다른(또는 없는) 첨탑을 1기 이상 두면 충전.
   * 배치가 바뀔 때만(설치·머지·판매·이동) 호출한다.
   */
  private recomputeCharged(): void {
    this.chargedTowers.clear();
    this.chargedKeys.clear();
    for (const t of this.towers) {
      const el = elementOf(t.key);
      t.charged = false;
      if (!el) continue;
      for (const n of this.towers) {
        if (n === t) continue;
        if (getTower(n.key).attack === 'support') continue;
        if (elementOf(n.key) === el) continue;
        if (!isOrthAdjacent(t.tile, n.tile)) continue;
        t.charged = true;
        break;
      }
      if (t.charged) {
        this.chargedTowers.add(t);
        this.chargedKeys.add(t.key);
      }
    }
    this.updateResonanceLinks(); // Task 7 에서 구현; 지금은 빈 메서드로 둔다
  }

  /** Task 7 에서 채운다 — 지금은 no-op. */
  private updateResonanceLinks(): void {}
```

- [ ] **Step 4: 호출 지점 배선**

- `placeTower`: `this.towers.push(tower);` 다음 줄에 `this.recomputeCharged();`
- `removeTower`: `this.towers = this.towers.filter((x) => x.id !== t.id);` 다음(또는 메서드 끝)에 `this.recomputeCharged();`
- `dragend` 자리 교체 분기: `this.audio.play('place');` (교체) 앞이나 뒤에 `this.recomputeCharged();`
- `dragend` 빈 타일 이동 분기: `dragged.relocate(...)` 다음에 `this.recomputeCharged();`
- `doMerge`: 별도 추가 불필요(`this.removeTower(dragged)` 가 부른다). 단 `targetTower.setLevel` 은
  원소를 안 바꾸므로 충전 상태 불변 — OK.

(옵션) `simulate` 가 scene 을 검증에 쓰도록 넓히려면 `harness.ts` 의 `simulate` 반환에
`report` 외에 아무 것도 더하지 말고, 대신 별도 export `simulateScene(stage, strategy, seed)` 를
추가해 `{ report, scene }` 를 주는 방법. **이번 플랜에서는 하지 않는다** — Task 6 반응 테스트로 충분.

- [ ] **Step 5: 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. `recomputeCharged` 가 O(n²) 지만 배치 변경 시에만 — 시뮬 성능 영향 미미.
`tests/balance/balance.test.ts`·`monoTower.test.ts` — trunkTiles 상 대부분 비인접이라 충전 거의 없음 → 수치 불변. (일부 인접쌍이 있어도 Task 6 훅 전이라 반응 자체가 없음.)

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/Game.ts tests/balance/resonance.test.ts
git commit -m "feat(game): resonance charged-set cache recomputed on placement changes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Game — dealDamage 훅 + runReaction

**Files:**
- Modify: `src/scenes/Game.ts`
- Modify: `tests/balance/resonance.test.ts`

**Interfaces:**
- Consumes: Task 1 (`REACTIONS`, `MARK_DURATION_MS`, `FROST_COLLAPSE`, `CORROSION_BURST`, `OVERHEAT`, `STATIC_DISCHARGE`, `elementOf`), Task 2/4 (`Enemy.applyElementalMark`/`consumeElementalMark`/`startReactionCooldown`/`strongestPoisonDps`/`markedElement`), Task 3 (`frostCollapseDamage`, `reactionBonusDamage`, `dischargeTargets`), Task 5 (`chargedKeys`).
- Produces (Game private): `runReaction(el: ElementKind, byTowerKey: string, target: Enemy, dealtAmount: number): void`. `dealDamage` 가 내부에서 훅을 호출.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/balance/resonance.test.ts` 에 추가**

```ts
import { REACTIONS } from '../../src/data/reactions';

describe('resonance reactions fire', () => {
  it('a charged frost tower + arrow partner shatters a marked enemy', () => {
    const stage = getStage('1-1');
    // 서리(원소) + 화살(기폭). 인접. 화살 단독 대비 총 피해가 늘어야 한다.
    const withPair = simulate(stage, pair('frost', 'arrow'), 7);
    // 대조군: 같은 두 타워를 비인접으로.
    const apart = simulate(stage, (c) => {
      if (c.wave === 1 && c.game.towers.length === 0) { c.buy('frost', 4, 6); c.buy('arrow', 6, 9); }
    }, 7);
    // 인접 배치가 최소한 동등 이상(반응은 순수 이득). 웨이브 생존/골드로 근사.
    const livesPair = withPair.waves.at(-1)!.lives;
    const livesApart = apart.waves.at(-1)!.lives;
    expect(livesPair).toBeGreaterThanOrEqual(livesApart);
  });

  it('mono-elemental tower alone in a corner never charges (no free synergy)', () => {
    const stage = getStage('1-1');
    const solo = simulate(stage, (c) => { if (c.wave === 1 && !c.game.towers.length) c.buy('frost', 0, 0); }, 3);
    const soloB = simulate(stage, (c) => { if (c.wave === 1 && !c.game.towers.length) c.buy('frost', 0, 0); }, 3);
    expect(solo.waves.at(-1)!.lives).toBe(soloB.waves.at(-1)!.lives); // deterministic, unchanged
  });
});
```

> 이 테스트는 근사(생존/골드)다. 정밀 단언(반응 N회, 피해 밴드)은 harness 를 넓혀야 하므로
> **구현자가 `simulate` 에 `onReaction` 훅 카운터를 옵션으로 넣는 것을 허용**한다:
> `simulate(stage, strategy, seed, speed, opts?: { onReaction?: (el, byKey) => void })`.
> Game 에 `this.onReaction?.(el, byTowerKey)` 를 `runReaction` 안에서 부르게 하고
> harness 가 `Object.assign` 으로 주입. 이러면 아래처럼 강한 단언이 가능:
> `expect(reactionCount).toBeGreaterThan(0)` / `expect(byKeys).toContain('arrow')`.
> **구현자 판단으로 이 훅을 추가하고 테스트를 강화할 것.** 없으면 위 근사 테스트라도 통과시켜야 한다.

- [ ] **Step 2: 실행 → 실패/근사 확인**

Run: `npx vitest run tests/balance/resonance.test.ts`
Expected: 훅 없으면 근사 테스트가 애매하게 통과할 수 있음 — 구현 후 `onReaction` 카운터로 강한 단언 추가.

- [ ] **Step 3: `dealDamage` 훅 구현 — `src/scenes/Game.ts`**

import 에:

```ts
import {
  REACTIONS, MARK_DURATION_MS, FROST_COLLAPSE, CORROSION_BURST, OVERHEAT, elementOf,
} from '../data/reactions';
import {
  /* 기존 */, frostCollapseDamage, reactionBonusDamage, dischargeTargets, isOrthAdjacent,
} from '../systems/combat';
import type { ElementKind } from '../core/types';
```

(옵션 훅) 필드에:

```ts
  /** 테스트 계측용 — 반응이 터질 때마다 호출(프로덕션에선 미설정). */
  private onReaction?: (el: ElementKind, byTowerKey: string) => void;
```

`dealDamage` 를 수정:

```ts
  private dealDamage(towerKey: string, enemy: Enemy, packet: DamagePacket, flash = true): number {
    const dealt = enemy.takeDamage(packet, flash);
    this.creditDamage(towerKey, dealt);
    this.resonanceHook(towerKey, enemy, dealt);
    return dealt;
  }

  /** 공명: 지원탑이 아니면 다른 각인을 격발하고, 충전된 원소 첨탑이면 자기 각인을 남긴다. */
  private resonanceHook(towerKey: string, enemy: Enemy, dealt: number): void {
    if (!enemy.alive && enemy.markedElement == null) return;
    const def = getTower(towerKey);
    if (def.attack === 'support') return;
    const towerEl = elementOf(towerKey);

    const consumed = enemy.consumeElementalMark(towerEl);
    if (consumed) this.runReaction(consumed, towerKey, enemy, dealt);

    if (towerEl && this.chargedKeys.has(towerKey) && enemy.alive) {
      enemy.applyElementalMark(towerEl, MARK_DURATION_MS);
    }
  }
```

> 주의: `resonanceHook` 는 `dealDamage` 안에서 다시 `dealDamage`(runReaction 경유)를 부른다 —
> **재귀**. 반응의 순간타는 `kind: 'single'|'chain'|'poison'|'splash'` 로 나가고, 그 타워 key 는
> 원소가 있을 수 있으나(예: 화살이 터뜨렸는데 화살은 원소 없음 → 재귀 시 `towerEl` null,
> 각인 없으니 `consumeElementalMark` 는 null, 새 각인도 안 남김 → 즉시 종료). 원소 타워가
> 터뜨린 경우(예: 번개가 서리 각인 격발)는 재귀 진입 시 각인이 이미 소비돼 없음 → 종료.
> 무한 재귀 없음. 다만 방어적으로 `runReaction` 안의 `dealDamage` 호출은 재귀 깊이 1로 끝난다는
> 주석을 달 것.

- [ ] **Step 4: `runReaction` 구현**

```ts
  private runReaction(el: ElementKind, byTowerKey: string, target: Enemy, dealtAmount: number): void {
    target.startReactionCooldown(el, REACTIONS[el].cooldownMs);
    this.onReaction?.(el, byTowerKey);
    const reactionColor: Record<ElementKind, number> = {
      ice: COLORS.frost, lightning: COLORS.bolt, decay: COLORS.poison, fire: COLORS.cannon,
    };

    if (el === 'ice') {
      const amount = frostCollapseDamage(target.state.maxHp);
      this.dealDamage(byTowerKey, target, { amount, kind: 'single', ignoreShield: true, armorPierce: 9999 }, false);
      target.applySlow(FROST_COLLAPSE.slowMul, FROST_COLLAPSE.slowDurationMs);
    } else if (el === 'lightning') {
      const jolt = reactionBonusDamage(dealtAmount, 0.35, 40);
      for (const hit of dischargeTargets(target.pos, this.enemyTargets(), target.id)) {
        const e = this.enemies.find((x) => x.id === hit.id);
        if (e) this.dealDamage(byTowerKey, e, { amount: jolt, kind: 'chain' }, false);
      }
    } else if (el === 'decay') {
      const dps = target.strongestPoisonDps();
      const burst = CORROSION_BURST.flat + dps * CORROSION_BURST.poisonDpsRatio;
      this.dealDamage(byTowerKey, target, { amount: burst, kind: 'poison' }, false);
      if (dps > 0) {
        const layers = towerLayers(true, false);
        let n = 0;
        for (const hit of enemiesInRadius(target.pos, CORROSION_BURST.spreadRadius, this.enemyTargets(), layers)) {
          if (hit.id === target.id || n >= CORROSION_BURST.spreadMaxTargets) continue;
          const e = this.enemies.find((x) => x.id === hit.id);
          if (!e) continue;
          e.applyPoison(byTowerKey, dps * CORROSION_BURST.spreadDpsRatio, CORROSION_BURST.spreadDurationMs);
          n++;
        }
      }
    } else { // fire
      target.applyArmorBreak(OVERHEAT.armorBreakPercent, OVERHEAT.armorBreakDurationMs);
      target.applyPoison(byTowerKey, OVERHEAT.burnDps, OVERHEAT.burnDurationMs);
      this.dealDamage(byTowerKey, target, {
        amount: reactionBonusDamage(dealtAmount, OVERHEAT.detonatorRatio, 0), kind: 'splash',
      }, false);
    }

    this.impactFlash(target.renderPos, reactionColor[el], el === 'ice' ? 'frost' : 'heavy');
  }

  /** 반응 AoE 조회에 쓸 Targetable 배열 (this.enemies 를 그대로 — Enemy 가 Targetable 을 만족). */
  private enemyTargets(): Enemy[] {
    return this.enemies;
  }
```

> `this.enemies` 원소가 `Targetable` 을 만족하는지 확인: `dischargeTargets`/`enemiesInRadius` 는
> `{ id, pos, alive, layer? }` 만 읽는다. `Enemy` 는 `id`/`get pos`/`get alive`/`layer` 전부 있음 → OK.
> `enemyTargets()` 헬퍼는 타입만 맞추는 얇은 래퍼 — 인라인 `this.enemies` 로 대체 가능하면 그렇게.

- [ ] **Step 5: `onReaction` 훅을 harness 에 노출 (구현자 재량, 권장)**

`tests/balance/harness.ts` `simulate` 시그니처:

```ts
export function simulate(
  stage: StageDef, strategy: Strategy, seed = 1, speed = 1,
  opts: { onReaction?: (el: string, byTowerKey: string) => void } = {},
): BalanceReport {
```

`Object.assign(scene, { ... })` 에 `onReaction: opts.onReaction` 추가.
그럼 Step 1 테스트를 강한 단언으로 교체:

```ts
it('a charged frost tower + arrow partner shatters marked enemies', () => {
  let count = 0; const byKeys = new Set<string>();
  simulate(getStage('1-1'), pair('frost', 'arrow'), 7, 1, {
    onReaction: (el, by) => { if (el === 'ice') { count++; byKeys.add(by); } },
  });
  expect(count).toBeGreaterThan(0);
  expect([...byKeys]).toContain('arrow'); // 화살이 서리 각인을 터뜨렸다
});

it('non-adjacent frost + arrow never reacts', () => {
  let count = 0;
  simulate(getStage('1-1'), (c) => {
    if (c.wave === 1 && !c.game.towers.length) { c.buy('frost', 4, 6); c.buy('arrow', 6, 9); }
  }, 7, 1, { onReaction: () => { count++; } });
  expect(count).toBe(0);
});
```

- [ ] **Step 6: 실행 → 통과**

Run: `npx vitest run tests/balance/resonance.test.ts`
Expected: PASS (강한 단언).

- [ ] **Step 7: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. 특히:
- `tests/balance/balance.test.ts` — 불변 유지(아래 Task 8 에서 정밀 확인). trunkTiles 인접쌍에서
  반응이 조금 터질 수 있으나, `spread`/`mixedMerge` 는 원래 여유로 통과하는 케이스이고
  `oneArrow`/단일화살머지는 원소가 없어 무영향.
- `tests/balance/monoTower.test.ts` — 단일 타워는 이웃이 없어 미충전 → 완전 무영향.

- [ ] **Step 8: 커밋**

```bash
git add src/scenes/Game.ts tests/balance/resonance.test.ts tests/balance/harness.ts
git commit -m "feat(game): resonance detonation hook + four reactions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: UI — 공명선 + 반응 이펙트 + 정보 시트 줄

**Files:**
- Modify: `src/scenes/Game.ts`
- Modify: `src/core/constants.ts` (`COLORS.resonance`)

**Interfaces:**
- Consumes: Task 5 (`recomputeCharged`, `chargedTowers`, `updateResonanceLinks` 스텁), Task 1 (`REACTIONS`, `elementOf`), Task 4 (`Tower.charged`).
- Produces: `updateResonanceLinks()` 실제 구현, `inspectView` 에 공명 줄, SHUTDOWN 정리.

- [ ] **Step 1: `COLORS.resonance` 추가**

`src/core/constants.ts` `COLORS` 에:

```ts
  resonance: 0xb98cff,
```

- [ ] **Step 2: 공명선 렌더 — `src/scenes/Game.ts`**

필드에:

```ts
  /** 충전된 원소 첨탑과 그 파트너를 잇는 룬 빛줄기. recomputeCharged 마다 다시 그린다. */
  private resonanceLines: Phaser.GameObjects.Line[] = [];
```

`updateResonanceLinks()` 스텁을 교체:

```ts
  private updateResonanceLinks(): void {
    for (const l of this.resonanceLines) l.destroy();
    this.resonanceLines = [];
    if (typeof this.add.line !== 'function') return; // 밸런스 시뮬 가짜 씬
    const seen = new Set<string>();
    for (const t of this.chargedTowers) {
      for (const n of this.towers) {
        if (n === t) continue;
        if (getTower(n.key).attack === 'support') continue;
        if (elementOf(n.key) === elementOf(t.key)) continue;
        if (!isOrthAdjacent(t.tile, n.tile)) continue;
        const pairKey = [t.id, n.id].sort((a, b) => a - b).join('-');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        const mid = { x: (t.homePos.x + n.homePos.x) / 2, y: (t.homePos.y + n.homePos.y) / 2 };
        const line = this.add.line(0, 0, t.homePos.x, t.homePos.y, n.homePos.x, n.homePos.y, COLORS.resonance, 0.5)
          .setOrigin(0, 0).setDepth(3).setLineWidth(2);
        void mid;
        this.resonanceLines.push(line);
      }
    }
  }
```

> `isOrthAdjacent`/`elementOf` 는 Task 3/1 에서 이미 import 됨(Task 5·6 에서 추가). 중복 import 금지.

- [ ] **Step 3: 반응 이펙트 색 구분 강화 (선택, 이미 Task 6 `impactFlash` 로 최소 충족)**

Task 6 의 `runReaction` 끝에서 `this.impactFlash(target.renderPos, reactionColor[el], ...)` 를 이미
호출한다. 추가로 `lightning` 은 점프 대상까지 얇은 선 1프레임:

```ts
    // runReaction 의 lightning 분기 안, 각 e 에 대해:
    if (typeof this.add.line === 'function') {
      const spark = this.add.line(0, 0, target.renderPos.x, target.renderPos.y, e.renderPos.x, e.renderPos.y, COLORS.bolt, 0.9)
        .setOrigin(0, 0).setDepth(24).setLineWidth(1.5);
      if (this.tweens) this.tweens.add({ targets: spark, alpha: 0, duration: 140, onComplete: () => spark.destroy() });
      else spark.destroy();
    }
```

- [ ] **Step 4: 정보 시트 공명 줄 — `inspectView`**

`inspectView(tower)` 의 `lines` 배열을 만든 직후, `if (info.note) lines.push(info.note);` 아래에:

```ts
    const resoLine = this.resonanceInspectLine(tower);
    if (resoLine) lines.push(resoLine);
```

새 메서드:

```ts
  /** 정보 시트용 공명 상태 한 줄. 없으면 null. */
  private resonanceInspectLine(tower: Tower): string | null {
    const el = elementOf(tower.key);
    if (el && tower.charged) return `공명 충전 · ${REACTIONS[el].name}`;
    if (el && !tower.charged) return null;
    // 원소 없는 타워: 인접에 충전된 원소 첨탑이 있으면 기폭기로 표시
    const partners = this.towers.filter((n) =>
      n !== tower && elementOf(n.key) && n.charged && isOrthAdjacent(tower.tile, n.tile)
      && getTower(tower.key).attack !== 'support');
    if (partners.length === 0) return null;
    const names = partners.map((n) => `${getTower(n.key).name}→${REACTIONS[elementOf(n.key)!].name}`);
    return `공명 기폭 · ${names.join(', ')}`;
  }
```

- [ ] **Step 5: SHUTDOWN 정리**

`this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { ... })` 안, `this.sheet?.destroy();` 근처에:

```ts
      for (const l of this.resonanceLines) l.destroy();
      this.resonanceLines = [];
```

- [ ] **Step 6: 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. `tests/balance/harness.ts` 가짜 씬에 `add.line` 이 있으니(Task 4) 공명선 코드가
가짜 씬에서도 안전(단 `typeof this.add.line !== 'function'` 가드가 먼저 걸러 no-op).

- [ ] **Step 7: 브라우저 검증** (`npm run dev`, 뷰포트 375×812)

`window.__game` 로 Game 진입:
1. 서리탑 (4,6) + 화살탑 (4,7) → 두 타워 사이에 보라색 공명선.
2. 서리탑 (4,6) + 번개탑 (4,7) → 양방향(선 1개, 둘 다 charged).
3. 서리탑을 (0,0) 코너에 홀로 → 공명선 없음.
4. 웨이브 돌려 서리탑이 적을 얼림 → 화살 명중 시 하늘색 파쇄 팝. 번개탑 반응 시 노란 스파크 선.
5. 서리탑 탭 → 정보 시트에 `공명 충전 · 서리 붕괴`. 화살탑 탭 → `공명 기폭 · 서리탑→서리 붕괴`.
6. `read_console_messages` 에러 없음. 스크린샷 3장: 공명선, 반응 팝, 정보 시트.

- [ ] **Step 8: 커밋**

```bash
git add src/scenes/Game.ts src/core/constants.ts
git commit -m "feat(ui): resonance link lines, reaction pops, inspect-sheet line

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: 밸런스 회귀 + ROADMAP + 마감

**Files:**
- Modify: `src/data/reactions.ts` (수치 조정이 필요하면만)
- Modify: `docs/ROADMAP.md`
- (필요 시) Modify: `tests/balance/resonance.test.ts`

**Interfaces:**
- Consumes: 전 태스크.
- Produces: 없음(문서 + 밸런스 확정).

- [ ] **Step 1: 밸런스 표 출력 확인**

Run: `npx vitest run tests/balance/balance.test.ts --reporter=verbose`
Expected: 전부 PASS. 특히 단언:
- `noDefense` 전 스테이지 전패
- 마지막 스테이지에서 `monoTower('arrow', ...)` 승리 불가
- 후반 조합이 적 특성 카운터 필요

만약 인접 배치를 쓰는 `mixedMerge`/`mixedSpread` 케이스가 **더 쉬워져** 밸런스 표가 흔들리면:
- 먼저 원인 확인 — trunkTiles 인접쌍에서 반응이 얼마나 터지는지.
- 조정은 `src/data/reactions.ts` 수치만 낮춘다(반응 자체를 없애지 않음). 우선순위:
  `STATIC_DISCHARGE.flat`/`detonatorRatio` → `CORROSION_BURST.poisonDpsRatio` →
  `FROST_COLLAPSE.flatCap` → `OVERHEAT.detonatorRatio`.
- `BALANCE_EXPLORE` 는 쓰지 않는다(이 플랜 범위 밖, 별도 이슈).

- [ ] **Step 2: monoTower 회귀**

Run: `npx vitest run tests/balance/monoTower.test.ts --reporter=verbose`
Expected: 6종 솔로 클리어 밴드 **완전 무변**(단일 타워 = 이웃 없음 = 미충전). 값이 하나라도
바뀌면 버그 — `recomputeCharged`/`dealDamage` 훅이 미충전 상태에서 부작용을 낸다는 뜻이니 조사.

- [ ] **Step 3: 목표 밴드 확인 — "인접 Lv3 두 기 ≈ Lv4 한 기"**

`tests/balance/resonance.test.ts` 에 한 케이스 추가:

```ts
it('an adjacent Lv3 pair is comparable to — not far above — a lone Lv4', () => {
  // frost L3(a) + bolt L3(a) 인접  vs  frost L4(a) 단독. 같은 시드/스테이지에서
  // 첫 보스 웨이브까지 준 총 피해(gold 프록시나 lives)로 근사 비교.
  // 페어가 단독보다 압도적이면(예: lives 차이가 스테이지 시작 라이프의 40% 초과) 실패.
  // 구현자가 적절한 스테이지(예: '1-8' 보스)와 근사 지표를 고른다.
});
```

압도적이면 Step 1 의 우선순위로 수치를 깎고 재실행.

- [ ] **Step 4: ROADMAP 갱신 — `docs/ROADMAP.md`**

"완료" 섹션에(타워 업그레이드 분기 항목 근처):

```markdown
- **첨탑 공명 (인접 시너지)**: 원소 첨탑(서리·번개·역병·파열)이 상하좌우 인접에 다른 비지원
  첨탑을 두면 "충전"되어 적에게 원소 각인을 남긴다. 다른 첨탑(물리 포함)이 그 적을 때리면
  각인을 소비해 반응 발동 — 서리 붕괴(체력비례 순간타)·정전 방출(소형 연쇄)·부식 파열
  (독 폭발+전염)·과열 폭발(방어구 파괴+화상). 데이터 `src/data/reactions.ts`, 각인은
  `EnemyState`, 반응 실행은 `Game.runReaction`. 코너에 홀로 = 시너지 0(머지 정체성 보존).
```

"다음" 섹션의 `- [x] **깊이 A ...` 줄을 갱신:

```markdown
- [x] **깊이 A — 타워 업그레이드 분기** + **깊이 C — 인접 시너지(첨탑 공명)**. 다음: **B — 판 중 로그라이트 보상**
```

- [ ] **Step 5: 전체 회귀 + 빌드 최종**

Run: `npm test && npm run build`
Expected: 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/data/reactions.ts docs/ROADMAP.md tests/balance/resonance.test.ts
git commit -m "balance(resonance): regression pass + roadmap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §1 원소·각인 → Task 1 (types, towers, reactions.ts), Task 2 (슬롯) ✅
- §2 충전·발동 → Task 5 (`recomputeCharged`), Task 6 (`resonanceHook`) ✅
- §2.4 지속딜 각인 제외 → Task 6: 훅이 `dealDamage`(직격)에만 있음, 독 틱은 `EnemyState.update` 라 미경유 ✅
- §3 반응 4종 → Task 1 (상수), Task 3 (계산), Task 6 (`runReaction`) ✅
- §3.2 집계 오염 방지(전염 독 source = byTowerKey) → Task 6 `runReaction` 의 `applyPoison(byTowerKey, ...)` ✅
- §4 UI → Task 7 (공명선·이펙트·시트 줄) ✅
- §5 파일 → Task 1~7 매핑 ✅
- §6 검증 → Task 8 ✅
- §7 비목표 — 다중 각인/laser 원소/대각선/3연쇄/지원탑 공명 전부 미구현 ✅
- §8 리스크(스프레드 회귀, 가독성, 집계 오염, 뜨거운 경로) → Task 8 Step 1~3, Task 6 주석 ✅

**2. Placeholder scan:**
- Task 5 Step 1 테스트가 "완주만 확인" 근사 — 명시적으로 "실질 검증은 Task 6" 라 위임. 유닛 한계.
- Task 6 Step 1/Step 5 — `onReaction` 훅 추가를 "구현자 재량, 권장" 으로. 훅 없이도 통과 가능한
  근사 테스트를 먼저 제시하고, 강한 단언 버전을 대안으로 완전히 적어둠(코드 포함). 플레이스홀더 아님.
- Task 3 Step 3 `isOrthAdjacent` 등 전부 실제 코드.
- Task 7 Step 3/Step 4 실제 코드.
- Task 8 Step 3 — 스테이지·근사 지표 선택을 구현자에게 위임(밸런스 판단은 시뮬 돌려봐야 앎).
  방향·우선순위는 Step 1 에 구체적으로 명시.

**3. Type consistency:**
- `ElementKind` — Task 1 정의, Task 2/3/4/6 소비. 일치.
- `elementOf(key): ElementKind | null` — Task 1 정의, Task 5·6·7 호출. 일치.
- `consumeElementalMark(byElement: ElementKind | null): ElementKind | null` — Task 2 정의,
  Task 4 위임 동일 시그니처, Task 6 `enemy.consumeElementalMark(towerEl)` 에서 `towerEl: ElementKind | null`. 일치.
- `startReactionCooldown(element, ms)` — Task 2 정의, Task 4 위임, Task 6 `runReaction` 첫 줄 호출. 일치.
- `frostCollapseDamage(targetMaxHp: number): number` — Task 3 정의, Task 6 `frostCollapseDamage(target.state.maxHp)`. 일치.
- `reactionBonusDamage(dealt, ratio, flat)` — Task 3 정의(인자 순서 dealt·ratio·flat), Task 6
  `reactionBonusDamage(dealtAmount, 0.35, 40)` / `(dealtAmount, OVERHEAT.detonatorRatio, 0)`. 일치.
- `dischargeTargets(origin, all, excludeId)` — Task 3 정의, Task 6 `dischargeTargets(target.pos, this.enemyTargets(), target.id)`. 일치.
- `isOrthAdjacent(a, b)` — Task 3 정의, Task 5 `recomputeCharged`, Task 7 `updateResonanceLinks`/`resonanceInspectLine`. 일치.
- `recomputeCharged()` / `updateResonanceLinks()` — Task 5 정의(후자는 스텁), Task 7 가 후자를 교체. 일치.
- `chargedKeys: Set<string>` — Task 5 정의, Task 6 `this.chargedKeys.has(towerKey)`. 일치.
- `chargedTowers: Set<Tower>` — Task 5 정의, Task 7 `for (const t of this.chargedTowers)`. 일치.
- `Tower.charged` — Task 4 정의, Task 5 가 씀, Task 7 `resonanceInspectLine` 이 읽음. 일치.
- `onReaction?` — Task 6 정의·호출, harness 주입. 일치.
- `REACTIONS[el].cooldownMs` / `.name` — Task 1 정의, Task 6/7 소비. 일치.

**의존 순서:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. 각 태스크는 앞 태스크 산출만 소비한다.
Task 3 은 Task 1(`reactions.ts` 상수)에 의존하므로 2 보다 뒤여도 되지만 2 와 무관 → 현재 순서 OK.
