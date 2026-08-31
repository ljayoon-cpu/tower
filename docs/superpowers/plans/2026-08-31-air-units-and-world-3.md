# 공중 유닛 + 대공탑 + 월드 3 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공중 이동 레이어 + 대공 전용 타워(창공탑) + 월드 3(3-1~3-7)를 추가한다.

**Architecture:** 공중 적은 지상과 동일한 `PathManager` 폴리라인을 쓰고, 렌더만 고도 오프셋 + 바닥 그림자로 띄운다. 타워는 `targetsGround/targetsAir` 플래그를 갖고, `Game.updateTowers`가 `pickTarget` 이전에 표적 배열을 레이어로 거른다. 대공탑은 `TowerLevelStats.airDamageMultiplier`로 공중 특화(지상 약체)를 표현한다. 월드 3은 기존 스테이지 패턴을 그대로 따르는 데이터 파일 7개.

**Tech Stack:** Phaser 3, TypeScript(strict), Vite, Vitest. 순수 로직은 `src/core`·`src/systems`(phaser 미임포트, `tests/architecture.test.ts` 강제).

**Spec:** [docs/superpowers/specs/2026-08-31-air-units-and-world-3-design.md](../specs/2026-08-31-air-units-and-world-3-design.md)

## Global Constraints

- TypeScript strict. `any` 금지(불가피 시 사유 주석). `noUnusedLocals/Parameters` 켜짐.
- `src/core`, `src/systems`는 `phaser`를 import 하지 않는다.
- 시스템은 시간 API를 직접 만지지 않고 `dtMs`를 인자로 받는다.
- 밸런싱 매직넘버는 `src/data/`에만.
- 적/타워 `key`는 코드 참조용이라 **고정**, `name`만 세계관([docs/world.md](../../world.md))에 맞춘다.
- 커밋: Conventional Commits. 한 기능 한 커밋. 커밋 트레일러 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- 커밋 전 항상 `npm test` + `npm run build` 통과.
- `SFX_KEYS`(`src/core/audio.ts`)는 늘리지 않는다 — `tests/core/sfxAssets.test.ts`가 wav 파일과 대조한다. 새 타워는 기존 사운드를 재사용.
- 난이도는 임의 완화 금지. 밸런스 변경은 `tests/balance` 시뮬로 뒷받침.

---

## File Structure

**수정:**
- `src/core/types.ts` — `TowerDef.targetsGround?/targetsAir?`, `TowerLevelStats.airDamageMultiplier?`
- `src/systems/TargetingSystem.ts` — `Targetable.layer?`, `enemiesInRadius` 레이어 인자
- `src/entities/Enemy.ts` — `get layer()`, 공중 고도/그림자 렌더
- `src/scenes/Game.ts` — `updateTowers` 레이어 필터, `airDamageMultiplier` 적용, `PROJECTILE_TEXTURE`/`ENEMY_BURST_COLOR` 항목, 멀티샷·오디오 분기
- `src/data/towers.ts` — `ballista` 타워
- `src/data/enemies.ts` — 공중 적 4종, `cannon`/`poison`는 데이터에 영향 없음(플래그는 towers.ts)
- `src/core/towerInfo.ts` — `noteOf`에 대공 배수 노트
- `src/core/constants.ts` — `COLORS.ballista`, `WORLD_THEMES['3']`
- `src/ui/textures.ts` — `tower_ballista`, `projectile_ballista`, `enemy_drone/gunship/carrier/airboss`
- `src/ui/worldBackground.ts` — `BACKGROUND_THEMES['3']`
- `src/data/stages/index.ts` — 3-1~3-7 등록
- `tests/balance/harness.ts`, `tests/entities/Enemy.test.ts` — 가짜 씬에 `add.ellipse`
- `tests/balance/monoTower.test.ts` — invariant #1에서 `ballista` 제외
- `docs/world.md` — 월드 3 + 공중 적 표

**생성:**
- `tests/systems/targeting.test.ts`
- `src/data/stages/stage-3-1.ts` … `stage-3-7.ts`

---

## Task 1: 공중 레이어 데이터 모델 + 타겟팅 헬퍼

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/systems/TargetingSystem.ts`
- Modify: `src/entities/Enemy.ts` (getter만)
- Test: `tests/systems/targeting.test.ts` (create)

**Interfaces:**
- Produces:
  - `TowerDef.targetsGround?: boolean` (기본 true), `TowerDef.targetsAir?: boolean` (기본 true)
  - `TowerLevelStats.airDamageMultiplier?: number` (기본 1)
  - `Targetable.layer?: MovementLayer` (없으면 `'ground'` 취급)
  - `enemiesInRadius(center, radius, enemies, layers?: ReadonlySet<MovementLayer>): Targetable[]`
  - `Enemy.prototype.layer: MovementLayer` (getter)

- [ ] **Step 1: 타겟팅 유닛 테스트 작성 (`tests/systems/targeting.test.ts`)**

```ts
import { pickTarget, enemiesInRadius, type Targetable } from '../../src/systems/TargetingSystem';

function t(id: number, x: number, layer: 'ground' | 'air' = 'ground'): Targetable {
  return { id, pos: { x, y: 0 }, progress: x / 100, alive: true, hp: 100, layer };
}

describe('enemiesInRadius layer filter', () => {
  it('returns every layer when no filter given', () => {
    const list = [t(1, 10, 'ground'), t(2, 20, 'air')];
    expect(enemiesInRadius({ x: 0, y: 0 }, 100, list).map((e) => e.id)).toEqual([1, 2]);
  });

  it('keeps only the requested layers', () => {
    const list = [t(1, 10, 'ground'), t(2, 20, 'air'), t(3, 30, 'ground')];
    const ground = enemiesInRadius({ x: 0, y: 0 }, 100, list, new Set(['ground'] as const));
    expect(ground.map((e) => e.id)).toEqual([1, 3]);
  });

  it('treats a missing layer as ground', () => {
    const noLayer: Targetable = { id: 9, pos: { x: 5, y: 0 }, progress: 0, alive: true };
    const out = enemiesInRadius({ x: 0, y: 0 }, 100, [noLayer], new Set(['ground'] as const));
    expect(out.map((e) => e.id)).toEqual([9]);
  });
});

