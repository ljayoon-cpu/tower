# 머지 타워디펜스 (Merge Tower Defense) — 설계 문서

작성일: 2026-08-30
상태: 승인됨 (구현 계획 단계로 진행)

## 1. 개요

고전 타워디펜스에 **머지(합치기) 업그레이드**를 결합한 모바일 게임.
플레이어는 원하는 위치·종류의 타워를 직접 설치하고, 같은 타워를 겹쳐
레벨을 올린다. 적은 고정 스폰 지점에서 나와 갈라지는 경로를 따라
대량·빠르게 밀려온다.

- **플랫폼**: 모바일 우선. Vite 빌드 웹앱 → PWA(홈 화면 설치/전체화면/오프라인).
  스토어 출시 시 동일 `dist/`를 Capacitor로 감싸 APK 빌드(v1 범위 밖, 구조만 대비).
- **화면**: 세로 고정. 기준 해상도 720×1280, Phaser `Scale.FIT` + `CENTER_BOTH`.
- **엔진**: Phaser 3 + TypeScript + Vite.
- **최종 목표 미정**: 우선 "실제로 재밌게 돌아가는 게임"이 우선순위.
  스토어 출시는 나중에 판단.

### 향후 확장 (v1 아님, 설계 시 고려만)
- 로그라이크 카드 드래프트: 웨이브 사이에 랜덤 타워/유물 카드 제시 → 선택.
  타워/적/효과를 전부 데이터로 정의해 이 확장에서 재활용 가능하게 한다.
- 도트/일러스트 아트로 교체.
- 무한 웨이브 모드, 추가 월드.

## 2. 아키텍처

### 설계 원칙
1. **로직과 렌더 분리**: 이코노미, 웨이브 스케줄링, 머지 규칙, 타겟팅,
   경로 진행률 계산은 Phaser에 의존하지 않는 순수 TS 모듈. Vitest로 단위 테스트.
2. **데이터 주도**: 타워·적·스테이지는 데이터 파일. 밸런싱은 숫자만 수정.
3. **이벤트 버스**: 씬/시스템 간 통신은 `eventBus`(간단한 typed emitter).
   예: `enemy:killed` → HUD 골드 갱신, `life:changed` → 패배 판정.

### 씬 구성 (Phaser Scene)
```
Boot → Preload → MainMenu → StageSelect → Game → Result
                                            └ HUD (Game 위 오버레이 씬)
```
- `Boot`: 스케일/입력 설정, Preload로 전환.
- `Preload`: `Graphics.generateTexture()`로 도형 스프라이트 생성, 사운드 로드.
- `MainMenu`: 시작 버튼.
- `StageSelect`: 1-1 ~ 1-5 노드. 별점·해금 상태 표시(localStorage).
- `Game`: 맵 렌더, 그리드, 타워/적/투사체, 시스템 업데이트 루프.
- `HUD`: 골드 / 라이프 / 웨이브 / 배속(1x·2x) / 일시정지 / BuildMenu.
- `Result`: 클리어·실패, 획득 별점, 재시도 / 스테이지 선택.

### 폴더 구조
```
src/
  main.ts
  scenes/
    Boot.ts  Preload.ts  MainMenu.ts  StageSelect.ts  Game.ts  Result.ts  HUD.ts
  entities/
    Tower.ts  Enemy.ts  Projectile.ts
  systems/
    GridManager.ts       # 타일 상태(설치가능/길/점유), 좌표<->타일 변환
    PathManager.ts        # 웨이포인트, 경로 진행률, 분기 경로
    WaveManager.ts        # 웨이브 스케줄, 스폰 타이밍, 웨이브 종료 판정
    EconomyManager.ts     # 골드 증감, 설치/판매/보상
    TargetingSystem.ts    # 사거리 내 적 탐색, 우선순위 선택
    MergeController.ts     # 머지 가능 여부 판정, 머지 실행
  data/
    towers.ts  enemies.ts
    stages/ stage-1-1.ts  stage-1-2.ts  stage-1-3.ts  stage-1-4.ts  stage-1-5.ts
  core/
    types.ts  constants.ts  eventBus.ts  save.ts
  ui/
    BuildMenu.ts  hud widgets
public/
  manifest.webmanifest  icons/  sfx/
index.html  vite.config.ts  vitest.config.ts
```

## 3. 게임플레이

### 맵 / 경로
- 세로 격자 맵. 타일 종류: `PATH`(적 이동) / `BUILDABLE`(타워 설치) / `BLOCKED`.
- 적 스폰 지점 1곳 고정. 경로가 중간에 2갈래로 **분기**, 각 갈래가 목표(둥지)에 도달.
- 목표 도달 시 라이프 -1 (적 종류별 라이프 피해량은 1로 고정, 보스는 더 큼 — 데이터).
- 경로는 스테이지 데이터에 웨이포인트 좌표 배열로 정의. 분기는 트리 구조:
  `{ points: Vec2[], branches?: Path[] }`.
