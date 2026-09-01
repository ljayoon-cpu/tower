# 타워 업그레이드 분기 (전투형 6종) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화살·파열·서리·번개·저격·역병 6종이 Lv3에서 두 특화 경로(A/B)로 갈라지고, 머지·강화 시 경로를 고르며, 경로별로 Lv3~5 수치·능력이 다르다.

**Architecture:** `TowerDef.paths.{a,b}`가 Lv3~5 `TowerLevelStats[]`를 갖는다(분기 없는 4종은 `levels` 5개 유지, 무변화). `Tower.path`가 Lv3 도달 시 확정, `Tower.stats()`가 경로별 수치를 돌려준다. 기존 3·5합 능력(빙결·경직·처형·독관통)은 `mergeEffects.ts` 함수 → `TowerLevelStats` 필드로 이관 후 파일 삭제. 경로 선택은 `PathChoiceMenu`(BuildMenu 패턴)로 머지·강화 흐름에 삽입.

**Tech Stack:** Phaser 3, TypeScript strict, Vite, Vitest. 순수 로직은 `src/core`·`src/systems`(phaser 미임포트, `tests/architecture.test.ts` 강제).

**Spec:** [docs/superpowers/specs/2026-09-01-tower-upgrade-branching-design.md](../specs/2026-09-01-tower-upgrade-branching-design.md)

## Global Constraints

- TypeScript strict. `any` 금지(불가피 시 사유 주석). `noUnusedLocals/Parameters` 켜짐.
- `src/core`, `src/systems`는 `phaser`를 import 하지 않는다.
- 시스템은 시간 API를 직접 만지지 않고 `dtMs`를 인자로 받는다.
- 밸런싱 매직넘버는 `src/data/`에만.
- `key`(타워)·`path` 키('a'/'b')는 고정. 경로 `name`만 세계관에 맞춘다.
- 커밋: Conventional Commits, 한 기능 한 커밋. 트레일러 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- 커밋 전 `npm test` + `npm run build` 통과.
- 분기 없는 타워(마광·지휘·연금·창공)와 캠페인 밸런스는 이번 범위에서 **동작·수치 불변**.
- Phase 1 은 **동작 보존 리팩터** — 경로 기본값 'a' 로 기존 3·5합 능력이 픽셀 단위로 동일해야 한다.

---

## File Structure

**수정:**
- `src/core/types.ts` — `TowerPathDef`, `TowerDef.paths?`, `TowerLevelStats` 신규 필드
- `src/data/towers.ts` — 6종 `levels`→2개 + `paths.{a,b}`, 능력 필드 baked-in
- `src/systems/combat.ts` — `executeMultiplier(stats, ratio)`, `pierceLineTargets(...)`
- `src/systems/EnemyState.ts` — `DamagePacket.ignoreShield?`
- `src/systems/MergeController.ts` — `MergeCandidate.path?`, 경로 인지 `canMerge`
- `src/entities/Tower.ts` — `path` 필드, 경로 인지 `stats()`, `setLevel(n, path?)`, `needsPathChoice`
- `src/scenes/Game.ts` — 머지·강화에 경로 선택 삽입, mergeEffects 호출 제거, 경로 B 전투 처리
- `src/core/towerInfo.ts` — `towerInfo(key, level, path?)`, 필드 기반 노트
- `src/core/codex.ts` + `src/scenes/Codex.ts` — 분기 타워 A/B 블록
- `tests/balance/harness.ts` — `merge(from, to, path?)`
- `tests/data/mergeEffects.test.ts` — 삭제 / `tests/data/towerPaths.test.ts` 로 대체
- `tests/core/towerInfo.test.ts`, `tests/data/definitions.test.ts`, `tests/systems/MergeController.test.ts`, `tests/entities/Tower.test.ts`, `tests/systems/combat.test.ts` — 갱신

**생성:**
- `src/ui/PathChoiceMenu.ts`
- `tests/data/towerPaths.test.ts`
- `tests/ui/pathChoice.test.ts` (선택)

**삭제:**
- `src/data/mergeEffects.ts`

---

## Phase 1 — 데이터 모델 + 동작 보존 리팩터

### Task 1: 타입 — TowerPathDef + TowerLevelStats 필드

**Files:**
- Modify: `src/core/types.ts`
- Test: `tests/data/definitions.test.ts` (컴파일 확인)

**Interfaces:**
- Produces:
  - `TowerPathDef { key: 'a'|'b'; name: string; desc: string; levels: TowerLevelStats[] }`
  - `TowerDef.paths?: { a: TowerPathDef; b: TowerPathDef }`
  - `TowerLevelStats` 신규 optional: `freezeHits?`, `freezeDurationMs?`, `freezeCooldownMs?`,
    `staggerDurationMs?`, `staggerCooldownMs?`, `executeHealthRatio?`, `executeDamageMultiplier?`,
    `poisonArmorPierce?`, `poisonSpreadRadius?`, `poisonSpreadRatio?`, `pierceAll?`, `slowAura?`,
    `slowAuraRadius?`, `shieldPierce?`, `burnDps?`, `burnDurationMs?`, `burnRadius?`

- [ ] **Step 1: `TowerLevelStats` 에 필드 추가**

`armorPierce?` 근처, 주석 그룹으로:
```ts
  // --- 머지 3·5합 능력 (경로 stat 으로 이관) ---
  /** 서리탑: freezeHits 회 적중마다 짧게 빙결. */
  freezeHits?: number; freezeDurationMs?: number; freezeCooldownMs?: number;
  /** 번개탑: 적중 시 이동 정지(재발동 대기). */
  staggerDurationMs?: number; staggerCooldownMs?: number;
  /** 저격탑: 체력 executeHealthRatio 이하 적에게 executeDamageMultiplier 배. */
  executeHealthRatio?: number; executeDamageMultiplier?: number;
  /** 역병탑: 독탄 직접 피해가 무시하는 방어력. */
  poisonArmorPierce?: number;

  // --- 경로 B 신규 메커니즘 ---
  /** 역병 B: 중독 적 주변으로 전염(개당 poisonDps × poisonSpreadRatio). */
  poisonSpreadRadius?: number; poisonSpreadRatio?: number;
  /** 저격 B: 투사체가 tower→target 라인의 모든 적을 관통. */
  pierceAll?: boolean;
  /** 서리 B: 투사체 대신 반경 내 상시 감속·소량 피해. */
  slowAura?: boolean; slowAuraRadius?: number;
  /** 번개 B: 방어막을 완전히 무시. */
  shieldPierce?: boolean;
  /** 대포 B: 착탄 지점 지면 화상 장판. */
  burnDps?: number; burnDurationMs?: number; burnRadius?: number;
```

