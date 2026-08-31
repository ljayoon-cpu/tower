# 공중 유닛 + 대공탑 + 월드 3 — 설계

작성 2026-08-31. 상위 규칙 [/AGENTS.md](../../../AGENTS.md), 방향 [docs/ROADMAP.md](../../ROADMAP.md),
세계관 [docs/world.md](../../world.md).

## 목표

리텐션 콘텐츠. 코어(보상) 경제가 얕다는 판단 → 먼저 **콘텐츠 자체를 늘린다**:
공중 적 레이어 + 대공 전용 타워 + 월드 3 (3-1~3-7).

메타 진행(업적/일일도전/해금)은 이번 범위 밖. "다음 월드를 본다"가 당분간의 보상.

## 담당 경계

사용자 지시(2026-08-31): **"그냥 너가 다 해, 이미지만 코덱스에 맡긴다."**
AGENTS.md의 Codex 구역(`enemies.ts`·`towers.ts`·`Enemy.ts`·`EnemyState.ts`)을 이번 작업에
한해 Claude가 전부 담당한다.

| Claude (전부) | Codex |
|---|---|
| 공중 메커니즘, 타겟 필터, 렌더 로직, 대공탑, 공중 적 정의·이름·수치, 월드 3 맵·웨이브, 밸런스 | **아트만** — 공중 적 스프라이트, 창공탑 텍스처 등 (당분간 `generateTexture` 도형으로 진행하다가 교체) |

수치는 `monoTower.test.ts`·`balance.test.ts` 회귀선을 지키고, `tests/balance` 시뮬 + 사용자
손 검증으로 확정한다. 적/타워 이름은 [docs/world.md](../../world.md) 톤에 맞춘다(`key` 고정).

## 결정 사항 (브레인스토밍)

1. **공중 이동 = 지상과 동일 경로.** 별도 공중 경로 없음. 공중 적은 지상 적과 똑같은
   `PathManager` 폴리라인을 쓴다. 렌더만 위로 띄우고(고도 오프셋 + 바닥 그림자), 벽 위를
   나는 연출은 폴리라인이 원래 길을 따라가므로 자동으로 얻어진다.
2. **지상 전용 타워: 파열탑(cannon)·역병탑(poison).** 나머지 공격형 6종(화살·서리·번개·저격·
   마광 + 신규 대공탑)은 공중 타격 가능.
3. **신규 대공 전용 타워 1종 (10번째).** 공중 특화 — 공중에 매우 강하고 지상엔 약하다
   (못 치는 건 아님). 세계관 이름 "창공탑", `key: 'ballista'` 고정.
4. **월드 3 = 신규 7스테이지 (3-1~3-7).** 새 테마, 공중 적 본격 등장, 3-7 공중 보스 피날레.

## 1. 데이터 모델 (`src/core/types.ts`)

```ts
// TowerDef
targetsGround?: boolean;   // 기본 true
targetsAir?: boolean;      // 기본 true

// TowerLevelStats
airDamageMultiplier?: number;   // 공중 표적에 곱하는 피해 배율. 기본 1. 대공탑이 크게 가짐.
```

`MovementLayer = 'ground' | 'air'`, `EnemyDef.movementLayer?`는 이미 존재. 기본 `'ground'`.

`Targetable` (`src/systems/TargetingSystem.ts`)에 `layer: MovementLayer` 추가 (필수).
`pickTarget`·`enemiesInRadius`는 시그니처 불변 — 호출부(`Game.updateTowers`)에서 이미 필터된
배열을 넘긴다. 단 `enemiesInRadius`는 스플래시/독이 "지상만" 맞추도록 옵션 인자를 받는다:

```ts
export function enemiesInRadius(
  center: Vec2, radius: number, enemies: Targetable[],
  layers?: ReadonlySet<MovementLayer>,   // 생략 시 전부
): Targetable[]
```

## 2. `Enemy` (`src/entities/Enemy.ts`)

- `get layer(): MovementLayer { return this.def.movementLayer ?? 'ground'; }`
- `update()`에서 경로상 좌표 `a.pos`를 별도 필드 `groundPos`에 보관한다. **`get pos`는
  항상 `groundPos`를 돌려준다** — 지상/공중 모두 사거리 판정은 "길 위 그림자" 기준
  (타워 배치 감각이 레이어 무관하게 동일). 스프라이트 y만 레이어에 따라 달라진다.