- 적의 경로 진행률 `t`(0~1)로 "가장 앞선 적" 타겟팅 계산.

### 타워 설치 & 머지
- `BUILDABLE` 타일 탭 → `BuildMenu` 팝업(타워 4종 + 가격) → 선택 시 골드 소모, 설치.
- 골드 부족 / 이미 점유된 타일은 설치 불가(피드백 표시).
- **머지**: 타워를 드래그 → 다른 타워 위에 드롭.
  - 조건: **같은 종류 AND 같은 레벨 AND 최대 레벨 미만**.
  - 결과: 드롭 대상 타워가 레벨 +1, 드래그한 타워 제거 → 원래 타일 `BUILDABLE`로 복귀.
  - 머지는 골드 무료.
  - 최대 레벨 Lv5.
- **판매**: 타워 롱프레스 또는 선택 후 판매 버튼 → 설치 누적 비용의 일정 비율(예 60%) 환급, 타일 복귀.
- 타일 수가 한정 → 머지로 자리 확보하는 자원 압박이 핵심 재미.

### 적 / 전투
- 웨이브 단위 스폰. 스폰 간격 짧게(속도감), 웨이브당 적 수 많게.
- 적 데이터: `hp`, `speed`, `bounty`(골드), `lifeDamage`, (선택) `armorType`.
- 타워는 매 틱 `TargetingSystem`으로 사거리 내 적 탐색 → 우선순위로 1기 선택 → 발사.
  - 기본 우선순위: **경로 진행률이 가장 높은 적**(가장 앞선 적).
- 공격 방식은 타워 데이터로 정의:
  - `single`: 단일 타겟 투사체.
  - `splash`: 착탄 지점 반경 내 광역 피해.
  - `slow`: 명중 시 이동속도 배율·지속시간 디버프.
  - `chain`: 체인 라이트닝(번개탑). 1차 대상 명중 후, 아직 안 맞은 살아있는 적 중
    마지막 피격 지점에서 `chainRange` 이내 최근접으로 순차 전이. 전이마다 데미지 ×`chainFalloff`.
    최대 `chainTargets`회 전이, 범위 내 대상 없으면 조기 종료. (레벨↑ = 전이 수↑, 감쇠 완화)
- 투사체는 풀링(objectpool)으로 재사용.

### 이코노미
- 스테이지 시작 시 시작 골드(데이터).
- 적 처치 시 `bounty` 골드.
- 웨이브 클리어 보너스(데이터, 웨이브 번호에 비례).
- 지출: 새 타워 설치. (머지·레벨업은 무료)

### 승패 / 별점
- 모든 웨이브의 모든 적 처리(도달 포함) 후 라이프 > 0 → **클리어**.
- 라이프 0 → **실패** 즉시 종료.
- 별점: 남은 라이프 비율로 1~3별 (예: 100% 3별, ≥50% 2별, >0% 1별 — 스테이지 데이터에서 조정 가능).
- `save.ts`가 localStorage에 스테이지별 최고 별점·해금 상태 저장.
  스테이지 클리어 시 다음 스테이지 해금.

### 속도 조절
- HUD에 1x / 2x 배속 토글. `time.timeScale` + 물리 스텝에 반영.
- 일시정지 버튼(팝업, 재개 / 포기).

## 4. v1 콘텐츠

### 타워 4종
| 키 | 이름 | 공격 | 특징 |
|---|---|---|---|
| `arrow` | 화살탑 | single | 낮은 데미지, 빠른 연사, 저렴 |
| `cannon` | 대포 | splash | 높은 데미지, 느린 연사, 비쌈, 광역 |
| `frost` | 서리탑 | slow | 낮은 데미지, 적 이동속도 감소 |
| `bolt` | 번개탑 | chain | 체인 라이트닝: 근처 적에게 번개가 튐, 튈수록 데미지 감소 |

- 각 타워 Lv1~5. 레벨 상승 시 데미지·사거리(및 타워별 고유 수치) 상승.
  레벨별 수치는 `towers.ts`에 배열 또는 공식으로 정의.

### 적 3종 + 보스
| 키 | 이름 | 특징 |
|---|---|---|
| `normal` | 일반 | 기준 체력·속도 |
| `fast` | 쾌속 | 체력 낮음, 속도 높음 |
| `tank` | 탱커 | 체력 높음, 속도 낮음 |
| `boss` | 보스 | 매우 높은 체력, `lifeDamage` 큼. 5웨이브마다 1기 |