- [ ] **Step 2: `TowerPathDef` + `TowerDef.paths` 추가**

```ts
export interface TowerPathDef {
  key: 'a' | 'b';
  name: string;
  desc: string;
  levels: TowerLevelStats[]; // 정확히 3 = Lv3, Lv4, Lv5
}

export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;
  maxLevel: number;
  targetsGround?: boolean;
  targetsAir?: boolean;
  levels: TowerLevelStats[];
  /** 있으면 분기 타워: levels 는 Lv1~2, Lv3~5 는 paths 에서. */
  paths?: { a: TowerPathDef; b: TowerPathDef };
}
```

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: tsc 통과 (전부 optional, 기존 타워 정의 불변).

- [ ] **Step 4: 커밋**

```bash
git add src/core/types.ts
git commit -m "feat(paths): TowerPathDef + merge-ability stat fields

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: towers.ts 재구조화 + mergeEffects 이관 + 삭제

**Files:**
- Modify: `src/data/towers.ts` (arrow/cannon/frost/bolt/sniper/poison)
- Modify: `src/systems/combat.ts` (add `executeMultiplier`)
- Modify: `src/core/towerInfo.ts` (mergeEffects import 제거, 필드에서 노트)
- Modify: `src/scenes/Game.ts` (4개 호출 → 필드)
- Delete: `src/data/mergeEffects.ts`
- Delete: `tests/data/mergeEffects.test.ts`
- Create: `tests/data/towerPaths.test.ts`
- Modify: `tests/core/towerInfo.test.ts` (변경 없음 예상 — 노트 문자열 동일 유지)

**Interfaces:**
- Consumes: Task 1 필드
- Produces:
  - `combat.executeMultiplier(stats: TowerLevelStats, targetHealthRatio: number): number`
  - 6종 `TowerDef` 가 `levels.length === 2` + `paths.{a,b}` (a = 현행 Lv3~5, b = a 복제)

- [ ] **Step 1: `combat.executeMultiplier` 작성 + 테스트**

`src/systems/combat.ts` 하단:
```ts
import type { TowerLevelStats } from '../core/types';

