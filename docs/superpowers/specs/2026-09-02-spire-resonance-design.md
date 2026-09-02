# 첨탑 공명 (Spire Resonance) — 설계

작성 2026-09-02. 작업 규칙은 [/AGENTS.md](../../../AGENTS.md). 로드맵의 **깊이 C — 인접 시너지**.

## 목표

인접한 두 첨탑이 정수맥을 통해 **공명**한다. 원소 첨탑(서리·번개·역병·파열)이 적에게
**각인**을 남기고, 옆에 붙은 다른 첨탑이 그 각인을 때려 **반응**을 터뜨린다.

머지(높게 쌓기)를 대체하지 않고 그 위에 **배치 레이어**를 얹는 게 핵심 제약이다.
코너에 홀로 선 첨탑은 공명하지 않는다 → 모노 스택엔 시너지가 0. 반응은 후반 조합을
푸는 **카운터플레이 도구**지 승리 버튼이 아니다.

## 세계관

정수맥(ley-line) 위에 세운 마법 첨탑. 두 첨탑이 나란히 서면 둘 사이의 마력이 공명해,
한쪽이 새긴 정수 각인을 다른 쪽의 일격이 격발시킨다. 이름은 [docs/world.md](../../world.md) 톤에 맞춘다.

## 1. 원소와 각인

### 1.1 `ElementKind`

```ts
// src/core/types.ts
export type ElementKind = 'ice' | 'lightning' | 'decay' | 'fire';

export interface TowerDef {
  // ...기존 필드...
  /** 있으면 원소 첨탑 — 충전 시 명중한 적에게 이 원소의 각인을 남긴다. */
  element?: ElementKind;
}
```

### 1.2 타워 → 원소 매핑 (`src/data/towers.ts`)

| 타워 key | `element` | 각인 이름 | 반응 성격 |
|---|---|---|---|
| `frost` | `ice` | 서리 각인 | 대탱커·보스 |
| `bolt` | `lightning` | 뇌전 각인 | 대스웜 |
| `poison` | `decay` | 부식 각인 | 지속·스웜 |
| `cannon` | `fire` | 화염 각인 | 대장갑 |
| `arrow`,`sniper`,`laser`,`ballista` | — | — | 각인 없음(기폭만 가능) |
| `command`,`mine` | — | — | 공명 무관 (지원탑) |

- 경로(A/B)와 무관하게 `element` 는 `TowerDef` 레벨에 한 번만 둔다. 경로가 원소를 바꾸지 않는다.
- 4개 값만 쓴다. `laser`(빛/열)는 v1 에서 원소를 안 준다 — 후속 확장 여지로 남긴다.

### 1.3 각인 상태 (`EnemyState`)

```ts
// EnemyState 내부
private mark: { element: ElementKind; leftMs: number } | null = null;
private reactionCooldownMs = new Map<ElementKind, number>();

/** 충전된 원소 첨탑이 명중 시 호출. 슬롯 1개 — 최신 각인이 기존 각인을 덮어쓴다. */
applyElementalMark(element: ElementKind, durationMs: number): void;

/** 현재 각인 원소 (없으면 null). UI·격발 판정용. */
get markedElement(): ElementKind | null;

/**
 * `byElement` 와 다른 각인이 걸려 있고 그 원소의 반응 쿨다운이 끝났으면
 * 각인을 소비하고 소비된 원소를 반환. 아니면 null.
 * `byElement === null` (물리 타워)이면 원소 일치 검사 없이 무조건 소비 시도.
 * (각인 원소 === byElement 이면 소비하지 않는다 — 같은 원소는 자기 각인을 못 터뜨림.)
 */
consumeElementalMark(byElement: ElementKind | null): ElementKind | null;

/** 걸려 있는 독 채널 중 가장 센 dps (없으면 0). 부식 파열 계산용. */
strongestPoisonDps(): number;

// update(dtMs) 안에서: mark 가 있으면 mark.leftMs -= dt (0 이하면 null),
// reactionCooldownMs 의 각 값 -= dt (0 이하면 삭제).
```

`Enemy` 엔티티는 기존 패턴(`applySlow`/`applyPoison`/`applyStagger` 가 `this.state.*` 로 위임)대로
얇은 위임을 추가한다: `applyElementalMark`, `consumeElementalMark`, `get markedElement`,
`strongestPoisonDps`. `enemy.state.maxHp` 등 읽기는 기존 `e.state.frozen` 처럼 직접 접근해도 된다.

