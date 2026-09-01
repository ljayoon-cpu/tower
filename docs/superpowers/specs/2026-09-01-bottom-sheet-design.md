# 하단 시트(BottomSheet) 설계

**작성일:** 2026-09-01
**상태:** 승인됨 (구현 대기 — DoT 귀속 티켓 머지 후 착수)

## 목표

모바일 세로 화면에서 여기저기 떠서 플레이 영역을 가리던 UI 오버레이 3종(설치 메뉴,
경로 선택창, 타워 정보/강화/판매 패널)을 **화면 하단에 붙는 슬라이드 시트 하나**로
통합한다. 튜토리얼 힌트는 하단 얇은 바로 분리, 보스 체력바는 상단 유지.

## 배경 — 현재 상태

| 요소 | 현재 위치 | 파일 |
|---|---|---|
| 설치 메뉴 | 탭한 타일 좌표에 뜸(화면 클램프), depth 500 | `src/ui/BuildMenu.ts` |
| 경로 선택창 | 타워 옆에 뜸, depth 510 | `src/ui/PathChoiceMenu.ts` |
| 타워 정보 + 강화/판매 | `(20, 148~162)` 고정, depth 500/501 | `src/scenes/Game.ts` (`inspectText`/`upgradeButton`/`sellButton`, `showInspect`/`refreshUpgradeButton`) |
| 튜토리얼 코치 | `(GAME_WIDTH/2, 280)` 컨테이너, depth 1800 | `src/scenes/HUD.ts` (`coach`, `data.tutorialText`, `tutorial:step` 이벤트) |
| 보스 체력바 | `(GAME_WIDTH/2, 188)`, depth 1500 | `src/scenes/HUD.ts` (`bossBar`, `boss:*` 이벤트) |

문제: 설치 메뉴·경로 선택창이 보드 위 예측 불가한 지점에 떠서 조작 대상을 가린다.
정보 패널은 상단 HUD 바(160px) 바로 아래라 좁고, 코치는 화면 중앙을 덮는다.

## 설계

### 컴포넌트: `src/ui/BottomSheet.ts`

Game 씬 내부 오버레이(별도 씬 아님, `BuildMenu`와 같은 패턴). 화면 하단 가장자리에
고정 앵커. 내용이 있으면 위로 슬라이드 인, `hide()` 시 아래로 슬라이드 아웃.

```ts
export type SheetMode = 'build' | 'inspect' | 'path';

export interface BottomSheetOpts {
  onBuildPick: (key: string) => void;
  canAfford: (key: string) => boolean;
  isBanned: (key: string) => boolean;
  isAtLimit: (key: string) => boolean;
  limitLabel: (key: string) => string;
  onUpgrade: () => void;
  onSell: () => void;
  onPathPick: (p: 'a' | 'b') => void;
  onDismiss: () => void;              // 바깥 탭으로 닫힘 — Game 이 정리(pendingTile 해제 등)
}

export class BottomSheet {
  constructor(scene: Phaser.Scene, opts: BottomSheetOpts);
  showBuild(): void;                                   // 타워 그리드
  showInspect(view: InspectView): void;                // 정보 + 강화/판매 (매 프레임 refresh 가능)
  showPath(towerKey: string): void;                    // A/B 카드
  refreshBuild(): void;                                // 골드 상황 갱신 (열려 있을 때 매 프레임)
  refreshInspect(view: InspectView): void;
  hide(): void;
  get mode(): SheetMode | null;
  get isOpen(): boolean;
  destroy(): void;
}
```

`InspectView` = `showInspect`가 만들던 문자열/버튼 상태를 순수 데이터로 (`{ title, dpsLine,
statLine, note, upgrade: { label, cost, afford } | null, sell: { label } }`). 계산은 Game 에
남기고 시트는 렌더만.

**레이아웃**
- 폭 = `GAME_WIDTH`. 높이: `build` ≈ `ROW_H*perCol + 여백`(현 BuildMenu 계산 재사용, ~350),
  `inspect` ≈ 200, `path` ≈ 230.
- 하단 y 앵커. 튜토리얼 코치 바가 떠 있으면 그 위(56px 오프셋)에서 시작.
- depth 500. `path` 모드는 그 위(505)에 반투명 백드롭 — 카드 외 보드 입력 차단.
- 슬라이드: `scene.tweens` 로 `y` 60~120ms. `tweens` 없는(테스트) 씬에서는 즉시 배치.

### 모드 규칙

| 상황 | 동작 |
|---|---|
| 빈 설치칸 탭 | `showBuild()` (+ 해당 타일 하이라이트 유지 — 현 `buildPreview` 링) |
| 타워 탭 | `showInspect(view)` |
| `build` 열림 + 타워 탭 | `showInspect` 로 교체 |
| `inspect` 열림 + 빈칸 탭 | `showBuild` 로 교체 |
| 머지/강화가 Lv3 진입 | `showPath(key)` — 최우선. 해결(카드 선택) 또는 취소(바깥 탭) 전까지 다른 `show*` 무시, 보드 탭 차단 |
| 빈 보드 탭 (`build`/`inspect` 중) | `hide()` + `onDismiss()` |
| 빈 보드 탭 (`path` 중) | `hide()` + `onPathPick` 안 부름 (취소) — 이미 반영된 동작 유지 |
| 웨이브 종료 / `removeTower` / `endStage` | `hide()` |