/** 저격탑 처형: 대상 체력 비율이 executeHealthRatio 이하면 executeDamageMultiplier, 아니면 1. */
export function executeMultiplier(stats: TowerLevelStats, targetHealthRatio: number): number {
  const r = stats.executeHealthRatio;
  const m = stats.executeDamageMultiplier;
  return r != null && m != null && targetHealthRatio <= r ? m : 1;
}
```
`tests/systems/combat.test.ts` 에 추가:
```ts
import { executeMultiplier } from '../../src/systems/combat';
describe('executeMultiplier', () => {
  it('applies the multiplier only within the execute band', () => {
    const s = { executeHealthRatio: 0.3, executeDamageMultiplier: 1.6 } as any;
    expect(executeMultiplier(s, 0.25)).toBe(1.6);
    expect(executeMultiplier(s, 0.5)).toBe(1);
    expect(executeMultiplier({} as any, 0.1)).toBe(1);
  });
});
```

- [ ] **Step 2: 6종 towers.ts 재구조화 (arrow 예시, 동일 패턴 6회)**

`arrow` 현행:
```ts
arrow: {
  key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
  levels: [
    { damage: 8,   range: 150, fireRate: 2.0 },
    { damage: 14,  range: 162, fireRate: 2.2 },
    { damage: 28,  range: 174, fireRate: 2.4, projectileCount: 2, projectileDamageMultiplier: 0.6 },
    { damage: 56,  range: 188, fireRate: 2.7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
    { damage: 113, range: 205, fireRate: 3.0, projectileCount: 3, projectileDamageMultiplier: 0.45 },
  ],
},
```
→ 재구조화 (Phase 1: b = a 복제):
```ts
arrow: {
  key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
  levels: [
    { damage: 8,  range: 150, fireRate: 2.0 },
    { damage: 14, range: 162, fireRate: 2.2 },
  ],
  paths: {
    a: {
      key: 'a', name: '연발형', desc: '멀티샷 — 뭉친 스웜을 여러 발로.',
      levels: [
        { damage: 28,  range: 174, fireRate: 2.4, projectileCount: 2, projectileDamageMultiplier: 0.6 },
        { damage: 56,  range: 188, fireRate: 2.7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
        { damage: 113, range: 205, fireRate: 3.0, projectileCount: 3, projectileDamageMultiplier: 0.45 },
      ],
    },
    b: {
      key: 'b', name: '관통형', desc: '(임시: 연발형과 동일 — Phase 4 에서 확정)',
      levels: [
        { damage: 28,  range: 174, fireRate: 2.4, projectileCount: 2, projectileDamageMultiplier: 0.6 },
        { damage: 56,  range: 188, fireRate: 2.7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
        { damage: 113, range: 205, fireRate: 3.0, projectileCount: 3, projectileDamageMultiplier: 0.45 },
      ],
    },
  },
},
```

**cannon/frost/bolt/sniper/poison 도 같은 패턴.** 이관할 능력 값 (`mergeEffects.ts` 테이블에서
`paths.a.levels[Lv3/4/5 = index 0/1/2]` 필드로):
- `frost` a.levels: Lv3 `freezeHits:3, freezeDurationMs:350, freezeCooldownMs:4000` /
  Lv4 동일 / Lv5 `freezeHits:3, freezeDurationMs:700, freezeCooldownMs:3000`
- `bolt` a.levels: Lv3 `staggerDurationMs:120, staggerCooldownMs:1800` / Lv4 동일 /
  Lv5 `staggerDurationMs:250, staggerCooldownMs:1800`
- `sniper` a.levels: Lv3 `executeHealthRatio:0.3, executeDamageMultiplier:1.6` / Lv4 동일 /
  Lv5 `executeHealthRatio:0.4, executeDamageMultiplier:2.2`
- `poison` a.levels: Lv3 `poisonArmorPierce:8` / Lv4 `8` / Lv5 `15`
- `cannon` a.levels: 이미 `armorBreakPercent/armorBreakDurationMs` 필드로 있음 — 그대로.
- `arrow` a.levels: 이미 `projectileCount` 필드 — 그대로.

각 타워 `b` = `a` 의 `levels` 만 복제, `name: '(임시)'`, `desc: '(임시: Phase 4)'`.

- [ ] **Step 3: `towerInfo.ts` — mergeEffects import 제거, 필드에서 노트**

`noteOf` 는 `stats`(경로 반영된 `TowerLevelStats`)에서 직접:
```ts
  if (attack === 'slow') {
    const slow = `감속 ${Math.round((1 - (stats.slowMul ?? 1)) * 100)}%`;
    return stats.freezeHits != null
      ? `${slow} · ${stats.freezeHits}타 빙결 ${(stats.freezeDurationMs ?? 0) / 1000}초`
      : slow;
  }
  if (attack === 'chain') {
    const chain = `연쇄 ${(stats.chainTargets ?? 0) + 1}타`;
    return stats.staggerDurationMs != null
      ? `${chain} · 경직 ${stats.staggerDurationMs / 1000}초` : chain;
  }
  if (attack === 'poison') {
    const poison = `독 지속 ${stats.poisonDps ?? 0}/초`;
    return stats.poisonArmorPierce != null
      ? `${poison} · 방어 무시 ${stats.poisonArmorPierce}` : poison;
  }
  if (attack === 'single' && key === 'sniper') {
    return stats.executeHealthRatio != null
      ? `체력 ${Math.round(stats.executeHealthRatio * 100)}% 이하 처형 ×${stats.executeDamageMultiplier}` : '';
  }
```
`towerInfo(key, level)` 의 `stats` 선택: `level <= 2 || !def.paths ? def.levels[lv-1] : def.paths.a.levels[lv-3]`
(Task 6 에서 `path` 인자 추가; 지금은 a 고정).

- [ ] **Step 4: `Game.ts` — 4개 호출 교체**

- `boltStaggerEffect(tower.level)` → `s.staggerDurationMs != null ? { durationMs: s.staggerDurationMs, cooldownMs: s.staggerCooldownMs ?? 1800 } : undefined` (또는 인라인 `e.applyStagger(s.staggerDurationMs, s.staggerCooldownMs)` 가드).
- `poisonArmorPierceEffect(tower.level)?.armorPierce ?? 0` → `s.poisonArmorPierce ?? 0`
- `sniperDamageMultiplier(tower.level, e.healthRatio)` → `executeMultiplier(s, e.healthRatio)` (combat.ts import)
- `frostFreezeEffect(tower.level)` → `s.freezeHits != null ? { hits: s.freezeHits, durationMs: s.freezeDurationMs ?? 0, cooldownMs: s.freezeCooldownMs ?? 4000 } : undefined`

`import` 줄 19-20 (mergeEffects) 제거, `executeMultiplier` 를 combat import 에 추가.

- [ ] **Step 5: `mergeEffects.ts` + `mergeEffects.test.ts` 삭제, `towerPaths.test.ts` 생성**

```ts
import { TOWERS, TOWER_KEYS } from '../../src/data/towers';

const BRANCHED = ['arrow', 'cannon', 'frost', 'bolt', 'sniper', 'poison'];

describe('tower paths', () => {
  it('branched towers keep Lv1~2 shared and Lv3~5 in both paths', () => {
    for (const key of BRANCHED) {
      const def = TOWERS[key];
      expect(def.levels).toHaveLength(2);
      expect(def.paths).toBeDefined();
      for (const p of ['a', 'b'] as const) {
        expect(def.paths![p].levels).toHaveLength(3);
        expect(def.paths![p].key).toBe(p);
        // 성장 단조성
        expect(def.paths![p].levels[2].damage).toBeGreaterThan(def.paths![p].levels[0].damage);
      }
    }
  });

  it('non-branched towers keep the flat 5-level shape', () => {
    for (const key of TOWER_KEYS) {
      if (BRANCHED.includes(key)) continue;
      expect(TOWERS[key].levels).toHaveLength(TOWERS[key].maxLevel);
      expect(TOWERS[key].paths).toBeUndefined();
    }
  });
});
```

- [ ] **Step 6: 전체 회귀 — 동작 불변 확인**

Run: `npm test && npm run build`
Expected: `mergeEffects.test.ts` 제거분 빼고 전부 PASS. `towerInfo.test.ts` 문자열 동일.
`balance.test.ts`/`monoTower.test.ts` 수치 동일(경로 a = 현행). 실패 시 이관 값 대조.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(paths): absorb merge abilities into path-a stats, drop mergeEffects.ts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Tower 엔티티 — path / stats() / setLevel / needsPathChoice

**Files:**
- Modify: `src/entities/Tower.ts`
- Modify: `tests/entities/Tower.test.ts`

**Interfaces:**
- Consumes: Task 1·2
- Produces:
  - `Tower.path: 'a' | 'b' | null`
  - `Tower.stats(): TowerLevelStats` — 경로 반영
  - `Tower.setLevel(n: number, path?: 'a' | 'b'): void`
  - `Tower.needsPathChoice: boolean` (getter)

- [ ] **Step 1: 실패 테스트**

`tests/entities/Tower.test.ts` (가짜 씬은 기존 재사용):
```ts
it('branches at Lv3: stats come from the chosen path', () => {
  const t = makeTower('bolt');           // 헬퍼가 없으면 new Tower(fakeScene, 'bolt', {col:0,row:0}, {x:0,y:0})
  expect(t.path).toBeNull();
  t.setLevel(2);
  expect(t.needsPathChoice).toBe(true);
  t.setLevel(3, 'b');
  expect(t.path).toBe('b');
  expect(t.level).toBe(3);
  expect(t.stats()).toBe(getTower('bolt').paths!.b.levels[0]);
  t.setLevel(4);                          // 경로 유지
  expect(t.stats()).toBe(getTower('bolt').paths!.b.levels[1]);
});
it('non-branched tower ignores path', () => {
  const t = makeTower('laser');
  t.setLevel(3);
  expect(t.path).toBeNull();
  expect(t.stats()).toBe(getTower('laser').levels[2]);
  expect(t.needsPathChoice).toBe(false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/entities/Tower.test.ts`
Expected: FAIL — `path`/`needsPathChoice` 미정의.

- [ ] **Step 3: Tower.ts 구현**

```ts
  path: 'a' | 'b' | null = null;

  stats(): TowerLevelStats {
    const def = getTower(this.key);
    if (this.level <= 2 || !def.paths || !this.path) return def.levels[this.level - 1];
    return def.paths[this.path].levels[this.level - 3];
  }

  get needsPathChoice(): boolean {
    const def = getTower(this.key);
    return !!def.paths && this.level === 2 && !this.path;
  }

  setLevel(n: number, path?: 'a' | 'b'): void {
    const clamped = Math.min(Math.max(n, 1), this.maxLevel);
    const def = getTower(this.key);
    if (clamped >= 3 && def.paths && !this.path) this.path = path ?? 'a';
    this.level = clamped;
    // (기존 setLevel 본문의 스프라이트/스케일/데이터 갱신 유지)
    if (this.path === 'b') { const s = this.sprite as Phaser.GameObjects.Image & { setTint?: (c: number) => unknown }; s.setTint?.(0xffd9a0); }
  }
```
주의: `def.levels[this.level - 1]` 는 분기 타워 Lv3+ 에서 undefined (길이 2). 그래서 `!this.path`
가드가 필수 — Lv3+ 인데 path 없으면 데이터 버그. `setLevel` 에서 항상 path 를 채우므로
정상 경로에선 안 걸리지만, 방어적으로 `stats()` 에서 `this.level >= 3 && !this.path` 면
`def.paths.a.levels[this.level-3]` 폴백.

- [ ] **Step 4: 통과 + 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 신규 PASS. 기존 Tower/balance/monoTower — path 미지정 시 setLevel 이 'a' 채우므로 동일.

- [ ] **Step 5: 커밋**

```bash
git add src/entities/Tower.ts tests/entities/Tower.test.ts
git commit -m "feat(paths): Tower.path + path-aware stats()/setLevel/needsPathChoice

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 2 — 머지 규칙 + 경로 선택 UI

### Task 4: MergeController 경로 인지

**Files:**
- Modify: `src/systems/MergeController.ts`
- Modify: `tests/systems/MergeController.test.ts`

**Interfaces:**
- Produces: `MergeCandidate { id; key; level; path?: 'a' | 'b' | null }`, `canMerge` 가 Lv3+ 동경로만 허용.

- [ ] **Step 1: 실패 테스트**

```ts
const at = (level: number, path: 'a'|'b'|null = null, id = 1) => ({ id, key: 'bolt', level, path });
it('Lv2 이하는 경로 무관, Lv3+ 는 같은 경로만', () => {
  expect(canMerge(at(2, null, 1), at(2, null, 2), 5)).toBe(true);
  expect(canMerge(at(3, 'a', 1), at(3, 'a', 2), 5)).toBe(true);
  expect(canMerge(at(3, 'a', 1), at(3, 'b', 2), 5)).toBe(false);
  expect(canMerge(at(5, 'a', 1), at(5, 'a', 2), 5)).toBe(false); // 캡
});
```

- [ ] **Step 2: 실패 확인 / Step 3: 구현**

```ts
export interface MergeCandidate { id: number; key: string; level: number; path?: 'a' | 'b' | null; }

export function canMerge(a: MergeCandidate, b: MergeCandidate, maxLevel: number): boolean {
  return (
    a.id !== b.id && a.key === b.key && a.level === b.level && a.level < maxLevel
    && ((a.path ?? null) === (b.path ?? null))
  );
}
```
(Lv2 이하는 양쪽 path 가 null 이라 자동 통과.)

- [ ] **Step 4: 통과 + 회귀** — `npm test`. `Game.ts` 의 `MergeCandidate` 리터럴에 `path` 없어도
optional 이라 통과하지만, Task 6 에서 채운다.

- [ ] **Step 5: 커밋**

```bash
git add src/systems/MergeController.ts tests/systems/MergeController.test.ts
git commit -m "feat(paths): canMerge requires matching path at Lv3+

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: PathChoiceMenu UI

**Files:**
- Create: `src/ui/PathChoiceMenu.ts`
- Modify: `tests/balance/harness.ts` (가짜 씬에 필요한 add 메서드 — 대개 이미 있음)

**Interfaces:**
- Produces: `class PathChoiceMenu { constructor(scene); open(towerKey: string, at: {x:number;y:number}, onPick: (p:'a'|'b')=>void): void; close(): void; get isOpen(): boolean; destroy(): void }`

- [ ] **Step 1: 구현 (BuildMenu 패턴 축소판)**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { getTower } from '../data/towers';
import { audioFor } from './audio';
import { attachPressFeedback } from './interactionFeedback';

const CARD_W = 200;
const CARD_H = 150;
const GAP = 14;

export class PathChoiceMenu {
  private container: Phaser.GameObjects.Container;
  private visible = false;
  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(510).setVisible(false);
  }
  open(towerKey: string, at: { x: number; y: number }, onPick: (p: 'a' | 'b') => void): void {
    this.container.removeAll(true);
    const def = getTower(towerKey);
    if (!def.paths) { onPick('a'); return; }
    const audio = audioFor(this.scene);
    const w = CARD_W * 2 + GAP + 24;
    const h = CARD_H + 64;
    this.container.add(this.scene.add.rectangle(0, 0, w, h, 0x0b0c16, 0.97).setStrokeStyle(2, 0x66ccff));
    this.container.add(this.scene.add.text(0, -h / 2 + 18, `${def.name} — 경로 선택`, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#f2f2f7',
    }).setOrigin(0.5));
    (['a', 'b'] as const).forEach((p, i) => {
      const cx = (i === 0 ? -1 : 1) * (CARD_W + GAP) / 2;
      const path = def.paths![p];
      const card = this.scene.add.rectangle(cx, 12, CARD_W, CARD_H, 0x1b1d33).setStrokeStyle(2, 0x2f3350)
        .setInteractive({ useHandCursor: true });
      const name = this.scene.add.text(cx, 12 - CARD_H / 2 + 18, path.name, {
        fontFamily: 'monospace', fontSize: '19px', fontStyle: 'bold', color: '#ffcc44',
      }).setOrigin(0.5);
      const l5 = path.levels[2];
      const desc = this.scene.add.text(cx, 12, `${path.desc}\n\nLv5  DPS ${Math.round((l5.damage) * (l5.fireRate) * ((l5.projectileCount ?? 1) * (l5.projectileDamageMultiplier ?? 1)))}\n사거리 ${l5.range}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#cdd6f4', align: 'center',
        wordWrap: { width: CARD_W - 20 },
      }).setOrigin(0.5);
      attachPressFeedback(this.scene, card, [card, name], audio, () => { this.close(); onPick(p); });
      this.container.add([card, name, desc]);
    });
    const px = Phaser.Math.Clamp(at.x, w / 2 + 8, GAME_WIDTH - w / 2 - 8);
    const py = Phaser.Math.Clamp(at.y, h / 2 + 150, GAME_HEIGHT - h / 2 - 10);
    this.container.setPosition(px, py).setVisible(true);
    this.visible = true;
  }
  close(): void { this.container.setVisible(false); this.visible = false; }
  get isOpen(): boolean { return this.visible; }
  destroy(): void { this.container.destroy(); }
}
```

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: tsc 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/ui/PathChoiceMenu.ts
git commit -m "feat(paths): PathChoiceMenu overlay

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Game.ts — 머지·강화에 경로 선택 삽입

**Files:**
- Modify: `src/scenes/Game.ts`
- Modify: `src/core/towerInfo.ts` (`path` 인자)
- Modify: `tests/balance/harness.ts` (`merge(from, to, path?)`)
- Modify: `tests/balance/monoTower.test.ts`, `tests/balance/balance.test.ts` (전략이 'a' 명시)

**Interfaces:**
- Consumes: Task 3·4·5
- Produces:
  - `Game` 필드 `pathMenu: PathChoiceMenu`
  - `towerInfo(key, level, path?: 'a'|'b'|null)`
  - harness `merge(from, to, path: 'a'|'b' = 'a')`

- [ ] **Step 1: `Game.create` 에 `this.pathMenu = new PathChoiceMenu(this)` (buildMenu 옆). `removeTower`/`endStage` 정리에 `pathMenu.close()`.**

- [ ] **Step 2: 골드 강화 (`tryUpgradeSelected`)**

```ts
  private tryUpgradeSelected(): void {
    const tower = this.selectedTower;
    if (!this.running || this.paused || !tower || !this.towers.includes(tower)) return;
    if (tower.level >= tower.maxLevel) return;
    const cost = upgradeCost(getTower(tower.key), tower.level);
    if (this.eco.gold < cost) { this.audio.play('click'); return; }
    const finish = (path?: 'a' | 'b') => {
      if (!this.eco.spend(cost)) { this.audio.play('click'); return; }
      tower.setLevel(tower.level + 1, path);
      this.mergePop(tower); this.audio.play('merge');
      if (tower.rangeVisible) tower.showRange(true);
      this.showInspect(tower);
    };
    if (tower.needsPathChoice) {
      this.pathMenu.open(tower.key, this.cameraToScreen(tower.homePos), finish);
    } else finish();
  }
