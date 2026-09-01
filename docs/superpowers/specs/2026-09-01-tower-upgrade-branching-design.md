# 타워 업그레이드 분기 (전투형 6종) — 설계

작성 2026-09-01. 상위 규칙 [/AGENTS.md](../../../AGENTS.md), 방향 [docs/ROADMAP.md](../../ROADMAP.md).

## 목표

게임이 얕은 이유: **상성이 빌드를 하나로 고정**시킨다("마광탑 주력 + 파열/번개/역병 1기씩"이
유일한 정답). 타워마다 Lv3에서 두 갈래로 특화 경로가 생기면 "어떤 타워"가 "어떤 타워 +
어떤 빌드"가 되어 판마다 다른 선택이 생긴다.

이번 범위 = **분기 메커니즘 + 전투형 6종**(화살·파열·서리·번개·저격·역병).
마광·지휘·연금·창공은 2차, 시너지(C)·판중 선택(B)은 후속 사이클.

## 결정 사항 (브레인스토밍 2026-09-01)

- **Lv3에서 분기.** Lv1~2 공통. Lv2→Lv3 올릴 때(머지든 골드 강화든) 경로 A/B 선택창.
- **타워당 2경로.** 한 경로는 기존 3·5합 능력을 이어받고, 다른 경로는 신규.
- **수치 성향도 갈라진다** — 경로마다 Lv3~5 `TowerLevelStats`를 따로 가짐. "어떤 효과"가
  아니라 "어떤 빌드".
- 데이터 모델 = `TowerDef.paths` 하위 구조. 기존 3·5합 능력은 `TowerLevelStats` 필드로 흡수,
  `mergeEffects.ts`는 삭제.
- 밸런스는 Claude. Codex는 경로별 아트(스프라이트 틴트/변형)만 — 당분간 기존 시트 재사용.

## 1. 데이터 모델 (`src/core/types.ts`, `src/data/towers.ts`)

```ts
export interface TowerPathDef {
  key: 'a' | 'b';
  name: string;   // "관통형"
  desc: string;   // 한 줄 (선택창·도감)
  levels: TowerLevelStats[];   // 정확히 3 = Lv3, Lv4, Lv5
}

export interface TowerDef {
  key: string; name: string; attack: AttackKind; cost: number; maxLevel: 5;
  targetsGround?: boolean; targetsAir?: boolean;
  levels: TowerLevelStats[];               // 분기 타워는 길이 2, 그 외 5
  paths?: { a: TowerPathDef; b: TowerPathDef };
}
```

`TowerLevelStats`에 추가(기존 3·5합 흡수):
```ts
  // 서리탑 빙결
  freezeHits?: number; freezeDurationMs?: number; freezeCooldownMs?: number;
  // 번개탑 경직
  staggerDurationMs?: number; staggerCooldownMs?: number;
  // 저격탑 처형
  executeHealthRatio?: number; executeDamageMultiplier?: number;
  // 역병탑 방어 무시
  poisonArmorPierce?: number;
  // 역병탑 B: 중독 전염
  poisonSpreadRadius?: number; poisonSpreadRatio?: number;
  // 저격탑 B: 라인 관통(경로상 모든 적)
  pierceAll?: boolean;
  // 서리탑 B: 지속 냉기장 (투사체 대신 반경 내 상시 감속)
  slowAura?: boolean; slowAuraRadius?: number;
  // 번개탑 B: 방어막 완전 무시
  shieldPierce?: boolean;
  // 대포 B: 착탄 지점 장판 화상
  burnDps?: number; burnDurationMs?: number; burnRadius?: number;
```
(이미 있음: `projectileCount`, `projectileDamageMultiplier`, `armorBreakPercent`,
`armorBreakDurationMs`, `armorPierce`, `splashRadius`, `chainTargets`, `chainFalloff`,
`chainRange`, `slowMul`, `slowDurationMs`, `poisonDps`, `poisonDurationMs`, `poisonRadius`)

`mergeEffects.ts` 삭제. `sniperDamageMultiplier(level, ratio)` 상당 로직은
`src/systems/combat.ts`에 `executeMultiplier(stats, targetHealthRatio)` 로 재작성
(경로 stat 필드를 읽는 순수 함수).

**검증 테스트** (`tests/data/towerPaths.test.ts`):
- 분기 6종: `levels.length === 2`, `paths` 존재, `paths.a.levels.length === 3`, `paths.b` 동일.
- 비분기 4종: `levels.length === maxLevel`, `paths === undefined`.
- 모든 경로 Lv5 `damage`가 Lv3 `damage`보다 크다(성장 단조성).

## 2. `Tower` 엔티티 (`src/entities/Tower.ts`)