- 각인 지속: `MARK_DURATION_MS = 2500`. 재명중 시 `leftMs` 를 도로 채운다(갱신).
- `consumeElementalMark` 가 각인을 소비할 때 `reactionCooldownMs.set(element, REACTION[element].cooldownMs)`.
- 쿨다운은 **적별·원소별**. 같은 적이 매 프레임 같은 반응을 맞지 않게 한다(가독성·밸런스).
- `EnemyState` 는 순수 로직. 반응의 *효과*(AoE·전염)는 여기서 실행하지 않는다 — 호출측(Game)이 한다.

## 2. 충전과 발동

### 2.1 인접 정의

상하좌우 4-이웃만. 타일 좌표는 `homePos` 픽셀에서 `Math.floor(x / TILE)`, `Math.floor(y / TILE)`.
두 타워가 인접 = `|dcol| + |drow| === 1`.

### 2.2 충전됨 (charged)

타워 T가 **충전됨** ⟺ 다음을 모두 만족:
1. `getTower(T.key).element != null` (원소 첨탑)
2. T와 4-인접한 타워 중, `getTower(N.key).attack !== 'support'` 이고
   `getTower(N.key).element !== getTower(T.key).element` 인 N이 1기 이상 존재.
   (원소가 없는 물리 타워 `arrow`/`sniper`/`laser`/`ballista` 도 조건 2를 만족시킨다.)

- `Game` 은 두 캐시를 **타워 목록이 바뀔 때만** 재계산 — 설치(`placeTower`), 머지(`doMerge`),
  판매(`removeTower`), 이동(`dragend` snap):
  - `chargedTowers: Set<Tower>` — 충전된 타워 인스턴스 (공명선·시트용)
  - `chargedKeys: Set<string>` — 충전된 타워가 1기라도 있는 key (`dealDamage` 훅용, §2.3)
- 재계산 `recomputeCharged()` 는 O(n²) 순회(첨탑 최대 ~30기). 프레임마다 하지 않는다.
- `Tower.charged: boolean` 필드에도 반영(공명선 렌더·시트 표시용). 재계산 시 갱신.

### 2.3 격발 (detonation)

`Game.dealDamage(towerKey, enemy, packet)` — 모든 직격의 공통 통로 — 안에서, 실제 피해를
가한 **직후**:

```
const towerEl = getTower(towerKey).element ?? null;
const towerIsSupport = getTower(towerKey).attack === 'support';

// 1) 격발: 지원탑이 아니면 다른 각인을 터뜨린다
if (!towerIsSupport) {
  const consumed = enemy.consumeElementalMark(towerEl);
  if (consumed) this.runReaction(consumed, towerKey, enemy, dealtAmount);
}

// 2) 각인: 이 타워가 충전된 원소 첨탑이면 자기 각인을 남긴다
if (towerEl && this.chargedKeys.has(towerKey)) {
  enemy.applyElementalMark(towerEl, MARK_DURATION_MS);
}
```

- `dealtAmount` = 이번 `dealDamage` 호출이 실제로 깎은 체력+보호막(`enemy.takeDamage` 반환값).
  이미 `dealDamage` 가 `dealt` 로 갖고 있다.

- 순서: **격발 먼저, 각인 나중.** 서리(충전)가 뇌전 각인 걸린 적을 때리면
  → 정전 방출 터뜨리고 → 그 자리에 서리 각인을 새로 남긴다.
- `dealDamage` 는 `towerKey`(문자열)만 받는다. 시그니처를 바꾸지 않고 `chargedKeys: Set<string>`
  (충전된 타워가 1기라도 있는 key)로 판정한다: 같은 key 첨탑이 여럿이면 그중 하나라도
  충전이면 각인을 남긴다. (근사지만 실전 차이 무시 가능 — 같은 원소 첨탑 여러 기가
  서로 다른 인접을 갖는 경우는 드물고, 각인 슬롯이 1개라 결과가 같다.)
- 물리 타워(`element` 없음)는 각인을 안 남기고 모든 각인을 격발. `consumeElementalMark(null)`.
- **지원탑**(`command`/`mine`)은 격발도 각인도 하지 않는다. `updateSupportTower` 는 `dealDamage`
  를 거의 안 쓰지만, 쓰더라도 위 `towerIsSupport` 가드가 막는다.

### 2.4 지속 피해(독·화상)와 격발