```
(`cameraToScreen` 없으면 `tower.homePos` 그대로 — 씬 좌표계니 OK.)

- [ ] **Step 3: 머지 (`dragend`)**

`canMerge` 통과 블록에서, 결과가 Lv3 이고 `targetTower.needsPathChoice` 면:
```ts
          if (canMerge(a, b, dragged.maxLevel)) {
            const doMerge = (path?: 'a' | 'b') => {
              const sourceVisual = { origin: { ...dragged.homePos }, texture: `tower_${dragged.key}`,
                scale: dragged.sprite.scale, rotation: dragged.sprite.rotation };
              targetTower.setLevel(mergeResultLevel(targetTower.level), path);
              this.grid.release(dragged.tile);
              this.removeTower(dragged);
              this.snapHome(targetTower);
              this.mergeFeedback(sourceVisual.origin, sourceVisual.texture, sourceVisual.scale, sourceVisual.rotation, targetTower);
              this.advanceTutorial('merged');
            };
            if (targetTower.needsPathChoice) {
              this.snapHome(dragged); // 선택 중 원위치
              this.pathMenu.open(targetTower.key, targetTower.homePos, doMerge);
            } else doMerge();
            return;
          }
```
`MergeCandidate` 리터럴에 `path: dragged.path` / `path: targetTower.path` 추가.
`showMergeHints` 의 `MergeCandidate` 도 `path` 채움.

- [ ] **Step 4: `towerInfo(key, level, path?)` + `showInspect` 가 `tower.path` 전달**

`towerInfo` 시그니처에 `path?: 'a'|'b'|null` 추가, `stats` 선택:
```ts
const usePathLevels = lv >= 3 && def.paths;
const stats = usePathLevels ? def.paths![(path ?? 'a')].levels[lv - 3] : def.levels[Math.min(lv, def.levels.length) - 1];
```
`Game.showInspect`: `towerInfo(tower.key, tower.level, tower.path)`.
정보 패널 이름 줄에 경로명: `${info.name}${tower.path ? ' · ' + getTower(tower.key).paths![tower.path].name : ''} Lv${info.level}`.

- [ ] **Step 5: harness `merge` + 밸런스 전략**

`tests/balance/harness.ts`:
```ts
      merge(from, to, path: 'a' | 'b' = 'a') {
        if (!game.towers.includes(from) || !game.towers.includes(to) || !canMerge(
          { id: from.id, key: from.key, level: from.level, path: from.path },
          { id: to.id, key: to.key, level: to.level, path: to.path }, from.maxLevel)) throw Error('illegal merge');
        actions.push(`merge ${from.key} L${from.level}${to.level + 1 === 3 ? ' ->' + path : ''}`);
        to.setLevel(to.level + 1, path);
        game.grid.release(from.tile); game.removeTower(from);
      },