```ts
export class Tower {
  level = 1;
  path: 'a' | 'b' | null = null;   // Lv3 도달 시 확정. Lv1~2 는 null.
  ...
  stats(): TowerLevelStats {
    const def = getTower(this.key);
    if (this.level <= 2 || !def.paths || !this.path) return def.levels[this.level - 1];
    return def.paths[this.path].levels[this.level - 3];
  }
  /** Lv3 로 올리며 경로를 확정. 이미 경로 있으면 그대로 레벨만. */
  setLevel(n: number, path?: 'a' | 'b'): void {
    const clamped = Math.min(Math.max(n, 1), this.maxLevel);
    if (clamped >= 3 && !this.path) this.path = path ?? 'a';  // path 미지정 방어: 'a'
    this.level = clamped;
    // ... 기존 스프라이트/스케일 갱신
  }
  get needsPathChoice(): boolean {
    const def = getTower(this.key);
    return !!def.paths && this.level === 2 && !this.path;
  }
}
```

경로 확정 후 스프라이트: 당분간 `sprite.setTint(path === 'b' ? 0xffd9a0 : 0xffffff)` 정도로
살짝 구분. Codex 아트 나오면 교체.

## 3. 경로 선택 흐름 + UI

`src/scenes/Game.ts` — 머지·골드강화 두 경로 모두 Lv2→Lv3 시 선택창을 띄운다.

**PathChoiceMenu** (신규, `src/ui/PathChoiceMenu.ts` — BuildMenu 패턴):
- `open(tower, at, onPick: (path:'a'|'b')=>void)` — 두 카드(A/B): 경로명 + desc + 핵심 수치 미리보기.
- 게임을 잠시 멈추지 않고(웨이브 진행 중일 수 있음) 뜬다. 다른 곳 탭하면 닫히고 강화 취소.

**머지 (`dragend`)**: `canMerge` 통과 → 결과가 Lv3이고 `targetTower.needsPathChoice` 면
선택창을 띄우고, 콜백에서 `targetTower.setLevel(3, path)` + dragged 제거 + 연출.
(선택창 뜨는 동안 dragged 는 스냅백해 두고, 취소 시 머지 안 함.)

**골드 강화 (`tryUpgradeSelected`)**: 비용 차감 전에 — Lv2→Lv3 면 선택창부터.
콜백에서 `spend(cost)` 성공 시 `setLevel(3, path)`.

**머지 규칙** (`src/systems/MergeController.ts`):
```ts
export interface MergeCandidate { id; key; level; path?: 'a' | 'b' | null; }
export function canMerge(a, b, maxLevel): boolean {
  return a.id !== b.id && a.key === b.key && a.level === b.level
    && a.level < maxLevel
    && (a.level < 2 || a.path === b.path);   // Lv2 이하는 경로 무관, Lv3+는 같은 경로만
}
```
Lv2 두 기 머지 → Lv3 (선택창). Lv3A + Lv3A → Lv4A. Lv3A + Lv3B → 머지 불가(자리 교체됨).
드래그 중 머지 힌트(`showMergeHints`)도 이 규칙 반영.

## 4. 전투 · 정보 · 도감

**`Game.updateTowers`**: `effectiveStats(tower)` 가 `tower.stats()` 를 쓰므로 경로별 수치는
자동. 추가 처리:
- `pierceAll` (저격 B): 투사체가 첫 표적에서 멈추지 않고 진행 방향 라인의 모든 적 타격.
- `slowAura` (서리 B): 쿨다운/투사체 대신 매 프레임 `enemiesInRadius(homePos, slowAuraRadius)`
  전부에 `applySlow` + `takeDamage(stats.damage * dt)`.
- `shieldPierce` (번개 B): `takeDamage` 에 `ignoreShield: true` 플래그 (EnemyState 처리).
- `burnDps` (대포 B): splash `onHit` 에서 지면 장판 — `enemiesInRadius`에 `applyPoison`
  재사용(kind 구분은 안 함, 시각만 주황).
- `poisonSpread` (역병 B): 중독 적이 죽거나 틱마다 `poisonSpreadRadius` 내 적에게
  `applyPoison(dps * poisonSpreadRatio, ...)`.
- 처형: `mergeEffects.sniperDamageMultiplier` → `combat.executeMultiplier(stats, ratio)`.
- 빙결/경직: `stats.freezeHits` / `stats.staggerDurationMs` 등 직접 읽기.

**`towerInfo.ts`**: `towerInfo(key, level, path?)`. `path` 없으면 Lv1~2 기준 또는
"Lv3부터 경로 선택" 표기. `noteOf` 는 경로 stat 필드에서 노트 생성.

**`codex.ts` / `Codex.ts`**: 분기 타워 카드에 A/B 두 하위 블록 — 경로명·desc·Lv3/5 수치.
비분기 타워는 현행.

**밸런스 하네스** (`tests/balance/harness.ts`): `merge(from, to, path?)` — Lv2→3 머지 시
`path` 기본 'a'. 전략이 경로 지정 가능. `monoTower`/`mergeArmy` 는 각 타워 A 경로로 고정
(회귀 안정). 새 전략 `pathBuild(specs)` 추가로 B 경로도 시뮬.

## 5. 6종 경로 설계 (초안 — 밸런스 패스에서 확정)