`EnemyState.update` 안에서 깎이는 독/화상 틱은 `dealDamage` 를 거치지 않는다(기존 구조).
**공명 격발은 직격에서만 일어난다** — 지속 틱은 각인을 남기지도 터뜨리지도 않는다.
역병탑의 각인은 독탄 *직격*(`dealDamage(..., kind:'poison')`, towers.ts `damage` 필드,
현재 Lv1 기준 2~4)에서 남긴다. 직격 데미지가 작아도 명중 자체로 각인은 남는다.

## 3. 반응 4종

`src/data/reactions.ts` 에 테이블. 수치는 **초기값** — 구현 중 `tests/balance` 로 조정한다.

```ts
export const MARK_DURATION_MS = 2500;

export interface ReactionDef {
  key: ElementKind;
  name: string;
  cooldownMs: number;
}

export const REACTIONS: Record<ElementKind, ReactionDef> = {
  ice:       { key: 'ice',       name: '서리 붕괴', cooldownMs: 900 },
  lightning: { key: 'lightning', name: '정전 방출', cooldownMs: 800 },
  decay:     { key: 'decay',     name: '부식 파열', cooldownMs: 900 },
  fire:      { key: 'fire',      name: '과열 폭발', cooldownMs: 1000 },
};

// 서리 붕괴
export const FROST_COLLAPSE = {
  maxHpFraction: 0.05,   // 대상 최대체력의 5%
  flatCap: 220,          // 그 값의 상한
  detonatorRatio: 0,     // 기폭타 비례분 없음(순수 체력비례)
  slowMul: 0.85,
  slowDurationMs: 800,
} as const;

// 정전 방출
export const STATIC_DISCHARGE = {
  jumpRadius: 110,       // px, 기폭당한 적 기준
  maxJumps: 3,
  flat: 40,
  detonatorRatio: 0.35, // 기폭타(직격 실피해)의 35%
} as const;

// 부식 파열
export const CORROSION_BURST = {
  flat: 30,
  poisonDpsRatio: 2.0,   // 대상에 걸린 최강 독 채널 dps 의 2배를 순간타로
  spreadRadius: 70,
  spreadMaxTargets: 4,
  spreadDpsRatio: 0.5,   // 최강 독 dps 의 절반을 전염(source='reaction:decay')
  spreadDurationMs: 1500,
} as const;

// 과열 폭발
export const OVERHEAT = {
  armorBreakPercent: 0.25,
  armorBreakDurationMs: 2000,
  burnDps: 24,
  burnDurationMs: 1600,
  burnSource: 'reaction:fire',
  detonatorRatio: 0.4,   // 기폭타의 40% 순간타
} as const;
```

### 3.1 순수 계산 헬퍼 (`src/systems/combat.ts`)

```ts
/** 서리 붕괴 순간 피해량. 장갑·저항 무시로 체력에 직접(호출측이 ignoreShield 처리). */
export function frostCollapseDamage(targetMaxHp: number): number;
// = Math.round(Math.min(targetMaxHp * FROST_COLLAPSE.maxHpFraction, FROST_COLLAPSE.flatCap))

/** 정전 방출 점프 대상: 기폭 위치 기준 jumpRadius 내 살아있는 적 최근접순 maxJumps 명(기폭 대상 제외). */
export function dischargeTargets(origin: Vec2, all: Targetable[], excludeId: number): Targetable[];

/** 반응 순간타(정전·과열의 detonatorRatio 분). dealtAmount = 이번 직격이 실제로 깎은 체력. */
export function reactionBonusDamage(dealtAmount: number, ratio: number, flat: number): number;
```

인접 판정도 순수 함수로:

```ts
/** 4-이웃 인접 여부. a,b 는 타일 좌표. */
export function isOrthAdjacent(a: TileCoord, b: TileCoord): boolean;
```

### 3.2 반응 실행 (`Game.runReaction`)

```ts
private runReaction(el: ElementKind, byTowerKey: string, target: Enemy, dealtAmount: number): void
```

| 원소 | 실행 |
|---|---|
| `ice` | `frostCollapseDamage(target.state.maxHp)` 를 `dealDamage(byTowerKey, target, { amount, kind:'single', ignoreShield:true, armorPierce: 9999 })`. `target.applySlow(0.85, 800)`. |
| `lightning` | `dischargeTargets` 로 최대 3명, 각자 `dealDamage(byTowerKey, e, { amount: reactionBonusDamage(dealtAmount, 0.35, 40), kind:'chain' })` (= 40 + 실피해 35%). |
| `decay` | 대상 최강 독 dps 조회(`enemy.strongestPoisonDps()`) → 순간타 `30 + dps*2` `dealDamage(byTowerKey, ..., kind:'poison')`. 이어 `enemiesInRadius(target.pos, 70, ...)` 최대 4명에 `applyPoison(byTowerKey, dps*0.5, 1500)`. 독 없으면 flat 30 만. |
| `fire` | `enemy.applyArmorBreak(0.25, 2000)`, `enemy.applyPoison(byTowerKey, 24, 1600)`(화상=독 채널 재사용, 기존 대포 B 와 동일 방식), 순간타 `dealDamage(byTowerKey, enemy, { amount: reactionBonusDamage(dealtAmount, 0.4, 0), kind:'splash' })`. |