```
`StrategyContext.merge` 타입에 `path?: 'a'|'b'` 추가. `monoTower`/`mergeArmy` 는 `c.merge(x, y)`
그대로(기본 'a').

- [ ] **Step 6: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS. 밸런스 시뮬은 경로 'a' 고정이라 수치 동일.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat(paths): path choice on merge/upgrade at Lv3

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 3 — 경로 B 전투 메커니즘

### Task 7: EnemyState ignoreShield + combat pierceLineTargets

**Files:**
- Modify: `src/systems/EnemyState.ts`
- Modify: `src/systems/combat.ts`
- Modify: `tests/systems/EnemyState.test.ts`, `tests/systems/combat.test.ts`

**Interfaces:**
- Produces:
  - `DamagePacket.ignoreShield?: boolean` — true 면 방어막을 건너뛰고 체력에 바로.
  - `combat.pierceLineTargets(origin: Vec2, target: Vec2, enemies: Targetable[], bandWidth: number): Targetable[]` — origin→target 방향 반직선에서 `bandWidth` 이내 살아있는 적, 진행 순.

- [ ] **Step 1: `EnemyState.applyDamage` 에 `ignoreShield`**

`applyDamage` 에서 방어막 흡수 전에:
```ts
    if (packet.ignoreShield) {
      // 방어막 무시: 전량 체력으로
    } else if (this.shield > 0) { /* 기존 방어막 흡수 */ }