`build`↔`inspect` 상호배타는 이미 있는 `openBuildMenu`/타워 pointerup 상호 close 로직을
시트 호출로 치환. `path` 우선순위는 `sheet.mode === 'path'` 가드로.

### 튜토리얼 코치 바 (HUD.ts)

`coach` 컨테이너를 화면 중앙(y 280)에서 **하단 얇은 바**로 이동:
- `y = GAME_HEIGHT - 28`, 높이 ~56, 폭 = `GAME_WIDTH`. 텍스트 1~2줄 + 우측 "건너뛰기".
- 튜토리얼 활성(`data.tutorialText` 존재)일 때만 표시. 단계 전환(`tutorial:step`) 시 텍스트 교체.
- HUD 씬에 그대로 둔다(튜토리얼 이벤트 배선 재사용). 시트는 Game 씬이므로 좌표만 겹치지 않게:
  Game 의 BottomSheet 가 `GAME_HEIGHT - (튜토리얼 활성 ? 56 : 0)` 를 바닥으로 삼는다.
  튜토리얼 활성 여부는 Game 이 이미 알고 있음(`this.tutorial`). `finishTutorial`/`skipTutorial`
  시 `sheet` 바닥 오프셋을 0 으로 재계산(열려 있으면 재배치).

### 보스 체력바

이동 없음. 팔레트/두께만 시트와 통일하는 선택적 소소한 패스(필수 아님).

## 이관 매핑

| 기존 | 이후 |
|---|---|
| `src/ui/BuildMenu.ts` | 그리드 렌더 로직을 `BottomSheet` 의 `build` 모드로. 좌표 클램프·`openAt(x,y)` 제거. 파일 삭제. |
| `src/ui/PathChoiceMenu.ts` | 카드 렌더를 `path` 모드로. `open(key, at, onPick)` → `showPath(key)` + `opts.onPathPick`. 파일 삭제. |
| `Game.ts` `inspectText`/`upgradeButton`/`sellButton` + `showInspect`/`refreshUpgradeButton` | `showInspect`/`refreshUpgradeButton` 는 `InspectView` 를 만들어 `sheet.showInspect/refreshInspect` 호출. 3개 GameObject 필드 제거. |
| `Game.ts` `openBuildMenu`/`closeBuildMenu`/`buildPreview` | `openBuildMenu` → 타일 하이라이트 + `sheet.showBuild()`. `closeBuildMenu` → `sheet.hide()` + 하이라이트 제거. |
| `Game.ts` catcher `pointerup` | 시트 열림 시: `path` 면 취소, 아니면 `hide`+dismiss. 닫힘 시: 빈칸이면 `showBuild`. |
| `Game.ts` `dragend` 머지 경로 선택 / `tryUpgradeSelected` | `this.pathMenu.open(...)` → `this.sheet.showPath(...)`; `finish`/`doMerge` 는 `opts.onPathPick` 콜백으로 들어옴 |
| `Game.ts` `this.pathMenu` 필드 | `this.sheet` 로 통합 (`this.buildMenu` 도) |
| `HUD.ts` `coach` (y 280) | 하단 바로 재배치 |

## 테스트

- `tests/ui/bottomSheet.test.ts` (신규): 가짜 씬으로 `showBuild`/`showInspect`/`showPath` →
  `mode` 전환, `hide()` 후 `isOpen === false`, `path` 모드 중 `showBuild` 무시,
  바깥 탭 → `onDismiss` 호출(`path` 면 `onPathPick` 미호출).
- `tests/balance/harness.ts` 가짜 씬: `BottomSheet` 생성자가 부르는 `add.container`/`add.rectangle`/
  `add.text` no-op 이미 있음. `tweens` 없을 때 즉시 배치 경로 확인.
- 기존 `tests/ui/` 의 BuildMenu/PathChoice 테스트가 있으면 시트 테스트로 이관 후 삭제.
- `npm test` + `npm run build` 통과. 캠페인 밸런스 시뮬은 UI 무관 — 불변.

## 비목표

- 보스 체력바 위치 변경, 상단 HUD 바 재설계, 3x 배속/일시정지 UI 변경.
- 시트 드래그(손으로 끌어올리기/내리기) 제스처 — 탭으로 여닫는 것만. (#2 제스처 티켓에서 별도.)
- 가로 모드 대응.

## 리스크 / 순서

- Game.ts 를 크게 만진다. **DoT 귀속 티켓(별도 세션) PR 이 main 에 머지된 뒤 착수** — 안 그러면 충돌.
- `BuildMenu`/`PathChoiceMenu` 삭제는 다른 참조가 없는지 `grep` 확인 후.
- 구현은 `feature/bottom-sheet` 브랜치, subagent-driven-development 로.
