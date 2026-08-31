# Enemy Archetypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지상 적 특성과 타워 상성을 데이터 중심으로 추가해, 후반 스테이지에서 혼합 타워 조합이 높은 별을 얻도록 만든다.

**Architecture:** 순수 `EnemyState`가 체력·장갑·보호막·재생·독·소환 주기를 계산하고, Phaser `Enemy`는 상태를 텍스처·바·이펙트로 반영한다. `Game`은 상태가 반환한 소환 요청을 현재 경로 위치에서 적으로 생성하며, WaveManager는 원래 웨이브 적만 클리어 수에 센다.

**Tech Stack:** TypeScript strict, Phaser 3, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-08-31-enemy-archetypes-design.md`

## Global Constraints

- 작업 위치는 `C:\Users\uon10\Desktop\game-codex-sniper-tower`만 사용한다.
- `main`에 직접 push하거나 병합하지 않는다.
- `src/core`, `src/systems`는 Phaser를 import하지 않는다.
- 지상 적만 실제 구현한다. `movementLayer`는 공중 확장을 위한 데이터만 제공한다.
- 기능 전체는 Conventional Commit 한 개로 제출한다.

---

### Task 1: 순수 적 상태와 피해 규칙

**Files:**
- Create: `src/systems/EnemyState.ts`
- Modify: `src/core/types.ts`
- Test: `tests/systems/EnemyState.test.ts`

**Interfaces:**
- Produces `EnemyState(def: EnemyDef, multipliers?: EnemyModifiers)`
- Produces `applyDamage(packet: DamagePacket): DamageReport`
- Produces `update(dtMs: number): EnemyTick`

- [ ] **Step 1: 장갑·보호막·재생·독 상호작용의 실패 테스트를 작성한다.**

```ts
const state = new EnemyState(shieldedDef);
expect(state.applyDamage({ amount: 30 })).toMatchObject({ shieldDamage: 30, hpDamage: 0 });
state.update(1000);
expect(state.shield).toBe(30);
state.applyPoison(10, 1000);
state.update(500);
expect(state.hp).toBeLessThan(state.maxHp);
expect(state.regenBlocked).toBe(true);
```

- [ ] **Step 2: `npx vitest run tests/systems/EnemyState.test.ts`를 실행해 기능 부재로 실패함을 확인한다.**
- [ ] **Step 3: 최소 `EnemyState`와 `EnemyDef` 확장 타입을 구현한다.**
  - `DamagePacket`: `amount`, `armorPierce`, `source`
  - `DamageReport`: `armorBlocked`, `shieldDamage`, `hpDamage`
  - 보호막은 `rechargeDelayMs` 동안 피격이 없을 때만 회복한다.
  - 독 상태에서는 재생이 0이며, 더 강한 독 우선·시간 갱신 규칙을 유지한다.
- [ ] **Step 4: 같은 테스트가 통과하는지 실행한다.**
- [ ] **Step 5: 명시적 배율이 체력·속도·보호막에 적용되는 테스트를 추가하고 통과시킨다.**

### Task 2: 소환사와 부하 표적 우선

**Files:**
- Modify: `src/systems/EnemyState.ts`
- Modify: `src/systems/TargetingSystem.ts`
- Test: `tests/systems/EnemyState.test.ts`
- Test: `tests/systems/TargetingSystem.test.ts`

**Interfaces:**
- `EnemyTick.summons: number`는 이번 업데이트에 발생한 소환 수다.
- `Targetable.intercepts?: boolean`를 추가한다.

- [ ] **Step 1: 소환 주기와 부하 우선 표적의 실패 테스트를 작성한다.**

```ts
const state = new EnemyState(summonerDef);
expect(state.update(999).summons).toBe(0);
expect(state.update(1).summons).toBe(1);
expect(pickTarget(origin, 100, [summoner, minion])).toBe(minion);
```

- [ ] **Step 2: 대상 테스트를 실행해 새 속성이 반영되지 않아 실패함을 확인한다.**
- [ ] **Step 3: `summon.intervalMs` 누적 계산과 `intercepts` 우선 정렬을 구현한다.**
  - 인터셉터가 사거리 안에 하나라도 있으면 선택한 표적 우선순위보다 먼저 비교한다.
  - 범위 피해와 체인 피해는 기존처럼 주변 모든 적을 처리한다.
- [ ] **Step 4: 두 시스템 테스트를 다시 실행해 통과를 확인한다.**

### Task 3: Phaser 적 표현과 게임 통합

**Files:**
- Modify: `src/entities/Enemy.ts`
- Modify: `src/scenes/Game.ts`
- Modify: `src/ui/textures.ts`
- Modify: `tests/balance/harness.ts`
- Test: `tests/entities/Enemy.test.ts`

**Interfaces:**
- `Enemy.update(dtMs, speedMul): EnemyUpdateResult`는 `summons`와 상태 표시를 반환한다.
- `Game.spawnEnemy(key, options?)`는 `countsForWave`와 시작 진행도를 받는다.

- [ ] **Step 1: 보호막 바·독 재생 차단·소환 요청의 실패 엔티티 테스트를 작성한다.**
- [ ] **Step 2: 테스트를 실행해 현재 Enemy API가 결과를 반환하지 않아 실패함을 확인한다.**
- [ ] **Step 3: Enemy가 EnemyState를 사용하도록 옮기고 다음 표시를 구현한다.**
  - 보호막은 체력바 위의 얇은 파란 바로 표시한다.
  - 장갑은 회색 외곽선, 재생은 초록 고리, 독 재생 차단은 보라 고리로 표시한다.
  - 적 텍스처는 돌진병·군집충·방어막병·장갑 정예·재생체·소환사·부하를 실루엣만으로 구분한다.
- [ ] **Step 4: Game은 소환 부하를 부모보다 경로 앞쪽에 생성하고, 부하 제거에는 `WaveManager.notifyEnemyRemoved`를 호출하지 않는다.**
- [ ] **Step 5: 저격 공격은 `armorPierce`를 담은 피해 패킷을 보내고, 독 공격은 재생 차단 상태를 만든다.**
- [ ] **Step 6: 가짜 Phaser DisplayObject를 필요한 no-op 메서드로 보완하고 엔티티 테스트를 통과시킨다.**

### Task 4: 데이터, 후반 웨이브, 상성 밸런스

**Files:**
- Modify: `src/data/enemies.ts`
- Modify: `src/data/stages/stage-1-7.ts`
- Modify: `src/data/stages/stage-1-8.ts`
- Modify: `tests/data/definitions.test.ts`
- Modify: `tests/balance/balance.test.ts`

**Interfaces:**
- 적 키: `runner`, `swarm`, `shield`, `armored`, `regenerator`, `summoner`, `minion`
- WaveGroup 선택 속성: `hpMultiplier`, `speedMultiplier`, `shieldMultiplier`

- [ ] **Step 1: 새 적 정의와 배율 데이터의 실패 테스트를 작성한다.**
- [ ] **Step 2: 정의 테스트를 실행해 적 키가 없어서 실패함을 확인한다.**
- [ ] **Step 3: 후반 웨이브에 특성 조합을 배치한다.**
  - 1-7에는 돌진병·군집충·방어막병을 도입한다.
  - 1-8에는 장갑 정예·재생체·소환사와 보스 혼합 웨이브를 넣는다.
  - 보상은 필요한 혼합 타워를 살 수 있게 유지하되, 체력만 일괄 증폭하지 않는다.
- [ ] **Step 4: 밸런스 테스트를 바꾼다.**
  - 마지막 스테이지의 각 단일 타워 머지 전략은 3별 미만이다.
  - `[arrow, cannon, frost, bolt, sniper, poison]` 혼합 머지 전략은 각 고정 시드에서 2별 이상이다.
  - 무방어 전략 패배 및 결정성 단언은 유지한다.
- [ ] **Step 5: 정의·밸런스 테스트를 통과시킨다.**

### Task 5: 최종 검증과 단일 기능 커밋

**Files:**
- Modify: `docs/superpowers/specs/2026-08-31-enemy-archetypes-design.md`
- Modify: `docs/superpowers/plans/2026-08-31-enemy-archetypes.md`

- [ ] **Step 1: `npx vitest run tests/systems/EnemyState.test.ts tests/entities/Enemy.test.ts tests/balance/balance.test.ts --reporter=verbose`를 실행한다.**
- [ ] **Step 2: `npm test`, `npm run build`, `git diff --check`를 실행한다.**
- [ ] **Step 3: 브라우저에서 1-7과 1-8을 실제로 확인하고, 상태 아이콘·소환 부하·처치 효과가 가려지지 않는지 점검한다.**
- [ ] **Step 4: `git fetch origin` 후 `git rebase origin/main`을 실행한다. 충돌을 해결한 경우 전체 검증을 다시 실행한다.**
- [ ] **Step 5: 모든 변경을 한 커밋으로 만든다.**

```bash
git add src tests docs public
git commit -m "feat: add enemy archetypes and combat counters"
git push -u origin codex/enemy-archetypes
```

- [ ] **Step 6: `codex/enemy-archetypes → main` PR을 생성하고 병합하지 않는다.**