```
테스트: 방어막 90 짜리에 `{ amount: 50, ignoreShield: true }` → 체력 50 감소, 방어막 그대로.

- [ ] **Step 2: `combat.pierceLineTargets`**

```ts
export function pierceLineTargets(
  origin: Vec2, target: Vec2, enemies: Targetable[], bandWidth: number,
): Targetable[] {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const half = bandWidth / 2;
  return enemies
    .filter((e) => {
      if (!e.alive) return false;
      const rx = e.pos.x - origin.x, ry = e.pos.y - origin.y;
      const along = rx * ux + ry * uy;             // 라인 진행 거리
      const perp = Math.abs(rx * uy - ry * ux);    // 라인에서 수직 거리
      return along >= -8 && perp <= half;
    })
    .sort((a, b) => {
      const aa = (a.pos.x - origin.x) * ux + (a.pos.y - origin.y) * uy;
      const bb = (b.pos.x - origin.x) * ux + (b.pos.y - origin.y) * uy;
      return aa - bb;
    });
}
```
테스트: 세 적을 일직선에 놓고 전부 반환·순서 확인, 밴드 밖 적 제외.

- [ ] **Step 3: 통과 + 회귀 + 빌드 / Step 4: 커밋**

```bash
git add -A
git commit -m "feat(paths): ignoreShield damage + pierce-line target selection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Game.updateTowers — 경로 B 처리 5종

**Files:**
- Modify: `src/scenes/Game.ts`

**Interfaces:**
- Consumes: Task 7 (`pierceLineTargets`, `ignoreShield`), `stats` 필드 `pierceAll`/`slowAura`/`slowAuraRadius`/`shieldPierce`/`burnDps`/`burnDurationMs`/`burnRadius`/`poisonSpreadRadius`/`poisonSpreadRatio`

- [ ] **Step 1: `slowAura` (서리 B) — `updateTowers` 최상단 분기**

`def.attack === 'support'`/`'beam'` 처럼, `const s = this.effectiveStats(tower); if (s.slowAura) { ... continue; }`:
매 프레임 `enemiesInRadius(tower.homePos, s.slowAuraRadius ?? 0, eligible)` 전부에
`e.applySlow(s.slowMul ?? 1, 200)` + `e.takeDamage({ amount: s.damage * dtMs / 1000, kind: 'slow' }, false)`.
연출: 반경 링 1개(`tower` 에 보관), 쿨다운 없음.

- [ ] **Step 2: `pierceAll` (저격 B)**

generic 발사에서 `s.pierceAll` 면 단일 표적 대신:
```ts
      if (s.pierceAll && enemy) {
        this.fireProjectile(tower.homePos, {
          speed: 900, textureKey: PROJECTILE_TEXTURE[tower.key],
          targetPos: () => (enemy.alive ? enemy.renderPos : null),
          onHit: () => {
            for (const hit of pierceLineTargets(tower.homePos, enemy.renderPos, eligible, TILE * 0.9)) {
              const e = this.enemies.find((x) => x.id === hit.id);
              if (!e) continue;
              const airMul = e.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
              e.takeDamage({ amount: s.damage * airMul, armorPierce: s.armorPierce ?? 0, kind: 'single' });
              this.impactFlash(e.renderPos, COLORS.sniper, 'light');
            }
            this.startHitstop();
          },
        });
        continue;
      }
```

- [ ] **Step 3: `shieldPierce` (번개 B)**

chain 분기 진입 전 체크, 또는 chain onHit 에서 `chainTargets === 0` 이면 단일 강타:
`e.takeDamage({ amount: dmg * airMul, kind: 'chain', ignoreShield: s.shieldPierce })`.
`shieldPierce` 면 모든 `takeDamage` 에 `ignoreShield: true`.

- [ ] **Step 4: `burnDps` (대포 B)**