- 모든 `dealDamage`/`applyPoison` 는 `byTowerKey`(터뜨린 타워) 로 기여도 귀속.
- `reaction:decay` / `reaction:fire` 독 채널은 `collectPoisonDamage` 를 통해 결과창에 집계된다.
  현재 `Game` 의 집계 루프(`for (const {source, amount} of e.collectPoisonDamage())
  this.creditDamage(source, amount)`)는 `source` 를 그대로 key 로 쓴다 →
  `reaction:decay` 같은 가짜 key 가 `damageByTower` 에 들어가면 결과창에 이상하게 뜬다.
  **해결**: 집계 시 `source.startsWith('reaction:')` 이면 마지막 격발 타워로 귀속할 수 없으므로,
  `applyPoison` 의 source 를 `reaction:decay` 대신 **터뜨린 타워 key** 로 넘긴다.
  즉 전염 독의 source = `byTowerKey`. (대포 B 화상이 이미 `tower.key` 를 쓰는 것과 동일.)
  `reactions.ts` 의 `burnSource`/전염 상수는 문서용으로만 남기고 실제 호출은 `byTowerKey`.

### 3.3 밸런스 목표

- "인접 Lv3 두 기 + 콤보" 의 실효 DPS ≈ "Lv4 한 기" ± 15%. 명백히 세면 수치를 깎는다.
- 서리 붕괴 체력비례분은 **상한(flatCap)** 으로 보스 즉살을 막는다. 무한 모드 보스 체력이
  수만~수십만이라도 서리 붕괴 1회 = 최대 220.
- 반응은 원소 첨탑 + 파트너를 **둘 다** 계속 사격 상태로 유지해야 나온다. 한 기가 죽거나
  표적이 갈리면 끊긴다 — 자연스러운 상한.

## 4. UI / 손맛

### 4.1 공명선

- 유효 링크(2.2 조건 2를 만족하는 인접 쌍)마다 두 타일 중심을 잇는 짧은 룬 빛줄기.
- `Game` 이 충전 재계산 때 같이 갱신. `Phaser.GameObjects.Line` 또는 얇은 사각형,
  `depth` 는 타워(10)보다 아래(2~3), 은은한 아케인 색(`COLORS` 에 `resonance` 추가 or 기존 재사용).
- 가짜 씬 가드: `typeof this.add.line === 'function'` 체크 후 생성(기존 beam/aura 패턴과 동일).

### 4.2 반응 이펙트

- 반응별 색이 다른 파열 팝(기존 처치 팝/착탄 링 스타일 재사용) + 짧은 효과음.
  - 서리 붕괴: 하늘색 유리 파편 팝
  - 정전 방출: 노란 분기 스파크(점프 대상까지 얇은 선 1프레임)
  - 부식 파열: 녹색 포자 링
  - 과열 폭발: 주황 열파 링
- **화면 흔들림 없음**(사용자 확정 — 멀미).
- 새 효과음이 필요하면 `scripts/generate-sfx.mjs` 에 항목 추가 후 `npm run sfx:generate`.
  없으면 기존 효과음 재사용(`impact` 계열).

### 4.3 정보 시트 (`BottomSheet` inspect)

`Game.inspectView(tower)` 의 `lines` 에 조건부 한 줄:

- 충전된 원소 첨탑: `공명 충전 · {각인이름}` (예: `공명 충전 · 서리 각인`)
- 원소는 없지만 인접에 충전 가능한 원소 첨탑이 있는 기폭기:
  `공명 기폭 · {인접 원소 첨탑 이름} → {반응 이름}` (여러 개면 쉼표)
- 아무것도 없으면 줄 생략.

### 4.4 배치 중 힌트 (후순위 / v1 선택)

빈 칸 배치 미리보기 때 4-인접에 원소 첨탑이 있으면 그 타일에 옅은 공명색 링.
시간 남으면. v1 필수 아님.