describe('pickTarget works on a pre-filtered array', () => {
  it('picks the frontmost of whatever it is handed', () => {
    const airOnly = [t(1, 10, 'air'), t(2, 40, 'air')];
    expect(pickTarget({ x: 0, y: 0 }, 100, airOnly, 'first')?.id).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/targeting.test.ts`
Expected: FAIL — `enemiesInRadius`는 4번째 인자를 무시하므로 "keeps only the requested layers"가 깨진다.

- [ ] **Step 3: `src/core/types.ts` 수정**

`TowerDef`에 필드 추가 (`levels` 위):

```ts
export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;
  maxLevel: number;
  /** 지상 표적을 조준하는가. 기본 true. */
  targetsGround?: boolean;
  /** 공중 표적을 조준하는가. 기본 true. 파열탑·역병탑은 false. */
  targetsAir?: boolean;
  levels: TowerLevelStats[];
}
```

`TowerLevelStats`에 `armorPierce?` 근처로 추가:

```ts
  /** 공중 표적에 곱하는 피해 배율. 기본 1. 대공탑(창공탑)이 크게 가진다. */
  airDamageMultiplier?: number;
```

- [ ] **Step 4: `src/systems/TargetingSystem.ts` 수정**

`import` 줄에 `MovementLayer` 추가:

```ts
import type { MovementLayer, Vec2 } from '../core/types';
```

`Targetable`에 필드 추가:

```ts
export interface Targetable {
  id: number;
  pos: Vec2;
  progress: number;
  alive: boolean;
  hp?: number;
  intercepts?: boolean;
  /** 없으면 'ground'로 본다. */
  layer?: MovementLayer;
}
```

`enemiesInRadius` 교체:

```ts
export function enemiesInRadius(
  center: Vec2,
  radius: number,
  enemies: Targetable[],
  layers?: ReadonlySet<MovementLayer>,
): Targetable[] {
  const r2 = radius * radius;
  return enemies.filter((e) =>
    e.alive
    && dist2(center, e.pos) <= r2
    && (!layers || layers.has(e.layer ?? 'ground')));
}
```

- [ ] **Step 5: `src/entities/Enemy.ts`에 `layer` getter 추가**

`get intercepts()` 근처:

```ts
  get layer(): import('../core/types').MovementLayer { return this.def.movementLayer ?? 'ground'; }
```

(파일 상단에 이미 `import type { ... } from '../core/types'`가 있으면 거기에 `MovementLayer`를 넣고 `this.def.movementLayer ?? 'ground'`만 반환해도 됨.)

- [ ] **Step 6: 테스트 통과 + 전체 회귀 확인**

Run: `npx vitest run tests/systems/targeting.test.ts && npm test`
Expected: 신규 테스트 PASS, 기존 202 PASS 유지.

- [ ] **Step 7: 빌드**

Run: `npm run build`
Expected: tsc 통과 (새 옵션 필드는 전부 optional이라 기존 타워 정의 불변).

- [ ] **Step 8: 커밋**

```bash
git add src/core/types.ts src/systems/TargetingSystem.ts src/entities/Enemy.ts tests/systems/targeting.test.ts
git commit -m "feat(air): movement-layer aware targeting primitives

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `Game.updateTowers` 레이어 필터 + 대공 피해 배수

**Files:**
- Modify: `src/scenes/Game.ts` (`updateTowers` ~862-976, `updateBeamTower` ~800-844)
- Test: `tests/systems/targeting.test.ts` (레이어 필터 헬퍼 함수 분리 시)

**Interfaces:**
- Consumes: Task 1의 `TowerDef.targetsGround/targetsAir`, `Enemy.layer`, `enemiesInRadius(..., layers)`
- Produces: `Game`는 타워별로 못 때리는 레이어 적을 조준·타격하지 않는다. 공중 표적 피해에 `airDamageMultiplier` 적용.

- [ ] **Step 1: 레이어 필터 순수 함수 + 테스트 추가 (`tests/systems/targeting.test.ts`에 이어서)**

`src/systems/TargetingSystem.ts`에 헬퍼 추가:

```ts
/** 타워가 조준 가능한 레이어 집합. 기본은 지상+공중. */
export function towerLayers(targetsGround = true, targetsAir = true): ReadonlySet<MovementLayer> {
  const s = new Set<MovementLayer>();
  if (targetsGround) s.add('ground');
  if (targetsAir) s.add('air');
  return s;
}

/** layers에 속하는 표적만 남긴다. */
export function eligibleTargets<T extends Targetable>(list: T[], layers: ReadonlySet<MovementLayer>): T[] {
  return list.filter((e) => layers.has(e.layer ?? 'ground'));
}
```

테스트:

```ts
import { towerLayers, eligibleTargets } from '../../src/systems/TargetingSystem';

describe('tower layer eligibility', () => {
  it('ground-only tower drops air targets', () => {
    const layers = towerLayers(true, false);
    const out = eligibleTargets([t(1, 5, 'ground'), t(2, 6, 'air')], layers);
    expect(out.map((e) => e.id)).toEqual([1]);
  });
  it('default hits both', () => {
    const layers = towerLayers();
    expect(eligibleTargets([t(1, 5, 'ground'), t(2, 6, 'air')], layers)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/targeting.test.ts`
Expected: FAIL — `towerLayers` 미정의.

- [ ] **Step 3: `TargetingSystem.ts`에 두 헬퍼 구현 (Step 1 코드) + 테스트 통과**

Run: `npx vitest run tests/systems/targeting.test.ts` → PASS

- [ ] **Step 4: `Game.ts` `updateTowers` 필터 적용**

`import` 줄(37행 근처)에 추가:

```ts
import { pickTarget, enemiesInRadius, towerLayers, eligibleTargets } from '../systems/TargetingSystem';
```

`updateTowers`에서 일반 분기(875행 `tower.cooldownMs -= dtMs;` 이후):

```ts
      tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const s = this.effectiveStats(tower);
      const layers = towerLayers(def.targetsGround, def.targetsAir);
      const eligible = eligibleTargets(this.enemies, layers);
      const target = pickTarget(tower.homePos, s.range, eligible, tower.priority);
```

- [ ] **Step 5: `updateBeamTower`도 필터**

`updateBeamTower` (800행~) 안 `pickTarget` 호출과 재조준 유지 조건에 레이어 반영:

```ts
    const def = getTower(tower.key);
    const layers = towerLayers(def.targetsGround, def.targetsAir);
    const inRange = (e: Enemy) => {
      const dx = e.pos.x - tower.homePos.x;
      const dy = e.pos.y - tower.homePos.y;
      return dx * dx + dy * dy <= r2 && layers.has(e.layer);
    };
    ...
      const t = pickTarget(tower.homePos, s.range, eligibleTargets(this.enemies, layers), tower.priority);
```

- [ ] **Step 6: 스플래시/독 반경도 레이어 제한**

`onHit`의 splash 분기(942행) `enemiesInRadius` 호출:

```ts
              for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0, this.enemies, layers)) {
```

poison 분기(935행)도 동일하게 `, layers` 추가. (`layers`는 Step 4에서 만든 것을 이 스코프에서 다시 계산: `onHit` 콜백 상단에서 `const layers = towerLayers(def.targetsGround, def.targetsAir);` — `def`는 이미 클로저에 있음.)

- [ ] **Step 7: 대공 피해 배수 적용**

`updateTowers` generic 분기의 실제 타격 지점들(948-971행 `else` 블록):

```ts
            } else {
              const e = this.enemies.find((x) => x.id === shot.id);
              if (!e || !e.alive) return;
              const airMul = e.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
              if (def.key === 'sniper') {
                e.takeDamage({
                  amount: shot.damage * sniperDamageMultiplier(tower.level, e.healthRatio) * airMul,
                  armorPierce: s.armorPierce ?? 0,
                  kind: 'single',
                });
              } else {
                e.takeDamage({ amount: shot.damage * airMul, kind: def.attack });
              }
```

beam 분기(`updateBeamTower` 833행): 배수는 공중 표적에만:

```ts
      const airMul = enemy.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
      enemy.takeDamage({ amount: dmgPerHit * s.fireRate * 0.1 * airMul, armorPierce: 2, kind: 'beam' }, false);
```

chain 분기(903-910행): 각 체인 대상별로:

```ts
            chain.forEach((hit, i) => {
              const e = this.enemies.find((x) => x.id === hit.id);
              if (!e) return;
              const airMul = e.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
              e.takeDamage({ amount: dmgs[i] * airMul, kind: 'chain' });
```

splash 분기(942-945행):

```ts
              for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0, this.enemies, layers)) {
                const affected = this.enemies.find((e) => e.id === hit.id);
                const airMul = affected && affected.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
                affected?.takeDamage({ amount: s.damage * airMul, kind: 'splash' });
```

(참고: 파열탑은 `targetsAir:false`라 공중을 못 맞히지만, 방어적으로 배수 코드는 넣어둔다.)

- [ ] **Step 8: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 기존 테스트 전부 PASS (아직 공중 적/`targetsAir:false` 타워가 없으므로 동작 변화 없음), tsc 통과.

- [ ] **Step 9: 커밋**

```bash
git add src/scenes/Game.ts src/systems/TargetingSystem.ts tests/systems/targeting.test.ts
git commit -m "feat(air): tower layer filtering + air damage multiplier in combat

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: 공중 적 렌더링 (고도 + 그림자)

**Files:**
- Modify: `src/entities/Enemy.ts`
- Modify: `tests/entities/Enemy.test.ts` (가짜 씬에 `ellipse`)
- Modify: `tests/balance/harness.ts` (가짜 씬에 `ellipse`)

**Interfaces:**
- Consumes: `Enemy.layer` (Task 1)
- Produces: `layer === 'air'`인 Enemy는 스프라이트를 `AIR_ALTITUDE`만큼 위로 그리고, `pos`는 여전히 경로(지상 투영) 좌표를 돌려준다. 바닥 그림자 오브젝트 생성/정리.

- [ ] **Step 1: `Enemy.test.ts` 가짜 씬 확장 + 공중 테스트 작성**

`makeEnemy`의 `scene.add`에 `ellipse` 추가:

```ts
  const scene = {
    add: {
      image: () => sprite, graphics: () => bar, circle: () => arc,
      ellipse: () => arc,
    },
  } as unknown as Phaser.Scene;
```

테스트 추가:

```ts
describe('air enemy', () => {
  it('reports the air layer and keeps pos on the ground projection', () => {
    const e = makeEnemy(100, { key: 'drone', movementLayer: 'air' });
    e.update(100, 1); // 경로 (0,0)->(0,10000), speed 100 -> 10px 진행
    expect(e.layer).toBe('air');
    expect(e.pos.y).toBeCloseTo(10, 0);        // 그림자(지상) 기준
    expect((e.sprite as unknown as { y: number }).y).toBeLessThan(10); // 스프라이트는 위로
  });

  it('defaults to ground layer with pos == sprite', () => {
    const e = makeEnemy(100, { key: 'normal' });
    e.update(100, 1);
    expect(e.layer).toBe('ground');
    expect(e.pos.y).toBeCloseTo((e.sprite as unknown as { y: number }).y, 5);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/entities/Enemy.test.ts`
Expected: FAIL — 현재 `pos`는 `sprite.y`를 그대로 돌려주고 공중 오프셋이 없다.

- [ ] **Step 3: `Enemy.ts` 수정**

상수 추가(상단):

```ts
const AIR_ALTITUDE = 22;
```

필드 추가:

```ts
  private groundPos: Vec2;
  private readonly shadow?: Phaser.GameObjects.GameObject & {
    setPosition(x: number, y: number): unknown; setVisible(v: boolean): unknown; destroy(): void;
  };
```

생성자: `this.groundPos = { x: start.x, y: start.y };` 초기화. 그림자 생성(공중일 때만):

```ts
    if ((def.movementLayer ?? 'ground') === 'air') {
      this.shadow = scene.add.ellipse(start.x, start.y, 20, 8, 0x000000, 0.28).setDepth(3) as never;
      this.sprite.setDepth(12);
    }
```

`get pos()` 교체:

```ts
  get pos(): Vec2 { return { x: this.groundPos.x, y: this.groundPos.y }; }
```

`update()`의 위치 반영부(303행 `this.sprite.setPosition(a.pos.x, a.pos.y);`) 교체:

```ts
    this.groundPos = { x: a.pos.x, y: a.pos.y };
    if (this.layer === 'air') {
      const bob = Math.sin(this.walkElapsedMs / 260) * 2;
      this.sprite.setPosition(a.pos.x, a.pos.y - AIR_ALTITUDE + bob);
      this.shadow?.setPosition(a.pos.x, a.pos.y);
    } else {
      this.sprite.setPosition(a.pos.x, a.pos.y);
    }
```

주의: 공중은 `WALK_ANIMATED`에 없어 `walkElapsedMs`가 0에 머문다 → bob이 안 움직인다.
`updateWalkAnimation` 대신 공중일 때 `this.walkElapsedMs += movingMs;`를 `update()`에 직접 더한다(프레임 세팅은 안 함):

```ts
    if (this.layer === 'air') this.walkElapsedMs += movingMs;
    else this.updateWalkAnimation(movingMs);
```

`drawBars()`의 y 오프셋: 공중이면 `AIR_ALTITUDE`만큼 더 위로:

```ts
    const lift = this.layer === 'air' ? AIR_ALTITUDE : 0;
    const y = this.sprite.y - (this.def.isBoss ? 40 : 18) - lift;
```

`destroy()`에 `this.shadow?.destroy();` 추가.

`a.done`일 때(304-307행) `this.shadow?.setVisible(false);` 추가.

- [ ] **Step 4: 테스트 통과**

Run: `npx vitest run tests/entities/Enemy.test.ts`
Expected: PASS

- [ ] **Step 5: `tests/balance/harness.ts` 가짜 씬에 `ellipse` 추가**

```ts
    add: {
      image: (x: number, y: number) => new DisplayObject(x, y),
      circle: (x: number, y: number) => new DisplayObject(x, y),
      ellipse: (x: number, y: number) => new DisplayObject(x, y),
      graphics: () => new DisplayObject(),
    },
```

- [ ] **Step 6: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 202+ PASS, tsc 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/entities/Enemy.ts tests/entities/Enemy.test.ts tests/balance/harness.ts
git commit -m "feat(air): elevated sprite + ground shadow for air enemies

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: 창공탑 (`ballista`) — 대공 전용 타워

**Files:**
- Modify: `src/core/constants.ts` (`COLORS.ballista`)
- Modify: `src/data/towers.ts` (`ballista` 정의)
- Modify: `src/ui/textures.ts` (`tower_ballista`, `projectile_ballista`)
- Modify: `src/scenes/Game.ts` (`PROJECTILE_TEXTURE`, 멀티샷 분기, 오디오 분기, muzzleFlash 색)
- Modify: `src/core/towerInfo.ts` (`noteOf` 대공 노트)
- Modify: `tests/balance/monoTower.test.ts` (invariant #1 제외)
- Test: `tests/data/towerCost.test.ts` 확인(수정 불필요 예상)

**Interfaces:**
- Consumes: `TowerDef.targetsGround/targetsAir`, `TowerLevelStats.airDamageMultiplier` (Task 1)
- Produces: `TOWERS.ballista` (`key: 'ballista'`, `attack: 'single'`). `TOWER_KEYS`에 자동 포함 → BuildMenu 자동 노출.

- [ ] **Step 1: `COLORS.ballista` 추가 (`src/core/constants.ts`)**

`COLORS` 객체에 (mine 다음):

```ts
  ballista: 0x8ad0ff,
```

- [ ] **Step 2: `ballista` 타워 정의 (`src/data/towers.ts`, `mine` 다음)**

```ts
  ballista: {
    // 대공 전용. 공중에 압도적, 지상엔 약하다. 3·5합 = 공중 다중 사격.
    key: 'ballista', name: '창공탑', attack: 'single', cost: 105, maxLevel: 5,
    targetsGround: true, targetsAir: true,
    levels: [
      { damage: 12,  range: 210, fireRate: 1.3, armorPierce: 2,  airDamageMultiplier: 3.4 },
      { damage: 22,  range: 224, fireRate: 1.4, armorPierce: 3,  airDamageMultiplier: 3.6 },
      { damage: 42,  range: 240, fireRate: 1.5, armorPierce: 5,  airDamageMultiplier: 3.8, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 82,  range: 256, fireRate: 1.6, armorPierce: 7,  airDamageMultiplier: 4.1, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 160, range: 274, fireRate: 1.7, armorPierce: 10, airDamageMultiplier: 4.5, projectileCount: 3, projectileDamageMultiplier: 0.45 },
    ],
  },
```

- [ ] **Step 3: 텍스처 (`src/ui/textures.ts`, `tower_mine` 다음)**

```ts
  // 창공탑: 하늘빛 석궁 — 위로 겨눈 활 + 화살.
  g.clear();
  g.fillStyle(0x14324a, 1); g.fillCircle(24, 24, 22);
  g.lineStyle(4, COLORS.ballista, 1); g.beginPath();
  g.arc(24, 30, 15, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  g.fillStyle(COLORS.ballista, 1); g.fillTriangle(24, 3, 30, 18, 18, 18); g.fillRect(22, 14, 4, 18);
  g.lineStyle(2, 0xdff2ff, 0.9); g.strokeCircle(24, 24, 20);
  g.generateTexture('tower_ballista', 48, 48);
```

투사체 (`projectile_*` 블록 근처):

```ts
  g.clear(); g.fillStyle(COLORS.ballista, 1); g.fillTriangle(34, 8, 34, 24, 6, 16); g.fillRect(2, 14, 24, 4);
  g.fillStyle(0xffffff, 1); g.fillRect(26, 14, 6, 4); g.generateTexture('projectile_ballista', 36, 32);
```

- [ ] **Step 4: `Game.ts` 배선**

`PROJECTILE_TEXTURE`에 추가:

```ts
  ballista: 'projectile_ballista',
```

멀티샷 분기(917행):

```ts
      const multi = (def.key === 'arrow' || def.key === 'ballista') && (s.projectileCount ?? 1) > 1;
```

오디오(885-887행): `ballista`는 저격 사운드 재사용:

```ts
      if (tower.key === 'arrow' || tower.key === 'cannon' || tower.key === 'frost' || tower.key === 'bolt' || tower.key === 'sniper' || tower.key === 'poison') {
        this.audio.play(tower.key);
      } else if (tower.key === 'ballista') {
        this.audio.play('sniper');
      }
```

muzzleFlash 색(888-890행): `ballista`는 `COLORS.ballista` — 삼항 맨 앞에 추가:

```ts
      this.muzzleFlash(tower.homePos, def.key === 'ballista' ? COLORS.ballista : def.key === 'sniper' ? COLORS.sniper : ...);
```

impactFlash 색(962-963행) generic `else` 안: `ballista`면 `COLORS.ballista`:

```ts
              this.impactFlash(e.pos,
                def.key === 'ballista' ? COLORS.ballista
                : def.attack === 'slow' ? COLORS.frost
                : def.key === 'sniper' ? COLORS.sniper : COLORS.arrow,
                def.key === 'ballista' ? 'light'
                : def.attack === 'slow' ? 'frost'
                : def.key === 'sniper' ? 'heavy' : 'light');
```

- [ ] **Step 5: `towerInfo.ts` `noteOf`에 대공 노트**

`if (attack === 'single' && key === 'sniper')` 블록 위에:

```ts
  if ((stats.airDamageMultiplier ?? 1) > 1) {
    return `대공 피해 x${stats.airDamageMultiplier}`;
  }
```

- [ ] **Step 6: `monoTower.test.ts` — invariant #1에서 `ballista` 제외**

45-49행 근처:

```ts
    // 1) 첫 스테이지는 직접 공격 타워라면 어떤 것으로든 솔로 클리어 가능해야 한다.
    //    지원형(지휘탑·연금탑)과 대공 특화(창공탑 — 지상 화력이 약한 게 설계 의도)는 제외.
    const combatKeys = TOWER_KEYS.filter(
      (key) => getTower(key).attack !== 'support' && key !== 'ballista',
    );
```

- [ ] **Step 7: 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: PASS. `monoTower.test.ts` matrix에 창공탑이 새 행으로 뜨고 1-1 솔로는 실패해도 통과(제외됨). invariant #2(후반 3스테이지 ≤1 솔로)는 창공탑이 지상 스테이지를 솔로 못 하므로 영향 없음.

- [ ] **Step 8: 커밋**

```bash
git add src/core/constants.ts src/data/towers.ts src/ui/textures.ts src/scenes/Game.ts src/core/towerInfo.ts tests/balance/monoTower.test.ts
git commit -m "feat(air): 창공탑 anti-air tower (ballista)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: 공중 적 4종 + 파열탑·역병탑 지상 전용화

**Files:**
- Modify: `src/data/enemies.ts` (`drone`, `gunship`, `carrier`, `airboss`)
- Modify: `src/data/towers.ts` (`cannon`·`poison`에 `targetsAir: false`)
- Modify: `src/ui/textures.ts` (`enemy_drone/gunship/carrier/airboss`)
- Modify: `src/scenes/Game.ts` (`ENEMY_BURST_COLOR`)
- Modify: `docs/world.md`
- Test: `tests/data/` 신규 또는 기존 확인

**Interfaces:**
- Consumes: `EnemyDef.movementLayer` (기존), `deathSpawn` (기존)
- Produces: `ENEMIES.drone|gunship|carrier|airboss` (`movementLayer: 'air'`). `carrier.deathSpawn = { enemyKey: 'minion', count: 3 }` (minion은 지상).

- [ ] **Step 1: 공중 적 존재 확인 테스트 (`tests/data/airEnemies.test.ts`, create)**

```ts
import { getEnemy } from '../../src/data/enemies';
import { getTower } from '../../src/data/towers';

describe('air enemies', () => {
  it.each(['drone', 'gunship', 'carrier', 'airboss'])('%s flies', (key) => {
    expect(getEnemy(key).movementLayer).toBe('air');
  });
  it('carrier drops ground minions on death', () => {
    const c = getEnemy('carrier');
    expect(c.deathSpawn).toEqual({ enemyKey: 'minion', count: 3 });
    expect(getEnemy(c.deathSpawn!.enemyKey).movementLayer ?? 'ground').toBe('ground');
  });
});

describe('ground-only towers', () => {
  it.each(['cannon', 'poison'])('%s cannot target air', (key) => {
    expect(getTower(key).targetsAir).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/data/airEnemies.test.ts`
Expected: FAIL — 적/플래그 미정의.

- [ ] **Step 3: `src/data/enemies.ts`에 4종 추가 (`boss` 다음, `}` 앞)**

```ts
  drone: {
    key: 'drone', name: '정찰 비행체', hp: 26, speed: 120, bounty: 4, lifeDamage: 1,
    movementLayer: 'air',
    resist: { single: 0.9, chain: 1.15 },
  },
  gunship: {
    key: 'gunship', name: '포격 비행정', hp: 200, speed: 46, bounty: 18, lifeDamage: 3,
    movementLayer: 'air', armor: 4,
    resist: { single: 0.8, beam: 1.1, chain: 0.85 },
  },
  carrier: {
    key: 'carrier', name: '강하 수송선', hp: 260, speed: 40, bounty: 20, lifeDamage: 2,
    movementLayer: 'air',
    deathSpawn: { enemyKey: 'minion', count: 3 },
    resist: { single: 0.85, splash: 1.2 },
  },
  airboss: {
    key: 'airboss', name: '공중 기함', hp: 2200, speed: 70, bounty: 180, lifeDamage: 6,
    isBoss: true, movementLayer: 'air', armor: 6,
    poisonResist: 0.35,
    resist: { single: 0.7, chain: 0.75, beam: 1.1, slow: 0.85 },
    shield: { energy: 160, rechargeDelayMs: 3600, rechargePerSecond: 18 },
    bossPhases: [
      { name: '급강하', atHealthRatio: 0.6, speedMultiplier: 1.6 },
      { name: '편대 전개', atHealthRatio: 0.3, speedMultiplier: 1.9, shieldRestoreRatio: 1, summon: { enemyKey: 'drone', count: 4 } },
    ],
  },
```

- [ ] **Step 4: `cannon`·`poison`에 `targetsAir: false` (`src/data/towers.ts`)**

```ts
  cannon: {
    key: 'cannon', name: '파열탑', attack: 'splash', cost: 110, maxLevel: 5,
    targetsAir: false,
    levels: [ ... ],
  },
  poison: {
    key: 'poison', name: '역병탑', attack: 'poison', cost: 90, maxLevel: 5,
    targetsAir: false,
    levels: [ ... ],
  },
```

- [ ] **Step 5: 텍스처 (`src/ui/textures.ts`, `enemy_boss` 다음)**

```ts
  // 공중 편대: 전부 하늘빛 계열, 실루엣으로 역할 구분.
  g.clear(); g.fillStyle(0x9fd8ff, 1); g.fillTriangle(11, 2, 21, 20, 1, 20); g.fillStyle(0xe7f6ff, 1); g.fillCircle(11, 13, 3);
  g.generateTexture('enemy_drone', 22, 22);
  g.clear(); g.fillStyle(0x7cc0ef, 1);
  g.fillPoints([new Phaser.Math.Vector2(4, 14), new Phaser.Math.Vector2(14, 4), new Phaser.Math.Vector2(30, 4), new Phaser.Math.Vector2(36, 14), new Phaser.Math.Vector2(30, 24), new Phaser.Math.Vector2(14, 24)], true);
  g.fillStyle(0x2c3d4d, 1); g.fillRect(15, 10, 12, 8); g.generateTexture('enemy_gunship', 40, 28);
  g.clear(); g.fillStyle(0x6fb4e6, 1); g.fillRoundedRect(2, 6, 40, 22, 8);
  g.fillStyle(0x2b3b4a, 1); g.fillRect(8, 12, 28, 10);
  g.fillStyle(0x9fd8ff, 1); g.fillTriangle(0, 6, 8, 6, 4, 0); g.fillTriangle(44, 6, 36, 6, 40, 0);
  g.generateTexture('enemy_carrier', 46, 34);
  g.clear(); g.fillStyle(0x2b4a63, 1); g.fillCircle(30, 30, 26);
  g.fillStyle(0x8ad0ff, 1); g.fillCircle(30, 30, 19);
  g.fillStyle(0xdff2ff, 1); g.fillTriangle(2, 34, 22, 26, 16, 44); g.fillTriangle(58, 34, 38, 26, 44, 44);
  g.fillStyle(0x16283a, 1); g.fillRect(20, 26, 20, 14);
  g.lineStyle(3, 0xdff2ff, 0.9); g.strokeCircle(30, 30, 25); g.generateTexture('enemy_airboss', 60, 60);
```

- [ ] **Step 6: `ENEMY_BURST_COLOR` (`src/scenes/Game.ts` 58행)**

```ts
  drone: 0x9fd8ff,
  gunship: 0x7cc0ef,
  carrier: 0x6fb4e6,
  airboss: 0x8ad0ff,
```

- [ ] **Step 7: `docs/world.md` 갱신**

"태엽 군단 (적)" 표에 4행 추가:

```
| `drone` | 정찰 비행체 | 낮게 나는 감시 드론 편대. 물렁하고 빠름 (공중) |
| `gunship` | 포격 비행정 | 장갑 두른 공중 포대. 느리고 단단 (공중) |
| `carrier` | 강하 수송선 | 격추되면 지상 잡졸 셋을 떨군다 (공중) |
| `airboss` | 공중 기함 | 월드 3 피날레. 급강하·편대 전개. 대공 첨탑이 답 (공중) |
```

"마법 첨탑 (타워)" 표에:

```
| `ballista` | 창공탑 | 대공 첨탑. 공중에 압도적, 지상엔 약함. 3·5합 = 공중 다중 사격 |
```

- [ ] **Step 8: 테스트 + 빌드**

Run: `npx vitest run tests/data/airEnemies.test.ts && npm test && npm run build`
Expected: 신규 PASS, 기존 202 PASS 유지 (공중 적은 아직 어느 웨이브에도 안 나옴).

- [ ] **Step 9: 커밋**

```bash
git add src/data/enemies.ts src/data/towers.ts src/ui/textures.ts src/scenes/Game.ts docs/world.md tests/data/airEnemies.test.ts
git commit -m "feat(air): air enemy squadron + ground-only 파열탑/역병탑

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: 월드 3 테마 (팔레트만)

**Files:**
- Modify: `src/core/constants.ts` (`WORLD_THEMES['3']`)
- Modify: `src/ui/worldBackground.ts` (`BACKGROUND_THEMES['3']`)
- Modify: `docs/world.md` (월드 표)

**Interfaces:**
- Produces: `WORLD_THEMES['3']`, `BACKGROUND_THEMES['3']`. `Game.create`의 `WORLD_THEMES[world] ?? '1'`, `worldBackgroundTheme`의 `?? '1'` 폴백이 이미 있으니 없어도 안 깨지지만, 월드 3 분위기를 위해 추가.

- [ ] **Step 1: `WORLD_THEMES['3']` (`src/core/constants.ts`)**

```ts
export const WORLD_THEMES: Record<string, { path: number; buildable: number }> = {
  '1': { path: COLORS.path, buildable: COLORS.buildable },
  '2': { path: 0x5c4034, buildable: 0x2c211d }, // 붉은 바위 동굴
  '3': { path: 0x3a4a63, buildable: 0x1e2740 }, // 구름 위 강철 통로
};
```

- [ ] **Step 2: `BACKGROUND_THEMES['3']` (`src/ui/worldBackground.ts`)**

```ts
const BACKGROUND_THEMES: Record<string, WorldBackgroundTheme> = {
  '1': { sky: 0x101b35, horizon: 0x1a3153, silhouette: 0x142641, accent: 0x7bd7ff },
  '2': { sky: 0x241315, horizon: 0x4a2420, silhouette: 0x35191b, accent: 0xff9a57 },
  '3': { sky: 0x0e1a2c, horizon: 0x24405e, silhouette: 0x172b40, accent: 0x9fd8ff },
};
```

`WorldBackground` 생성자에서 world '3'은 `addSkyline`(기본 else)을 타므로 별도 분기 불필요 —
달/능선이 구름 위 분위기로도 무난. (원하면 후속 폴리시.)

- [ ] **Step 3: `docs/world.md` 월드 표에 행 추가**

```
| **3** | 구름 위 · 부유 병기창 | 용광로를 뚫자 군단이 산정상에서 비행 편대를 띄운다. 찬 청회색 하늘, 강철 비행선 실루엣. 피날레 = 공중 기함. |
```

큰 줄기 문단의 캠페인 줄도 갱신:

```
- **캠페인**: 국경 성벽(월드 1) → 용광로 심장부(월드 2) → 구름 위 부유 병기창(월드 3)까지 밀고 들어가 생산을 끊는다.
```

- [ ] **Step 4: 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: PASS (데이터만 추가, 아직 월드 3 스테이지 없음).

- [ ] **Step 5: 커밋**

```bash
git add src/core/constants.ts src/ui/worldBackground.ts docs/world.md
git commit -m "feat(world3): sky palette + background theme

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: 월드 3 스테이지 3-1 ~ 3-4

**Files:**
- Create: `src/data/stages/stage-3-1.ts` … `stage-3-4.ts`
- Modify: `src/data/stages/index.ts`

**Interfaces:**
- Consumes: 공중 적 키(`drone`/`gunship`/`carrier`), 창공탑, `parseGrid`, `TILE`
- Produces: `stage31`..`stage34` export. `index.ts`의 `STAGES` 배열에 순서대로 추가 → 잠금 해제 체인(`nextStageId`)·StageSelect 목록 자동 연결.

각 파일은 `stage-2-1.ts` 구조를 그대로 따른다(`id`, `grid`, `spawn`, `goals`, `path`, `startGold`, `startLives`, `starThresholds`, `waves`). 맵 골격은 기존 것을 재사용/변형해도 된다.

- [ ] **Step 1: `stage-3-1.ts` 작성 (공중 도입 — 대공탑 없이도 가능)**

맵: `stage-2-1.ts`의 구불 단일 경로 재사용. `id: '3-1'`, `startGold: 320`, `startLives: 20`,
`starThresholds: [0.35, 0.7, 1.0]`.

```ts
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 16, intervalMs: 320, startDelayMs: 0 }] },
    { clearBonus: 25, groups: [
      { enemy: 'drone', count: 6, intervalMs: 500, startDelayMs: 0 },
      { enemy: 'fast', count: 12, intervalMs: 220, startDelayMs: 1200 },
    ] },
    { clearBonus: 30, groups: [
      { enemy: 'normal', count: 14, intervalMs: 280, startDelayMs: 0 },
      { enemy: 'drone', count: 10, intervalMs: 320, startDelayMs: 1500 },
    ] },
    { clearBonus: 35, groups: [
      { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 0 },
      { enemy: 'drone', count: 12, intervalMs: 260, startDelayMs: 1000 },
    ] },
    { clearBonus: 70, groups: [
      { enemy: 'drone', count: 20, intervalMs: 200, startDelayMs: 0 },
      { enemy: 'normal', count: 16, intervalMs: 240, startDelayMs: 1500 },
    ] },
  ],
```

- [ ] **Step 2: `stage-3-2.ts` (드론 스웜 본격 — 대공 커버 필요 시작)**

맵: `stage-1-3` 링형 재사용. `id: '3-2'`, `startGold: 330`, 웨이브 6개, `drone` 비중을
스테이지 절반 이상으로. 마지막 웨이브 `drone` 28 + `fast` 20 동시.

- [ ] **Step 3: `stage-3-3.ts` (`gunship` 등장)**

`id: '3-3'`, `startGold: 350`, 웨이브 7개. 3웨이브부터 `gunship` 2→3→4기,
지상 `tank`와 병행. 마지막 `gunship` 5 + `drone` 24 + `tank` 6.

- [ ] **Step 4: `stage-3-4.ts` (지상·공중 동시 압박)**

`id: '3-4'`, `startGold: 360`, 분기 맵(`stage-1-3` 형). 매 웨이브 지상+공중 동시,
`gunship`·`tank`·`drone`·`fast` 섞어서. 보스 없음.

- [ ] **Step 5: `index.ts` 등록**

import 4개 추가, `STAGES` 배열 `stage25` 뒤에 `stage31, stage32, stage33, stage34` 추가.

```ts
import { stage31 } from './stage-3-1';
import { stage32 } from './stage-3-2';
import { stage33 } from './stage-3-3';
import { stage34 } from './stage-3-4';
...
export const STAGES: StageDef[] = [
  stage11, stage12, stage13, stage14, stage15, stage16, stage17, stage18,
  stage21, stage22, stage23, stage24, stage25,
  stage31, stage32, stage33, stage34,
];
```

- [ ] **Step 6: 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: `balance.test.ts`가 `STAGES` 전체를 순회한다 — 새 스테이지에서 `noDefense`는
전패(공중 누수로 라이프 0)해야 통과. 실패 시 웨이브 수/lifeDamage로 조정.
`monoTower.test.ts`도 새 스테이지를 매트릭스에 넣지만 invariant #2는 "마지막 3스테이지"
= 아직 3-2·3-3·3-4 (3-5~3-7 추가 전) — Task 8 후 최종 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/data/stages/stage-3-1.ts src/data/stages/stage-3-2.ts src/data/stages/stage-3-3.ts src/data/stages/stage-3-4.ts src/data/stages/index.ts
git commit -m "feat(world3): stages 3-1 ~ 3-4 (air introduction)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 월드 3 스테이지 3-5 ~ 3-7 (피날레)

**Files:**
- Create: `src/data/stages/stage-3-5.ts`, `stage-3-6.ts`, `stage-3-7.ts`
- Modify: `src/data/stages/index.ts`

**Interfaces:**
- Consumes: `carrier`, `airboss`, `crusher`, 창공탑
- Produces: `stage35`..`stage37`. `stage37`은 `bossStage: true` (타워 1종 랜덤 봉인).

- [ ] **Step 1: `stage-3-5.ts` (`carrier` — 공중 + 투하 잡졸)**

`id: '3-5'`, `startGold: 370`, 웨이브 7개. `carrier` 2→3→4기, 격추 시 지상 `minion` 3기씩
투하 → 레이어 전환 대응 강제. 지상 커버(파열탑·역병탑)와 대공 커버 둘 다 필요.

- [ ] **Step 2: `stage-3-6.ts` (대규모 혼성 + 준보스)**

`id: '3-6'`, `startGold: 380`, 웨이브 8개. `crusher`(지상 준보스) + `gunship` 편대 동시,
`carrier`·`drone`·`tank` 혼합. 보스 없음(피날레 직전 관문).

- [ ] **Step 3: `stage-3-7.ts` (`airboss` 피날레)**

`id: '3-7'`, `bossStage: true`, `startGold: 400`, `startLives: 20`,
`starThresholds: [0.3, 0.6, 1.0]`, 웨이브 8개. 최종 2웨이브에 `airboss`
(count 1 → 2), `gunship`·`carrier`·`drone`·지상 혼합. `stage-2-5` 피날레 구조 참고.

```ts
    {
      clearBonus: 150,
      groups: [
        { enemy: 'airboss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'gunship', count: 4, intervalMs: 700, startDelayMs: 1500 },
        { enemy: 'normal', count: 20, intervalMs: 200, startDelayMs: 2500 },
      ],
    },
    {
      clearBonus: 220,
      groups: [
        { enemy: 'airboss', count: 2, intervalMs: 5000, startDelayMs: 0 },
        { enemy: 'carrier', count: 4, intervalMs: 1400, startDelayMs: 2000 },
        { enemy: 'drone', count: 30, intervalMs: 140, startDelayMs: 3000 },
      ],
    },
```

- [ ] **Step 4: `index.ts` 등록**

import 3개, `STAGES` 배열에 `stage35, stage36, stage37` 추가.

- [ ] **Step 5: `bossStage` 봉인 대상 확인**

`stage-3-7`은 타워 1종이 랜덤 봉인된다. 봉인 로직 위치를 grep으로 확인:

Run: `grep -rn "bossStage" src/`

봉인이 `TOWER_KEYS` 전체에서 무작위라면 창공탑도 봉인 대상이 되어 3-7이 불가능해질 수
있다. 봉인 후보에서 창공탑(그리고 지원형)을 빼거나, 봉인은 그대로 두되 3-7 웨이브가
창공탑 없이도(저격·마광 대공으로) 가능하도록 설계. 코드 확인 후 결정 — 봉인 후보 필터가
있으면 `key !== 'ballista'` 추가.

- [ ] **Step 6: 테스트 + 빌드 + invariant 확인**

Run: `npm test && npm run build`

확인 사항:
- `balance.test.ts`: `noDefense` 전 스테이지 전패 유지. 마지막 스테이지(`STAGES[-1]` = 3-7)에
  `arrowMerge`가 못 깨야 하는 단언 — 공중 보스라 화살 단일로는 당연히 실패, 통과.
- `monoTower.test.ts` invariant #2: 마지막 3스테이지 = 3-5·3-6·3-7. 각각 ≤1 타워만 3/3 솔로.
  공중 강제라 지상 단일탑은 자연 탈락. 만약 마광(beam)이 3개 다 솔로하면 웨이브에 공중
  비중/체력을 올려 조정. (창공탑은 지상 약체라 지상 물량에서 탈락 → 솔로 불가, 문제 없음.)

- [ ] **Step 7: 커밋**

```bash
git add src/data/stages/stage-3-5.ts src/data/stages/stage-3-6.ts src/data/stages/stage-3-7.ts src/data/stages/index.ts
git commit -m "feat(world3): stages 3-5 ~ 3-7 (carrier, 준보스, 공중 기함 피날레)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: 밸런스 패스

**Files:**
- Modify: `src/data/towers.ts`, `src/data/enemies.ts`, `src/data/stages/stage-3-*.ts` (필요 시)
- Temp: `tests/balance/world3.scratch.test.ts` (측정용, 커밋 안 함)

- [ ] **Step 1: 측정 스크래치 테스트 작성**

`tests/balance/world3.scratch.test.ts` — `monoTower`/`mergeArmy`/`spread`로 3-1~3-7 각각
`simulate`, `won`/`stars`/`lives` 표 출력. (`balance.test.ts` 패턴 복사.)

- [ ] **Step 2: 실행 + 판독**

Run: `npx vitest run tests/balance/world3.scratch.test.ts --reporter=verbose`

기준:
- 3-1~3-2: 혼합 머지로 클리어 가능(시뮬은 약체라 3별까진 아니어도 `won`).
- 3-3~3-6: `noDefense` 전패, 단일탑 대부분 실패.
- 3-7: `mergeArmy(['sniper','cannon','bolt','frost','poison','laser'])`류 조합으로만 가능성.
  창공탑 포함 조합이 공중 보스에 유의미하게 유리해야 함.

- [ ] **Step 3: 수치 조정**

시뮬은 하한선임을 감안(실플레이의 ~1/3). 명백히 깨진 것만 고친다:
- 어떤 스테이지가 조합으로도 시뮬에서 100% 전패 → 웨이브 물량/체력 하향 or `startGold` 상향
- 단일탑 하나가 3-5~3-7을 3/3 솔로 → 해당 카운터 물량 상향
- 창공탑 지상 화력이 지상 스테이지(1-1 등)에서 어중간하게 세면 `damage` 하향,
  공중이 너무 약하면 `airDamageMultiplier` 상향

한 번에 하나씩 바꾸고 재측정.

- [ ] **Step 4: 스크래치 삭제 + 전체 회귀**

```bash
rm tests/balance/world3.scratch.test.ts
npm test && npm run build
```
Expected: `35+ files`, `210+ tests` PASS. 빌드 통과.

- [ ] **Step 5: 커밋 (조정이 있었으면)**

```bash
git add -A
git commit -m "balance(world3): tune air waves + 창공탑 against sim regression

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: 브라우저 검증 + 마무리

**Files:** 없음 (검증만). 발견된 버그는 해당 파일 수정.

- [ ] **Step 1: dev 서버 + 공중 스테이지 진입**

`preview_start {name: "dev"}`. `mainmenu` → 스테이지 선택 스크롤 → `3-1` (또는 저장을
풀어 바로). 창 숨김 시 RAF 멈추므로 `setInterval(()=>window.__game.loop.step(performance.now()),16)`
로 펌프.

- [ ] **Step 2: 확인 항목**

- 공중 적: 길 위를 그림자와 함께 떠서 이동하는가, 벽 구간에서도 자연스러운가
- 파열탑·역병탑: 공중 적을 조준/타격하지 않는가 (사거리 링 안에 공중 적이 있어도 무시)
- 화살·저격·번개·마광·서리: 공중 적을 때리는가
- 창공탑: 설치 → 공중 적에 큰 피해(숫자), 지상 적엔 약함. 정보 패널에 "대공 피해 x3.4" 노트
- 3-5 `carrier` 격추 시 지상 잡졸 3기 낙하, 지상 타워가 처리
- `read_console_messages` / `preview_logs` 에러 없음

- [ ] **Step 3: 스테이지 선택 스크롤**

카드가 17개(1-1~3-7)로 늘었다. StageSelect 리스트가 3-7까지 스크롤되는지 확인
(`LIST_TOP`/`LIST_BOTTOM` 범위, 드래그 스크롤).

- [ ] **Step 4: 스크린샷으로 증빙 + 사용자 보고**

`computer {action:"screenshot"}` — 공중 적 + 창공탑 사격 장면. 사용자에게 요약 보고.

- [ ] **Step 5: 최종 커밋 (검증 중 수정이 있었으면) + ROADMAP 갱신**

`docs/ROADMAP.md` "완료" 섹션에 공중 레이어 + 창공탑 + 월드 3 한 줄 추가.

```bash
git add -A
git commit -m "docs: roadmap — air layer + 창공탑 + world 3 shipped

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: 푸시**

```bash
git push origin main
```

(배포 워크플로가 자동 실행 → 사용자 폰 검증.)

---

## Self-Review

**Spec coverage:**
- 공중 이동 = 지상 경로 → Task 3 (`groundPos`, 폴리라인 그대로). ✅
- 지상 전용 파열탑·역병탑 → Task 5 Step 4. ✅
- 창공탑 (`airDamageMultiplier`, 지상 약체) → Task 4. ✅
- 공중 적 4종 → Task 5. ✅
- 월드 3 3-1~3-7 → Task 7·8. ✅
- 타겟 필터 → Task 2. ✅
- 렌더(고도·그림자·부유) → Task 3. ✅
- `towerInfo` 노트 → Task 4 Step 5. ✅
- 테스트(targeting/Enemy/balance/monoTower) → Task 1·3·4·8·9. ✅
- `WORLD_THEMES['3']` / 배경 → Task 6. ✅
- Codex 경계(아트만) → 텍스처는 `generateTexture` 도형으로 진행, 스펙에 명시. ✅
- 비목표(별도 공중 경로/비행 시트/완전 지상불가/업적/무한 편입) → 계획에 없음. ✅

**Placeholder scan:** 스테이지 웨이브 일부는 "구조 서술 + 시작 수치"로 두고 Task 9에서
시뮬로 확정 — 이는 밸런스 데이터의 정상 워크플로(`AGENTS.md` "밸런스 회귀"). 3-1과 3-7은
전체 웨이브 코드 제공. 3-2~3-6은 명시적 수치 범위 + 참조 스테이지 지정. 승인된 접근.

**Type consistency:**
- `towerLayers(targetsGround?, targetsAir?)` / `eligibleTargets(list, layers)` — Task 2에서 정의, Task 2에서만 사용. ✅
- `enemiesInRadius(center, radius, enemies, layers?)` — Task 1 정의, Task 2에서 `layers` 전달. ✅
- `Enemy.layer: MovementLayer` — Task 1 정의, Task 2·3에서 사용. ✅
- `AIR_ALTITUDE`, `groundPos` — Task 3 내부. ✅
- `TowerLevelStats.airDamageMultiplier` — Task 1 정의, Task 2(전투)·4(창공탑)·4(towerInfo)에서 사용. ✅
- `TowerDef.targetsGround/targetsAir` — Task 1 정의, Task 2·4·5에서 사용. ✅