splash `onHit` 끝에 `s.burnDps` 면 `enemiesInRadius(hitPos, s.burnRadius ?? s.splashRadius ?? 0, this.enemies, layers)`
전부에 `affected?.applyPoison(s.burnDps, s.burnDurationMs ?? 1400)` (독 재사용) + 주황 `impactFlash`.

- [ ] **Step 5: `poisonSpread` (역병 B)**

poison `onHit` 의 `enemiesInRadius` 루프 안, 각 중독 대상에 대해 `s.poisonSpreadRadius` 면
그 대상 주변 `enemiesInRadius(hit.pos, s.poisonSpreadRadius, this.enemies)` 에도
`applyPoison(s.poisonDps * (s.poisonSpreadRatio ?? 0.5), s.poisonDurationMs ?? 0)`.

- [ ] **Step 6: 회귀 + 빌드 + 커밋**

경로 a 는 이 필드들이 없어 전부 no-op → 기존 테스트 불변.
```bash
git add src/scenes/Game.ts
git commit -m "feat(paths): path-B combat — slowAura/pierceAll/shieldPierce/burn/poisonSpread

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 4 — 경로 B 콘텐츠 + 밸런스 + 도감

### Task 9: 6종 경로 B 수치 확정 + 이름 + 도감 A/B

**Files:**
- Modify: `src/data/towers.ts` (6종 `paths.b` — 스펙 §5)
- Modify: `src/core/codex.ts`, `src/scenes/Codex.ts`
- Modify: `docs/world.md` (경로 이름 표)

**Interfaces:**
- Consumes: Task 1·8 필드
- Produces: 6종 `paths.b.levels` = 스펙 §5 방향의 실제 수치, `paths.a/b.name` 확정.

- [ ] **Step 1: `paths.a` 이름 확정** (Phase 1 에서 임시였던 것)

| 타워 | A 이름 | B 이름 |
|---|---|---|
| arrow | 연발형 | 관통형 |
| cannon | 제압형 | 융단형 |
| frost | 빙결형 | 냉기장형 |
| bolt | 과부하형 | 직격형 |
| sniper | 처형형 | 관통형(레일건) |
| poison | 부식형 | 역병확산형 |

- [ ] **Step 2: `paths.b.levels` 채우기 (스펙 §5, Lv3/4/5)**

- **arrow B 관통형**: `{ damage: 50, range: 218, fireRate: 2.2, armorPierce: 4 }` /
  `{ damage: 100, range: 235, fireRate: 2.3, armorPierce: 7 }` /
  `{ damage: 200, range: 256, fireRate: 2.4, armorPierce: 12, executeHealthRatio: 0.25, executeDamageMultiplier: 1.5 }`
- **cannon B 융단형**: `{ damage: 47, range: 146, fireRate: 1.3, splashRadius: 84, burnDps: 10, burnDurationMs: 1400, burnRadius: 84 }` /
  `{ damage: 92, range: 154, fireRate: 1.4, splashRadius: 96, burnDps: 18, burnDurationMs: 1400, burnRadius: 96 }` /
  `{ damage: 180, range: 164, fireRate: 1.5, splashRadius: 112, burnDps: 34, burnDurationMs: 1400, burnRadius: 112 }`
- **frost B 냉기장형**: `{ damage: 6, range: 162, fireRate: 1.0, slowMul: 0.55, slowDurationMs: 400, slowAura: true, slowAuraRadius: 150 }` /
  `{ damage: 12, range: 172, fireRate: 1.0, slowMul: 0.5, slowDurationMs: 400, slowAura: true, slowAuraRadius: 165 }` /
  `{ damage: 24, range: 184, fireRate: 1.0, slowMul: 0.42, slowDurationMs: 400, slowAura: true, slowAuraRadius: 185 }`
- **bolt B 직격형**: `{ damage: 55, range: 196, fireRate: 2.6, chainTargets: 0, shieldPierce: true }` /
  `{ damage: 106, range: 209, fireRate: 2.8, chainTargets: 0, shieldPierce: true }` /
  `{ damage: 202, range: 225, fireRate: 3.0, chainTargets: 0, shieldPierce: true }`
- **sniper B 레일건**: `{ damage: 156, range: 302, fireRate: 0.77, armorPierce: 7, pierceAll: true }` /
  `{ damage: 312, range: 321, fireRate: 0.84, armorPierce: 10, pierceAll: true }` /
  `{ damage: 624, range: 340, fireRate: 0.92, armorPierce: 14, pierceAll: true }`
- **poison B 역병확산형**: `{ damage: 7, range: 168, fireRate: 1.5, poisonDps: 20, poisonDurationMs: 1800, poisonRadius: 68, poisonSpreadRadius: 60, poisonSpreadRatio: 0.55 }` /
  `{ damage: 13, range: 180, fireRate: 1.6, poisonDps: 36, poisonDurationMs: 2000, poisonRadius: 78, poisonSpreadRadius: 72, poisonSpreadRatio: 0.55 }` /
  `{ damage: 24, range: 192, fireRate: 1.7, poisonDps: 64, poisonDurationMs: 2200, poisonRadius: 90, poisonSpreadRadius: 88, poisonSpreadRatio: 0.55 }`

또한 **`paths.a` 를 스펙 §5 A 방향으로 살짝 조정** (기존값 = 계승, 여기서 "강화 방향"만):
- frost A: `freezeHits` 3→2 (Lv3~5), `freezeDurationMs` 700/900/1100.
- sniper A: `executeHealthRatio` 0.35/0.4/0.5, `executeDamageMultiplier` 1.8/2.2/3.0.
- bolt A: `chainTargets +1`, `staggerDurationMs` 250/300/400.
- poison A: `poisonArmorPierce` 10/12/18, `poisonDps` +30%.
- arrow A: `projectileCount` 3/3/4.
- cannon A: `armorBreakPercent` 0.2/0.2/0.35, `splashRadius` +20%.

- [ ] **Step 3: 도감 A/B 표시**

`codex.ts` `towerCard(key)` 에 `paths?: { a: {...}, b: {...} }` — 각 경로 name/desc/Lv5 요약.
`Codex.ts` `towerCardObjects` — 분기 타워면 role 줄 아래에 A/B 두 줄(경로명 + desc + Lv5 DPS).
카드 높이 `TOWER_CARD_H` 196→232.

- [ ] **Step 4: `docs/world.md`** — "마법 첨탑" 표 아래 경로 표 추가 (Step 1 표).

- [ ] **Step 5: 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: `towerPaths.test.ts` 단조성 통과(b Lv5 dmg > b Lv3 dmg). `monoTower`/`balance` 는
경로 a 고정이므로 a 조정분만 반영 — invariant 재확인, 깨지면 Task 10 에서.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(paths): path-B content for the 6 combat towers + codex A/B

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: 밸런스 패스 — A vs B, invariant 재확인

**Files:**
- Modify: `src/data/towers.ts` (조정), `tests/balance/monoTower.test.ts`, `tests/balance/balance.test.ts`
- Temp: `tests/balance/paths.scratch.test.ts` (측정, 커밋 안 함)

- [ ] **Step 1: `monoTower.test.ts` — A·B 매트릭스**

`for (const key of combatKeys) for (const path of getTower(key).paths ? ['a','b'] : [null])` 로
`monoTower(key, path)` 시뮬. `monoTower` 전략에 `path` 인자 추가(`make` 시 `c.merge(f, t, path)`).
Invariant:
1. 각 전투탑은 A·B 어느 쪽으로든 1-1 솔로 가능 (지원형·창공탑 제외 기존대로).
2. 후반 3스테이지: A·B 통틀어 ≤1 타워만 3/3 솔로, 그것도 ≤1별.
3. 화살탑(A·B 둘 다) 로는 피날레 못 깸.

- [ ] **Step 2: 스크래치로 A vs B 우열 측정**

`paths.scratch.test.ts` — `mergeArmy(['sniper','cannon','bolt','frost','poison'], 5)` 를
전부 A / 전부 B / 혼합으로 각 스테이지·무한 시뮬. 한 경로가 다른 경로를 모든 상황에서
압도하면(웨이브 도달 +5 이상 꾸준히) 그 경로 수치 하향.

- [ ] **Step 3: 조정** — 한 번에 하나씩. "경로는 트레이드오프지 상향 아님." 스펙 §6.

- [ ] **Step 4: 스크래치 삭제 + 전체 회귀 + 빌드**

```bash
rm tests/balance/paths.scratch.test.ts
npm test && npm run build
```

- [ ] **Step 5: 커밋 (조정 있었으면)**

```bash
git add -A
git commit -m "balance(paths): tune A/B so neither path dominates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 5 — 검증