## 5. 파일 변경

| 파일 | 변경 |
|---|---|
| `src/core/types.ts` | `ElementKind` 타입, `TowerDef.element?` |
| `src/data/towers.ts` | `frost`/`bolt`/`poison`/`cannon` 에 `element` |
| `src/data/reactions.ts` | **신규** — `MARK_DURATION_MS`, `REACTIONS`, 4개 반응 상수 |
| `src/systems/EnemyState.ts` | 각인 슬롯, 반응 쿨다운 맵, `applyElementalMark`/`markedElement`/`consumeElementalMark`/`strongestPoisonDps`, `update` 감소 |
| `src/systems/combat.ts` | `frostCollapseDamage`, `dischargeTargets`, `reactionBonusDamage`, `isOrthAdjacent` |
| `src/scenes/Game.ts` | `chargedTowers: Set<Tower>` + `chargedKeys: Set<string>` + `recomputeCharged()`, `dealDamage` 훅, `runReaction`, 공명선 렌더/갱신, `inspectView` 줄, SHUTDOWN 정리 |
| `src/entities/Enemy.ts` | `applyElementalMark`/`consumeElementalMark`/`get markedElement`/`strongestPoisonDps` 위임 |
| `src/entities/Tower.ts` | `charged: boolean` 필드 |
| `src/core/towerInfo.ts` | (해당 시) 원소/공명은 DPS 계산에 안 들어감 — 변경 없음 확인만 |
| `tests/systems/enemyState.test.ts` | 각인 부여·만료·소비·쿨다운·최신덮어쓰기 |
| `tests/systems/combat.test.ts` | `frostCollapseDamage` 상한, `dischargeTargets` 선택, `isOrthAdjacent` |
| `tests/balance/reactions.test.ts` | **신규** — 각인+기폭 발동 시뮬, 4반응 각각 피해 밴드, "미충전 첨탑은 각인 없음" |
| `tests/balance/harness.ts` | 가짜 씬에 `add.line` no-op 확인, `runReaction` 경로가 안 깨지는지 |
| `tests/balance/monoTower.test.ts` | 무영향 확인(홀로 = 미충전) |
| `docs/ROADMAP.md` | "완료" 에 첨탑 공명 항목, "다음" 의 C 체크 |

## 6. 검증

1. `npm test` + `npm run build` 통과.
2. `tests/balance/balance.test.ts` 회귀 — 불변 유지:
   - "방어 안 함" 전패
   - 단일 화살 머지 빌드는 마지막 스테이지 승리 불가 (화살=원소 없음, 각인 못 남김)
   - 후반 조합은 여전히 적 특성 카운터 필요
3. `tests/balance/monoTower.test.ts` — 6종 솔로 클리어 밴드 무변.
4. 브라우저(모바일 375×812):
   - 서리탑 + 화살탑 인접 → 공명선. 서리가 적 얼림 → 화살 명중 → 서리 붕괴 팝.
   - 서리탑 + 번개탑 인접 → 양방향. 둘 다 각각 반응.
   - 서리탑 코너 홀로 → 공명선 없음, 각인 안 생김.
   - 정보 시트에 `공명 충전 · 서리 각인` / `공명 기폭 · …` 줄.
   - `read_console_messages` 에러 없음. 스크린샷: 공명선, 반응 팝, 시트.

## 7. 비목표 (v1 제외)

- 다중 각인 슬롯 (동시에 서리+부식). v1 은 슬롯 1개, 최신 덮어쓰기.
- `laser` 원소.
- 대각선 인접, 사거리 기반 공명.
- 3첨탑 이상 연쇄 반응(A→B→C).
- 지원탑(지휘·연금)의 공명 참여.
- 배치 중 인접 링크 하이라이트는 시간 남으면(4.4).

## 8. 리스크

- **스프레드 회귀**: 반응이 세면 "다양하게 넓게" 가 "높게 쌓기" 를 이긴다. `tests/balance`
  로 계속 확인. 세면 수치를 깎지 반응을 없애진 않는다.
- **가독성**: 4반응 팝이 동시에 터지면 화면이 시끄럽다. 쿨다운·색 구분으로 완화. 실기기 확인은 사용자.
- **집계 오염**: `reaction:*` 가짜 source 가 결과창에 새지 않도록 전염 독 source = 터뜨린 타워 key (3.2).
- `dealDamage` 훅이 뜨거운 경로 — 각인/격발 판정은 O(1) (Set.has, 맵 조회)로 유지.