- `layer === 'air'`이면:
  - `AIR_ALTITUDE = 22`: `sprite.setPosition(a.pos.x, a.pos.y - AIR_ALTITUDE + bob)`,
    `bob = Math.sin(this.walkElapsedMs / 260) * 2` (순수 연출, `pos`에 안 들어감).
  - 바닥 그림자: 반투명 타원(`scene.add.ellipse`), depth 3, 매 프레임 `a.pos`(그림자니까
    고도 오프셋 없음)로 이동.
  - 체력바·아우라 y 오프셋에 `AIR_ALTITUDE`를 더 뺀다.
- `destroy()`에서 그림자도 정리. 테스트 가짜 씬에 `add.ellipse` no-op 추가 필요.

체력바 등 인디케이터 y 오프셋은 공중일 때 `AIR_ALTITUDE`만큼 더 위로.

## 3. 타겟 필터 (`src/scenes/Game.ts` `updateTowers`)

```ts
const def = getTower(tower.key);
const canGround = def.targetsGround ?? true;
const canAir = def.targetsAir ?? true;
const eligible = this.enemies.filter(e =>
  (e.layer === 'ground' ? canGround : canAir));
const target = pickTarget(tower.homePos, s.range, eligible, tower.priority);
```

- 스플래시/독 `onHit`의 `enemiesInRadius` 호출에 `layers` 전달 (cannon·poison은 `{'ground'}`).
- 데미지 계산에 `airDamageMultiplier`: 표적이 공중이면
  `amount = Math.round(baseDamage * (s.airDamageMultiplier ?? 1))`. beam/chain/splash 각 경로에 적용.
- `beam`(마광탑)·`support`는 기존 분기 유지. beam은 표적 레이어 필터만 추가.

## 4. 신규 타워 "창공탑" (`ballista`)

`src/data/towers.ts` 10번째. `attack: 'single'`, `targetsAir: true`, `targetsGround: true`.
지상엔 약하게 (낮은 damage·fireRate), 공중엔 `airDamageMultiplier`로 크게.

스캐폴딩 수치 (Codex 재조정 대상):

```ts
ballista: {
  key: 'ballista', name: '창공탑', attack: 'single', cost: 105, maxLevel: 5,
  levels: [
    { damage: 12, range: 210, fireRate: 1.3, airDamageMultiplier: 3.4, armorPierce: 2 },
    { damage: 22, range: 224, fireRate: 1.4, airDamageMultiplier: 3.6, armorPierce: 3 },
    { damage: 42, range: 240, fireRate: 1.5, airDamageMultiplier: 3.8, armorPierce: 5, projectileCount: 2, projectileDamageMultiplier: 0.6 },
    { damage: 82, range: 256, fireRate: 1.6, airDamageMultiplier: 4.1, armorPierce: 7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
    { damage: 160, range: 274, fireRate: 1.7, airDamageMultiplier: 4.5, armorPierce: 10, projectileCount: 3, projectileDamageMultiplier: 0.45 },
  ],
},
```

머지 3·5합 = 공중 다중 사격(위 `projectileCount`) — 공중 스웜 대응. `COLORS.ballista` 추가,
`ui/textures.ts`에 도형 스프라이트, `PROJECTILE_TEXTURE` 항목, BuildMenu는 `TOWER_KEYS`
순회라 자동 노출.

`towerInfo.ts` `noteOf`: `airDamageMultiplier > 1`이면 `대공 피해 x{n}` 노트.

## 5. 공중 적 (4종)

`src/data/enemies.ts`. `movementLayer: 'air'`. 세계관: 태엽 군단의 비행 편대.

| key | 이름 | 역할 | 개략 수치 (구현 시 시뮬로 조정) |
|---|---|---|---|
| `drone` | 정찰 비행체 | 공중 스웜 필러. 빠르고 물렁 | hp 26, speed 120, bounty 4, lifeDamage 1 |
| `gunship` | 포격 비행정 | 느리고 단단, lifeDamage 큼 | hp 200, speed 46, bounty 18, lifeDamage 3, armor 4 |
| `carrier` | 강하 수송선 | 죽으면 지상 잡졸 투하 (`deathSpawn` → `minion` 3) | hp 260, speed 40, bounty 20, lifeDamage 2 |
| `airboss` | 공중 기함 | 3-7 피날레. `isBoss`, bossPhases(가속·증원) | hp 2200, speed 70, bounty 180, lifeDamage 6, armor 6 |

`resist`: 대공탑(`single`)·번개(`chain`)에 표준, 마광(`beam`)에 약간 강 등 — 구현 시 확정.
`carrier`의 `deathSpawn` 잡졸은 **지상** 레이어라 착지 후 지상 타워가 처리.
아트는 Codex 담당 전까지 `generateTexture` 도형(`WALK_ANIMATED` 미포함).