`cost`·Lv1~2 는 현행 유지. 아래는 Lv3/Lv4/Lv5 방향.

### 화살탑 (single)
- **A 연발형** — 기존 멀티샷 계승. `projectileCount 3/3/4`, `projectileDamageMultiplier 0.6/0.6/0.55`,
  `fireRate` +15%. 뭉친 스웜.
- **B 관통형** — 멀티샷 없음. 단발 강타: `damage` ×1.8, `range` +25%, `armorPierce 4/7/12`,
  `executeHealthRatio 0.25` 수준의 첫 명중 보너스. 단일·장갑.

### 파열탑 (splash)
- **A 제압형** — 기존 방어파괴 계승. `splashRadius` +20%, `damage` +15%,
  `armorBreakPercent 0.2/0.2/0.35`. 대장갑·거점.
- **B 융단형** — 방어파괴 없음. `fireRate` ×2, `damage` ×0.55, `splashRadius` +10%,
  `burnDps`/`burnDurationMs 1400`/`burnRadius = splashRadius`. 스웜 융단폭격.

### 서리탑 (slow)
- **A 빙결형** — 기존 빙결 계승·강화. `freezeHits 3→2`(더 자주), `freezeDurationMs 700/900/1100`,
  `slowMul` 더 낮게. 하드 CC.
- **B 냉기장형** — 투사체 없음. `slowAura`, `slowAuraRadius 150/165/185`, 반경 내 상시
  감속 + `damage`(작게) 지속 틱. 지역 통제.

### 번개탑 (chain)
- **A 과부하형** — 기존 경직 계승. `chainTargets +1/+1/+2`, `chainFalloff` 높게,
  `staggerDurationMs 250/300/400`. 군중 교란.
- **B 직격형** — 연쇄 없음(`chainTargets 0`). `damage` ×2.4, `shieldPierce: true`,
  `range` +15%. 대방어막 단일.

### 저격탑 (single, pierce)
- **A 처형형** — 기존 처형 계승·강화. `executeHealthRatio 0.35/0.4/0.5`,
  `executeDamageMultiplier 1.8/2.2/3.0`. 보스·정예 마무리.
- **B 관통형(레일건)** — 처형 없음. `pierceAll: true`(경로상 라인 전체),
  `range` +20%, `fireRate` ×0.8, `damage` +30%. 레인 청소.

### 역병탑 (poison)
- **A 부식형** — 기존 방어무시 계승. `poisonDps` +30%, `poisonDurationMs` +20%,
  `poisonArmorPierce 10/12/18`, 중독 중 적 `armor` -3 상시. 대탱커.
- **B 역병확산형** — `poisonSpreadRadius 60/72/88`, `poisonSpreadRatio 0.55`,
  `poisonDps` 개당 낮게. 스웜 연쇄 용해.

## 6. 테스트 · 밸런스

- `towerPaths.test.ts` (섹션 1).
- `MergeController.test.ts`: Lv2 경로 무관 머지, Lv3 동경로만, 이경로 불가.
- `Tower.test.ts`: `setLevel(3,'b')` → `stats()` 가 `paths.b.levels[0]`. `needsPathChoice`.
- `combat.test.ts`: `executeMultiplier`, `pierceAll` 대상 선정, `poisonSpread`.
- `tests/balance/monoTower.test.ts`: 각 전투탑을 **A·B 각각** 매트릭스에 넣고 invariant
  재확인 — 어떤 경로도 후반 3스테이지를 편하게 솔로 못 함. arrow(A/B) 둘 다 피날레 못 깸.
- `tests/balance/balance.test.ts`: `mixedMerge` 를 A/B 섞은 버전으로도.
- 밸런스 패스: `pathBuild` 시뮬로 A vs B 우열 확인, 한쪽이 압도하면 수치 조정.
  "no arbitrary softening" — 경로는 트레이드오프지 상향이 아님.

## 7. 비목표 (YAGNI)

- 마광·지휘·연금·창공 분기 (2차)
- 3번째 경로
- 경로 재선택/초기화 (한번 정하면 고정 — 판매 후 재건축이 유일한 되돌리기)
- 경로별 전용 스프라이트 시트 (틴트로 시작)
- 타워 시너지(C), 판중 선택(B) — 별도 사이클
- 경로 선택을 저장(메타)에 남기기 — 타워는 판 단위라 무관

## 리스크

- **밸런스 표면 2배**: 6종 × 2경로 = 12개 Lv3~5 수치 세트. 시뮬 + 손 검증 필수.
- **머지 규칙 변경**이 드래그·힌트·자리교체 로직과 얽힘 — `MergeController` 순수 함수로
  격리하고 Game.ts 는 얇게.
- `mergeEffects.ts` 삭제가 Game.ts·towerInfo.ts·테스트 다수 건드림 — 필드 이관을
  한 커밋으로 깔끔히.
- 선택창이 웨이브 진행 중 뜸 — 게임 안 멈추므로 그 사이 적이 새면 손해. 의도된 압박(빠른 결정).