### Task 11: 브라우저 검증 + ROADMAP

- [ ] **Step 1: dev 서버, 1-3 진입.** 화살탑 2기 → 머지 → Lv3 선택창(연발형/관통형) 확인.
- [ ] **Step 2:** 관통형 선택 → 정보 패널 "화살탑 · 관통형 Lv3", 사격이 관통(여러 적)인지.
- [ ] **Step 3:** 다른 타워 골드 강화로 Lv2→Lv3 → 선택창. Lv3A + Lv3B 드래그 → 머지 안 되고 자리 교체.
- [ ] **Step 4:** 서리 냉기장형 = 반경 상시 감속 링. 번개 직격형 = 역장 보병 방어막 무시.
      저격 레일건 = 라인 관통. 대포 융단형 = 착탄 후 장판. 역병 확산형 = 스웜 연쇄.
- [ ] **Step 5:** 도감 → 분기 타워 카드에 A/B 블록. `read_console_messages` 에러 없음.
- [ ] **Step 6:** 스크린샷 증빙 + 사용자 보고. `docs/ROADMAP.md` "완료" 에 타워 경로 분기 한 줄.
- [ ] **Step 7:**
```bash
git add -A && git commit -m "docs: roadmap — tower upgrade branching shipped

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- §1 데이터 모델 → Task 1·2. ✅
- §1 mergeEffects 삭제·이관 → Task 2. ✅
- §2 Tower 엔티티 → Task 3. ✅
- §3 경로 선택 흐름·UI → Task 4(규칙)·5(UI)·6(배선). ✅
- §4 전투·정보·도감 → Task 6(정보)·8(전투)·9(도감). ✅
- §5 6종 경로 설계 → Task 2(a 골격)·9(b 콘텐츠·a 조정). ✅
- §6 테스트·밸런스 → Task 2·3·4·7 테스트, Task 10 밸런스. ✅
- §7 비목표(4종 미분기, 3경로, 재선택, 전용시트) → 계획에 없음. ✅

**Placeholder scan:** Phase 1 의 `paths.b = a 복제` 는 의도된 임시(Task 9 에서 실제 수치).
Task 9 §5 수치는 구체값 제공(밸런스 데이터는 Task 10 시뮬로 확정 — AGENTS.md 정상 워크플로).
"임시" 문자열은 towers.ts Phase 1 단계에만, Task 9 Step 1·2 에서 전부 교체. 승인된 접근.

**Type consistency:**
- `Tower.path: 'a'|'b'|null` — Task 3 정의, Task 6 harness/Game 에서 사용. ✅
- `setLevel(n, path?)` — Task 3, Task 6 에서 호출. ✅
- `needsPathChoice` getter — Task 3, Task 6. ✅
- `MergeCandidate.path?` — Task 4, Task 6 리터럴. ✅
- `TowerPathDef` / `TowerDef.paths` — Task 1, Task 2·3·9 소비. ✅
- `combat.executeMultiplier(stats, ratio)` — Task 2 정의, Task 6(Game) 소비. ✅
- `combat.pierceLineTargets(origin, target, enemies, bandWidth)` — Task 7 정의, Task 8 소비. ✅
- `DamagePacket.ignoreShield?` — Task 7 정의, Task 8 소비. ✅
- `PathChoiceMenu.open(towerKey, at, onPick)` — Task 5 정의, Task 6 소비. ✅
- `towerInfo(key, level, path?)` — Task 6 확장, Codex/Game 소비. ✅
- harness `merge(from, to, path='a')` — Task 6, monoTower/mergeArmy 기본값 사용. ✅