Preload/textures: 공중 적도 당분간 `generateTexture` 도형 (걷기 시트 없음, `WALK_ANIMATED` 미포함).

## 6. 월드 3 (`src/data/stages/stage-3-*.ts`)

**테마**: 용광로(월드 2)를 뚫자 태엽 군단이 산정상 **부유 병기창**에서 비행 편대를 띄운다.
구름 위, 찬 공기, 강철 비행선 실루엣. `WORLD_THEMES['3']` = 차가운 청회색 하늘 팔레트
(예: `path: 0x3a4a63, buildable: 0x1e2740`). `constants.ts`에 추가.

**7스테이지 곡선** (맵 골격은 기존 링/분기 재사용·변형, 웨이브는 `tests/balance` 시뮬로 조정):

| 스테이지 | 도입 | 비고 |
|---|---|---|
| 3-1 | 공중 도입 — `drone` 소수 + 지상 혼합 | 대공탑 없이도 화살/저격으로 가능 |
| 3-2 | `drone` 스웜 본격 | 대공 커버 필요 시작 |
| 3-3 | `gunship` 등장 (단단한 공중) | 마광/저격 대공 조합 |
| 3-4 | 지상·공중 동시 압박 | 파열탑(지상)만으론 공중 누수 |
| 3-5 | `carrier` — 공중+투하 잡졸 | 레이어 전환 대응 |
| 3-6 | 대규모 혼성, 준보스 `crusher`(지상) + `gunship` 편대 | |
| 3-7 | **`airboss` 피날레**, `bossStage: true` (타워 1종 랜덤 봉인) | |

`stages/index.ts`에 3-1~3-7 등록. `starThresholds`는 기존 패턴 유지. `startGold`는 공중 대응
빌드를 세울 여유가 있게 월드 2보다 약간 높게 초안.

## 7. 테스트

- **`tests/systems/targeting.test.ts` (신규)**: 레이어 필터 — 지상 전용 타워는 공중 표적을
  못 고른다, 대공 가능 타워는 고른다, `airDamageMultiplier` 적용, `enemiesInRadius` 레이어 옵션.
- **`tests/entities/Enemy.test.ts`**: 공중 적 `get layer === 'air'`, `pos`가 그림자(지상 투영)
  기준, 그림자 오브젝트 생성/정리. 가짜 씬에 `add.ellipse` 추가.
- **`tests/data/towerCost.test.ts` / 기타**: `ballista` 포함해도 기존 단언 유지 확인.
- **`tests/balance/monoTower.test.ts`**: invariant #1(모든 비지원 공격탑이 1-1 솔로)에서
  `ballista` 제외 — 대공 특화라 지상 솔로 비대상. 주석으로 사유. invariant #2(후반 3스테이지
  ≤1 솔로)는 3-5·3-6·3-7 대상이 되며 공중 강제로 지상 단일탑은 자연 탈락 (상한이라 OK).
- **`tests/balance/balance.test.ts`**: `noDefense` 전패 단언이 월드 3에서도 성립해야 함
  (공중 누수로 라이프 0). `mixedMerge`가 3-7을 못 깨는 단언은 유지.
- **`tests/balance/harness.ts`**: `simulate`가 `this.enemies`를 그대로 타겟에 넘기므로
  `Enemy`에 `layer` 게터만 있으면 동작. 가짜 씬 `add`에 `ellipse` no-op 추가.
- **`tests/architecture.test.ts`**: `core`/`systems`가 phaser 미임포트 — 유지 (변경 없음).
- `npm test` + `npm run build` 그린.

## 8. 비목표 (YAGNI)

- 별도 공중 경로/지름길
- 공중 적 걷기(비행) 스프라이트 시트 — 도형으로 시작
- 대공탑을 지상 완전 불가로 (약하게만)
- 업적·해금·일일도전
- 무한 모드에 공중 편입 — 월드 3 안정화 후 별도 판단

## 리스크

- **Codex 구역 동시 편집.** 사용자가 Claude 전담으로 정리했으나, Codex가 아트 교체하며
  `enemies.ts`/`textures.ts`를 만질 수 있음. 작업 전 `git fetch`, 한 기능 한 커밋, `origin/main`
  위 rebase. 큰 충돌 시 사용자에게 알림.
- **밸런스 시뮬은 하한선.** 공중 수치는 시뮬 통과 후 사용자 손 검증으로 확정.
- 월드 3 7스테이지는 분량이 크다 — 구현 계획에서 단계를 나눈다(메커니즘 → 대공탑/공중 적
  → 월드 3).