### 스테이지 1-1 ~ 1-5
- 각 스테이지 = 맵(타일 배열 + 경로 트리) + 웨이브 스크립트 + 시작 골드 + 시작 라이프 + 별점 임계값.
- 웨이브 스크립트: `[{ enemy, count, interval, startDelay }...]` 그룹의 배열.
- 뒤 스테이지일수록 웨이브 수 증가, 적 밀도·혼합 증가, 시작 골드 대비 난이도 상승.
- 1-1은 튜토리얼 성격(분기 없는 단일 경로, 적음). 1-2부터 분기 경로 도입.

### 아트
- `Preload`에서 `Graphics.generateTexture()`로 도형 스프라이트 생성:
  타워=색+모양(화살탑 삼각, 대포 원, 서리탑 마름모, 번개탑 별), 적=원/사각, 투사체=작은 점/선.
- 레트로 팔레트(제한된 색 수), 픽셀 비트맵 폰트.
- 타워 레벨은 크기 + 테두리 두께/색으로 표기.
- 텍스처는 키로 참조 → 나중에 도트/일러스트 파일로 교체 시 로직 변경 없음.

### 사운드
- 발사 / 피격 / 웨이브 클리어 / 실패 짧은 효과음. 무료 CC0 에셋 또는 v1에서 생략 가능(플래그).

## 5. 데이터 모델 (core/types.ts 요지)

```ts
type Vec2 = { x: number; y: number };

type TileType = 'PATH' | 'BUILDABLE' | 'BLOCKED';

interface PathNode { points: Vec2[]; branches?: PathNode[]; }

type AttackKind = 'single' | 'splash' | 'slow' | 'chain';

interface TowerDef {
  key: string; name: string; attack: AttackKind;
  cost: number;                 // Lv1 설치 비용
  maxLevel: number;             // 5
  levels: TowerLevelStats[];    // length === maxLevel
}
interface TowerLevelStats {
  damage: number; range: number; fireRate: number; // 초당 발사
  splashRadius?: number; slowMul?: number; slowDurationMs?: number;
  chainTargets?: number; chainFalloff?: number; chainRange?: number;
}

interface EnemyDef {
  key: string; name: string;
  hp: number; speed: number; bounty: number; lifeDamage: number;
  armorType?: string;
}

interface WaveGroup { enemy: string; count: number; interval: number; startDelay: number; }
interface Wave { groups: WaveGroup[]; clearBonus: number; }

interface StageDef {
  id: string;                    // '1-1'
  grid: TileType[][];
  path: PathNode;                // 분기 트리
  spawn: Vec2; goals: Vec2[];
  startGold: number; startLives: number;
  waves: Wave[];
  starThresholds: [number, number, number]; // 남은 라이프 비율 기준
}

interface SaveData { stages: Record<string, { stars: number; unlocked: boolean }>; }
```

## 6. 테스트 전략 (Vitest)

순수 로직 단위 테스트:
- `EconomyManager`: 골드 증감, 설치 시 부족 판정, 판매 환급 계산.
- `MergeController`: 같은 종류/레벨만 머지, 최대 레벨 차단, 결과 레벨·타일 복귀.
- `WaveManager`: 스폰 타이밍(스케줄), 웨이브 종료 판정, 다음 웨이브 전환.
- `TargetingSystem`: 사거리 필터, "가장 앞선 적" 선택, 대상 없음 처리.
- `PathManager`: 진행률 `t` → 좌표, 분기 선택, 목표 도달 판정.
- `GridManager`: 좌표<->타일, 점유/해제, 설치 가능 판정.

씬: 스모크 테스트(에러 없이 생성·전환) 수준.

## 7. v1 완료 기준 (Definition of Done)

- [ ] 폰 세로 화면에서 1-1 ~ 1-5를 처음부터 끝까지 플레이 가능.
- [ ] 4종 타워 설치·머지(Lv5까지)·판매 동작.
- [ ] 분기 경로에서 적이 양 갈래로 이동, 타워가 양 갈래 조준.
- [ ] 대량 스폰 + 2x 배속에서 프레임 급락 없음(중급 안드로이드 기준 목표).
- [ ] 별점·해금 상태 localStorage 저장/복원.
- [ ] PWA 설치 가능(manifest + 서비스워커), 오프라인 실행.
- [ ] 순수 로직 모듈 Vitest 통과.

## 8. v1 비포함 (명시적 제외)

- 카드 드래프트 / 로그라이크 요소
- 무한 웨이브 모드, 월드 2 이상
- 온라인 / PvP / 리더보드
- 인앱 결제, 광고
- 도트/일러스트 아트, 풀 사운드트랙
- Capacitor APK 실제 빌드(폴더 구조만 대비)
