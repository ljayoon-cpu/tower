# 하단 시트(BottomSheet) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설치 메뉴·경로 선택창·타워 정보/강화/판매 패널을 화면 하단 슬라이드 시트 하나(`BottomSheet`)로 통합하고, 튜토리얼 코치를 하단 얇은 바로 옮긴다.

**Architecture:** `src/ui/BottomSheet.ts` 신규 — Game 씬 오버레이, 하단 앵커, 내용 있을 때 슬라이드 업. 3개 모드(`build`/`inspect`/`path`)를 `show*()` 로 교체. 기존 `BuildMenu`·`PathChoiceMenu` 는 시트 모드로 흡수 후 삭제. `Game.ts` 의 `inspectText`/`upgradeButton`/`sellButton` GameObject 는 제거하고 계산 결과(`InspectView`)만 시트에 넘긴다. 코치는 `HUD.ts` 에 그대로 두고 좌표만 하단으로.

**Tech Stack:** Phaser 3, TypeScript strict, Vite, Vitest. UI 는 `src/ui`·`src/scenes`(phaser 허용). 순수 로직 계산은 Game 에 남긴다.

**Spec:** [docs/superpowers/specs/2026-09-01-bottom-sheet-design.md](../specs/2026-09-01-bottom-sheet-design.md)

## Global Constraints

- TypeScript strict. `any` 금지(불가피 시 사유 주석). `noUnusedLocals/Parameters` 켜짐.
- `src/core`·`src/systems`는 phaser import 금지 (`tests/architecture.test.ts`). BottomSheet 는 `src/ui` 라 무관.
- 밸런싱/시뮬(캠페인·무한)은 UI 무변경이므로 `tests/balance/**` 결과 불변이어야 한다.
- 커밋: Conventional Commits, 한 기능 한 커밋. 트레일러 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- 커밋 전 `npm test` + `npm run build` 통과.
- 착수 전제: **DoT 귀속 티켓 PR 이 main 에 머지된 상태**. 브랜치 `feature/bottom-sheet` (main 최신에서 분기).
- 보스 체력바(HUD `bossBar`), 상단 HUD 바, 3x 배속/일시정지 UI 는 이번 범위 밖 — 건드리지 않는다.
- 시트 드래그 제스처(손으로 끌기)는 비목표. 탭으로만 여닫는다.

---

## File Structure

**생성:**
- `src/ui/BottomSheet.ts` — 하단 시트 컴포넌트(3 모드 + 슬라이드 + opts)
- `tests/ui/bottomSheet.test.ts` — 모드 전환/dismiss/우선순위 유닛 테스트

**수정:**
- `src/scenes/Game.ts` — `buildMenu`·`pathMenu` 필드와 `inspectText`/`upgradeButton`/`sellButton` 제거,
  `this.sheet` 로 통합. `openBuildMenu`/`closeBuildMenu`/`showInspect`/`refreshUpgradeButton`/
  catcher/`tryUpgradeSelected`/`dragend`/`removeTower`/`endStage`/SHUTDOWN/`update` 배선 교체.
- `src/scenes/HUD.ts` — `coach` 컨테이너 좌표를 `(GAME_WIDTH/2, 280)` → 하단 바로.
- `docs/ROADMAP.md` — "완료" 에 한 줄.

**삭제:**
- `src/ui/BuildMenu.ts`
- `src/ui/PathChoiceMenu.ts`
- (있으면) `tests/ui/*buildMenu*`, `tests/ui/*pathChoice*` — 시트 테스트로 이관 후

**참고(수정 없음):** `src/data/towers.ts`(경로/비용), `src/core/towerInfo.ts`(`towerInfo(key,level,path?)`),
`src/core/economy` 계열(`upgradeCost`/`cumulativeCost`).

---

## 현재 코드 레퍼런스 (구현자는 브랜치 최신에서 실제 위치 재확인 — DoT 머지로 줄번호 밀릴 수 있음)

**`src/ui/BuildMenu.ts`** — 그리드 상수 `ROW_H=62, COL_W=186, COLS=2`, `perCol = ceil(TOWER_KEYS.length/COLS)`.
`openAt(x,y)`: `container.removeAll(true)` → bg 사각형 → `TOWER_KEYS.forEach` 로 각 행(icon `tower_${key}` scale .62,
label `${name}\n${subLabel}`, lock 텍스트, hit 사각형 + `attachPressFeedback`) → `Clamp` 위치 지정.
`refresh()`: 행별 `canAfford`/`blocked` 로 alpha·color·`setInteractive/disableInteractive`.
`Row = { key, blocked, selectable, icon, label, hit }`. opts: `onPick/canAfford/isBanned/isAtLimit/limitLabel`.

**`src/ui/PathChoiceMenu.ts`** — `CARD_W=200, CARD_H=150, GAP=14`. `open(towerKey, at, onPick)`:
`def.paths` 없으면 `onPick('a')` 즉시 return. 아니면 제목 `${def.name} — 경로 선택` + `(['a','b']).forEach` 로
카드(rect + name `#ffcc44` + desc/Lv5 DPS 텍스트 + `attachPressFeedback` → `this.close(); onPick(p)`).
Lv5 DPS = `Math.round(l5.damage * l5.fireRate * ((l5.projectileCount ?? 1) * (l5.projectileDamageMultiplier ?? 1)))`.

**`src/scenes/Game.ts` `showInspect(tower?)`** (≈L407): 없으면 3개 setVisible(false)+`selectedTower=undefined`.
있으면 `info = towerInfo(tower.key, tower.level, tower.path)`, `pathName = tower.path ? ' · '+getTower(key).paths![tower.path].name : ''`,
`buffRadius = tower.stats().buffRadius`,
`dpsLine = buffRadius!=null ? '버프 범위 N칸' : info.nextDps!=null ? 'DPS a → b' : 'DPS a (최대)'`,
`statLine = '사거리 X   연사 Y/초'`, `noteLine = info.note ? '\n'+info.note : ''`.
텍스트 `${info.name}${pathName} Lv${info.level}   ${dpsLine}\n${statLine}${noteLine}`.

**`refreshUpgradeButton()`** (≈L436): `maxed = tower.level >= tower.maxLevel`.
`cost = upgradeCost(getTower(key), tower.level)`, `afford = eco.gold >= cost`,
버튼 텍스트 `⬆ Lv${level+1} 강화  ${cost}G`, 색 afford 로.
`refund = floor(cumulativeCost(getTower(key), level) * eco.sellRatio)`, 판매 `⌫ 판매 +${refund}G`.

**catcher `pointerup`** (≈L361): `if (!running||paused) return; if (time.now < suppressTapUntil) return;`
`if (this.pathMenu.isOpen) { this.pathMenu.close(); return; }` → `clearTowerRanges()` →
`if (buildMenu.isOpen) { closeBuildMenu(); return; }` → `tile = grid.pixelToTile(...)` →
`if (!grid.canPlace(tile)) return;` → `openBuildMenu(tile)`.

**`tryUpgradeSelected()`** (≈L466): 가드 → `cost` → `if (eco.gold < cost){ audio.play('click'); return; }` →
`const finish = (path?) => { if (!running||paused||!towers.includes(tower)) return; if(!eco.spend(cost)){audio.play('click');return;} tower.setLevel(tower.level+1, path); mergePop(tower); audio.play('merge'); if(tower.rangeVisible) tower.showRange(true); showInspect(tower); }` →
`if (tower.needsPathChoice) this.pathMenu.open(tower.key, tower.homePos, finish); else finish();`.

**`dragend`** merge 블록 (≈L527): `canMerge(a,b,...)` 통과 시 `const doMerge = (path?) => { if(!running||paused||!towers.includes(targetTower)) return; ...sourceVisual 캡처...; targetTower.setLevel(mergeResultLevel(targetTower.level), path); grid.release(dragged.tile); removeTower(dragged); snapHome(targetTower); mergeFeedback(...); advanceTutorial('merged'); }` →
`if (targetTower.needsPathChoice) { snapHome(dragged); this.pathMenu.open(targetTower.key, targetTower.homePos, doMerge); } else doMerge(); return;`.

**update()** (≈L1289): `if (this.buildMenu.isOpen) this.buildMenu.refresh(); if (this.selectedTower) this.refreshUpgradeButton();`

**정리 훅**: SHUTDOWN(≈L188 `this.pathMenu?.destroy()`), `removeTower`(≈L623 `this.pathMenu?.close()`),
`endStage`(≈L776 `this.pathMenu?.close()`), `closeBuildMenu` 는 `create` L310·`placeTower` L727·L739 에서도 호출.

**`src/scenes/HUD.ts` coach** (≈L108): `container(GAME_WIDTH/2, 280).setDepth(1800)`,
자식 rect `(0,0, GAME_WIDTH-60, 96, 0x0f1020, 0.92)` stroke `0xffcc44`, text `(0,-12)` 21px,
skip `(0,28)` 17px + `attachPressFeedback(...data.onSkipTutorial)`. `setVisible(data.tutorialText !== null)`.
이벤트 `on('tutorial:step', ({text}) => text===null ? coach.setVisible(false) : (coachText.setText(text), coach.setVisible(true)))`.

---

## Phase 1 — BottomSheet 컴포넌트

### Task 1: BottomSheet 스켈레톤 + `build` 모드

**Files:**
- Create: `src/ui/BottomSheet.ts`
- Create: `tests/ui/bottomSheet.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SheetMode = 'build' | 'inspect' | 'path';
  export interface BottomSheetOpts {
    onBuildPick: (key: string) => void;
    canAfford: (key: string) => boolean;
    isBanned: (key: string) => boolean;
    isAtLimit: (key: string) => boolean;
    limitLabel: (key: string) => string;
    onUpgrade: () => void;              // Task 2 에서 사용
    onSell: () => void;                 // Task 2
    onPathPick: (p: 'a' | 'b') => void; // Task 3
    onDismiss: () => void;
  }
  export class BottomSheet {
    constructor(scene: Phaser.Scene, opts: BottomSheetOpts);
    setBottomInset(px: number): void;   // 코치 바 높이만큼 바닥을 올린다 (0 또는 56)
    showBuild(): void;
    refreshBuild(): void;
    hide(): void;
    get mode(): SheetMode | null;
    get isOpen(): boolean;
    destroy(): void;
  }
  ```

- [ ] **Step 1: 실패 테스트** — `tests/ui/bottomSheet.test.ts`

가짜 씬은 `tests/balance/harness.ts` 의 패턴(또는 다른 `tests/ui/*` 테스트)에서 최소한으로 복사:
`add.container/rectangle/text/image` 가 체이닝 메서드(`setDepth/setOrigin/setVisible/setStrokeStyle/
setInteractive/disableInteractive/setScale/setPosition/setStyle/setText/setAlpha`) 를 가진 no-op 객체를 돌려주고,
`tweens` 는 제공하지 않는다(즉시 배치 경로).

```ts
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet } from '../../src/ui/BottomSheet';

const chain = () => new Proxy({}, { get: () => chain });   // 모든 메서드 no-op, 자기 반환
function fakeScene() {
  const factory = () => {
    const o: Record<string, unknown> = {};
    for (const m of ['setDepth','setOrigin','setVisible','setStrokeStyle','setInteractive',
      'disableInteractive','setScale','setPosition','setStyle','setText','setAlpha','removeAll',
      'add','destroy','on','emit']) o[m] = () => o;
    o.list = []; o.width = 0;
    return o;
  };
  return { add: { container: factory, rectangle: factory, text: factory, image: factory }, tweens: undefined } as unknown as Phaser.Scene;
}
const opts = () => ({
  onBuildPick: vi.fn(), canAfford: () => true, isBanned: () => false,
  isAtLimit: () => false, limitLabel: () => '최대 2개',
  onUpgrade: vi.fn(), onSell: vi.fn(), onPathPick: vi.fn(), onDismiss: vi.fn(),
});

describe('BottomSheet build mode', () => {
  it('opens to build mode and hides', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(s.isOpen).toBe(false);
    s.showBuild();
    expect(s.mode).toBe('build');
    expect(s.isOpen).toBe(true);
    s.hide();
    expect(s.isOpen).toBe(false);
    expect(s.mode).toBeNull();
  });
});
```

Run: `npx vitest run tests/ui/bottomSheet.test.ts`  → FAIL (모듈 없음).

- [ ] **Step 2: BottomSheet 구현 — 스켈레톤 + build**

`src/ui/BottomSheet.ts`:
- import: `Phaser`, `GAME_WIDTH, GAME_HEIGHT` (`../core/constants`), `TOWER_KEYS, getTower` (`../data/towers`),
  `audioFor` (`./audio`), `attachPressFeedback` (`./interactionFeedback`).
- 상수: `ROW_H = 62`, `COL_W = 186`, `COLS = 2`, `SLIDE_MS = 90`.
- 필드: `container: Phaser.GameObjects.Container` (`scene.add.container(GAME_WIDTH/2, GAME_HEIGHT).setDepth(500).setVisible(false)`),
  `_mode: SheetMode | null = null`, `bottomInset = 0`, `rows: Array<{ key; blocked; selectable; icon; label; hit }> = []`.
- `setBottomInset(px)`: `this.bottomInset = px;` 열려 있으면 `this.slideIn()` 재호출로 y 갱신.
- `showBuild()`: `this.buildBuild()` 로 컨테이너 내용 구성(아래) → `this._mode = 'build'` → `this.slideIn()`.
- `private buildBuild()`: `container.removeAll(true); this.rows = [];`
  `perCol = Math.ceil(TOWER_KEYS.length / COLS); w = COL_W*COLS; h = ROW_H*perCol + 16;`
  bg `scene.add.rectangle(0, -h/2, w, h, 0x11121f, 0.96).setStrokeStyle(2, 0x66ccff)` — **원점 하단 기준**:
  컨테이너를 화면 바닥에 두고 자식들을 음수 y 로 쌓는다. (`container.y` = 바닥 앵커, Step: `slideIn` 이 조정)
  `TOWER_KEYS.forEach` — BuildMenu.openAt 의 행 생성 로직을 그대로 옮기되 `x` 는 그리드 그대로, `y` 는 `-h + 16 + ...`.
  각 행: `banned = opts.isBanned(key)`, `atLimit = !banned && opts.isAtLimit(key)`, `blocked = banned || atLimit`,
  `subLabel = banned ? '이번 판 봉인' : atLimit ? opts.limitLabel(key) : `${getTower(key).cost}G``,
  `lockText = banned ? '봉인' : atLimit ? '가득' : ''`.
  hit 사각형에 `attachPressFeedback(scene, hit, [icon,label], audioFor(scene), () => { if (!this.rows.find(r=>r.key===key)?.selectable) return; opts.onBuildPick(key); this.hide(); })`.
  `this.rows.push({ key, blocked, selectable: false, icon, label, hit })`.
  마지막에 `this.currentHeight = h` 저장.
- `refreshBuild()`: `if (this._mode !== 'build') return;` BuildMenu.refresh 로직 그대로 —
  `afford = opts.canAfford(row.key); selectable = afford && !row.blocked;` alpha/color/interactive 토글.
- `private slideIn()`: 컨테이너 `setVisible(true)`.
  `const targetY = GAME_HEIGHT - this.bottomInset;`  (자식이 음수 y 라 컨테이너 y 가 바닥)
  `if (this.scene.tweens) { this.container.y = GAME_HEIGHT + 40; this.scene.tweens.add({ targets: this.container, y: targetY, duration: SLIDE_MS, ease: 'Quad.out' }); } else { this.container.y = targetY; }`
- `hide()`: `const done = () => { this.container.setVisible(false); this.container.removeAll(true); this.rows = []; this._mode = null; };`
  `if (this.scene.tweens) this.scene.tweens.add({ targets: this.container, y: GAME_HEIGHT + 40, duration: SLIDE_MS, onComplete: done }); else done();`
  (테스트에서 `isOpen`/`mode` 는 tween 없이 즉시 반영되어야 하므로 `this._mode = null` 은 tween 여부와 무관하게 `hide()` 진입 즉시 설정 — done 콜백엔 시각 정리만.)
- `get mode()` → `this._mode`. `get isOpen()` → `this._mode !== null`. `destroy()` → `this.container.destroy()`.

`any` 없이: 자식 GameObject 타입은 `Phaser.GameObjects.GameObject` 배열로, 필요한 좁힘은 개별 캐스트 + 사유 주석.

- [ ] **Step 3: 통과 확인**

Run: `npx vitest run tests/ui/bottomSheet.test.ts` → PASS.
Run: `npm run build` → tsc 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/ui/BottomSheet.ts tests/ui/bottomSheet.test.ts
git commit -m "feat(ui): BottomSheet skeleton + build mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `inspect` 모드

**Files:**
- Modify: `src/ui/BottomSheet.ts`
- Modify: `tests/ui/bottomSheet.test.ts`

**Interfaces:**
- Consumes: Task 1 (`BottomSheet`, `slideIn`, `hide`).
- Produces:
  ```ts
  export interface InspectView {
    title: string;                 // "화살탑 · 관통형 Lv3"
    lines: string[];               // [dpsLine, statLine, ...noteLine 분할]
    upgrade: { label: string; afford: boolean } | null;   // null = 만렙
    sell: { label: string };
  }
  // BottomSheet 에 추가:
  showInspect(view: InspectView): void;
  refreshInspect(view: InspectView): void;
  ```

- [ ] **Step 1: 실패 테스트** — `bottomSheet.test.ts` 에 추가

```ts
describe('BottomSheet inspect mode', () => {
  const view = () => ({
    title: '화살탑 Lv2', lines: ['DPS 30 → 60', '사거리 162   연사 2.2/초'],
    upgrade: { label: '⬆ Lv3 강화  100G', afford: true }, sell: { label: '⌫ 판매 +60G' },
  });
  it('shows inspect and swaps from build', () => {
    const o = opts(); const s = new BottomSheet(fakeScene(), o);
    s.showBuild(); expect(s.mode).toBe('build');
    s.showInspect(view()); expect(s.mode).toBe('inspect'); expect(s.isOpen).toBe(true);
  });
  it('upgrade button calls onUpgrade', () => {
    const o = opts(); const s = new BottomSheet(fakeScene(), o);
    s.showInspect(view());
    // hit 캡처: 구현이 upgrade hit 에 attachPressFeedback 콜백으로 o.onUpgrade 를 걸어야 한다.
    // 가짜 attachPressFeedback 대신 실제 것을 쓰되, 콜백을 직접 부르는 헬퍼를 노출하거나
    // (권장) 테스트는 "showInspect 가 onUpgrade 참조를 저장" 을 검증하는 대신
    // 별도 export 한 순수 헬퍼로 라벨 렌더만 확인. → 아래 Step 2 참고.
    expect(s.mode).toBe('inspect');
  });
});
```

> 참고: `attachPressFeedback` 는 실제 포인터 이벤트가 필요해 유닛 테스트에서 클릭을 흉내내기 어렵다.
> Task 2 는 **모드 전환·`isOpen`** 만 유닛으로 검증하고, 버튼 콜백 실제 발화는 Task 5 이후 브라우저 검증에서 확인한다.
> `onUpgrade`/`onSell` 배선 자체는 코드 리뷰로 확인.

- [ ] **Step 2: 구현**

`BottomSheet.ts`:
- `showInspect(view)`: `this.buildInspect(view); this._mode = 'inspect'; this.slideIn();`
- `private buildInspect(view)`: `container.removeAll(true); this.rows = [];`
  `h = 60 + view.lines.length * 34 + 64;` bg 사각형(build 와 같은 스타일, 폭 `GAME_WIDTH - 24`).
  title 텍스트 `-h + 20`, `view.lines.forEach` 로 각 줄 텍스트.
  `view.upgrade` 있으면 upgrade 버튼(텍스트 + bg, 색 `afford ? '#2a5d3a' : '#4a3030'`),
  `attachPressFeedback(scene, upBtnHit, [upBtn], audioFor(scene), () => this.opts.onUpgrade())`.
  sell 버튼 항상: `attachPressFeedback(... () => this.opts.onSell())`.
- `refreshInspect(view)`: `if (this._mode !== 'inspect') return; this.buildInspect(view);` (매 프레임 재구성 —
  텍스트만 바뀌므로 비용 낮음. 최적화는 YAGNI.)

- [ ] **Step 3: 통과** — `npx vitest run tests/ui/bottomSheet.test.ts` PASS, `npm run build` OK.

- [ ] **Step 4: 커밋**

```bash
git add src/ui/BottomSheet.ts tests/ui/bottomSheet.test.ts
git commit -m "feat(ui): BottomSheet inspect mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `path` 모드 + 우선순위 + 백드롭

**Files:**
- Modify: `src/ui/BottomSheet.ts`
- Modify: `tests/ui/bottomSheet.test.ts`

**Interfaces:**
- Consumes: Task 1·2.
- Produces: `showPath(towerKey: string): void` — `getTower(key).paths` 없으면 즉시 `opts.onPathPick('a')` 후 return.
  `path` 모드 동안 `showBuild`/`showInspect` 는 no-op. 백드롭 탭 → `hide()` + `opts.onDismiss()` (`onPathPick` 미호출).

- [ ] **Step 1: 실패 테스트**

```ts
describe('BottomSheet path mode', () => {
  it('path mode blocks build/inspect until resolved', () => {
    const o = opts(); const s = new BottomSheet(fakeScene(), o);
    s.showPath('bolt'); expect(s.mode).toBe('path');
    s.showBuild(); expect(s.mode).toBe('path');       // 무시
    s.showInspect({ title:'x', lines:[], upgrade:null, sell:{label:'y'} });
    expect(s.mode).toBe('path');                      // 무시
    s.hide(); expect(s.mode).toBeNull();
    s.showBuild(); expect(s.mode).toBe('build');      // 이제 가능
  });
  it('non-branched tower resolves to a immediately', () => {
    const o = opts(); const s = new BottomSheet(fakeScene(), o);
    s.showPath('laser');                              // laser 는 paths 없음
    expect(o.onPathPick).toHaveBeenCalledWith('a');
    expect(s.isOpen).toBe(false);
  });
});
```

- [ ] **Step 2: 구현**

`BottomSheet.ts`:
- `showBuild`/`showInspect` 진입부: `if (this._mode === 'path') return;`
- `showPath(towerKey)`:
  ```ts
  const def = getTower(towerKey);
  if (!def.paths) { this.opts.onPathPick('a'); return; }
  this.buildPath(def);
  this._mode = 'path';
  this.slideIn();
  ```
- `private buildPath(def)`: `container.removeAll(true);`
  백드롭: `scene.add.rectangle(0, -GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT*2, 0x000000, 0.55).setInteractive()`
  를 **컨테이너 자식으로**(맨 먼저 add) — 컨테이너 depth 500 위 카드보다 아래. 탭 시 `this.hide(); this.opts.onDismiss();`.
  (백드롭이 화면 전체를 덮어 보드 입력 차단.)
  제목 `${def.name} — 경로 선택`, `(['a','b'] as const).forEach` 로 카드 —
  PathChoiceMenu.open 의 카드 렌더 그대로(`CARD_W=200, CARD_H=150, GAP=14`, name `#ffcc44`, desc + Lv5 DPS).
  카드 hit `attachPressFeedback(scene, cardHit, [cardHit, name], audioFor(scene), () => { const p = key; this.hide(); this.opts.onPathPick(p); })`.
  카드에 **엠블럼 아이콘**도 추가: `public/art/paths/` 에 64x64 PNG 12장 있음(main `a8274ae`).
  Preload 에 `this.load.image('path_${towerKey}_${p}', 'art/paths/<file>')` 로 로드하거나 파일명 규칙으로 직접.
  파일명 매핑 — arrow: `arrow-rapid-emblem-v1`(a)/`arrow-pierce-emblem-v1`(b),
  cannon: `cannon-suppress`(a)/`cannon-carpet`(b), frost: `frost-freeze`(a)/`frost-aura`(b),
  bolt: `bolt-overload`(a)/`bolt-lance`(b), sniper: `sniper-execute`(a)/`sniper-rail`(b),
  poison: `poison-corrupt`(a)/`poison-spread`(b). 카드 상단에 `scene.add.image(...).setScale(...)`.
- `hide()`: 기존대로. (`_mode` 즉시 null → 다음 `showBuild` 허용.)

- [ ] **Step 3: 통과** — `npx vitest run tests/ui/bottomSheet.test.ts` PASS, `npm run build` OK.

- [ ] **Step 4: 커밋**

```bash
git add src/ui/BottomSheet.ts tests/ui/bottomSheet.test.ts
git commit -m "feat(ui): BottomSheet path mode + backdrop + priority

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 2 — 코치 바 + Game 배선

### Task 4: 튜토리얼 코치 → 하단 바 (HUD.ts)

**Files:**
- Modify: `src/scenes/HUD.ts` (≈L108-128, `coach` 블록)

**Interfaces:**
- Consumes: 없음(독립). Produces: 없음(시각 변경). 이벤트 배선(`tutorial:step`, `onSkipTutorial`) 불변.

- [ ] **Step 1: 구현**

`coach` 컨테이너 좌표/크기만 변경:
```ts
const coach = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 30).setDepth(1800);
coach.add(this.add.rectangle(0, 0, GAME_WIDTH, 60, 0x0f1020, 0.95).setStrokeStyle(0));
const coachText = this.add.text(-GAME_WIDTH / 2 + 20, 0, data.tutorialText ?? '', {
  ...style, fontSize: '18px', color: '#ffe9b0', wordWrap: { width: GAME_WIDTH - 120 },
}).setOrigin(0, 0.5);
const coachSkip = this.add.text(GAME_WIDTH / 2 - 16, 0, '건너뛰기', {
  ...style, fontSize: '16px', color: '#8d98bb',
}).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
attachPressFeedback(this, coachSkip, [coachSkip], audio, data.onSkipTutorial);
coach.add([coachText, coachSkip]);
coach.setVisible(data.tutorialText !== null);
```
`on('tutorial:step', ...)` 블록은 그대로.

- [ ] **Step 2: 빌드 + 회귀**

Run: `npm test && npm run build` → 전부 PASS (HUD 는 씬이라 유닛 테스트 없음; 회귀만 확인).

- [ ] **Step 3: 커밋**

```bash
git add src/scenes/HUD.ts
git commit -m "feat(ui): move tutorial coach to a bottom strip

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Game.ts — 설치·정보 패널을 시트로 교체

**Files:**
- Modify: `src/scenes/Game.ts`

**Interfaces:**
- Consumes: Task 1·2 (`BottomSheet`, `showBuild`/`refreshBuild`/`showInspect`/`refreshInspect`/`hide`/`isOpen`/`mode`/`setBottomInset`), `InspectView`.
- Produces: `Game` 필드 `sheet: BottomSheet` (기존 `buildMenu` 대체). `inspectText`/`upgradeButton`/`sellButton` 필드 제거.

- [ ] **Step 1: 필드/생성 교체**

- import: `import { BottomSheet, type InspectView } from '../ui/BottomSheet';` (BuildMenu import 는 Task 7 에서 제거 — 지금은 남겨둬도 tsc OK).
- 필드: `private buildMenu!: BuildMenu;` → `private sheet!: BottomSheet;`.
  `private inspectText?...` / `upgradeButton?` / `sellButton?` **3줄 삭제**.
- `create()` 의 `this.buildMenu = new BuildMenu(this, {...})` (≈L343) →
  ```ts
  this.sheet = new BottomSheet(this, {
    onBuildPick: (key) => { if (this.pendingTile) this.placeTower(key, this.pendingTile); },
    canAfford: (key) => this.eco.canAfford(getTower(key).cost),
    isBanned: (key) => isTowerBanned(key, this.bannedTowerKey),
    isAtLimit: (key) => isTowerAtBuildLimit(key, this.countTowers(key)),
    limitLabel: (key) => `최대 ${towerBuildLimit(key)}개`,
    onUpgrade: () => this.tryUpgradeSelected(),
    onSell: () => this.sellSelected(),          // ↓ Step 4
    onPathPick: (p) => this.resolvePendingPath(p),   // Task 6
    onDismiss: () => this.onSheetDismiss(),
  });
  this.sheet.setBottomInset(this.tutorial ? 56 : 0);
  ```
- `create()` 의 `inspectText`/`upgradeButton`/`sellButton` 생성 블록(≈L199-235) **삭제**.
  단, 판매 버튼 콜백에 있던 판매 로직은 `sellSelected()` 메서드로 추출(Step 4).

- [ ] **Step 2: openBuildMenu / closeBuildMenu**

```ts
private openBuildMenu(tile: TileCoord): void {
  this.pendingTile = tile;
  const c = this.grid.tileToPixelCenter(tile);
  const previewKey = TOWER_KEYS.find((k) => !isTowerBanned(k, this.bannedTowerKey)) ?? TOWER_KEYS[0];
  const previewRange = getTower(previewKey).levels[0].range;
  this.buildPreview?.destroy();
  this.buildPreview = this.add.circle(c.x, c.y, previewRange, 0xffffff, 0.04)
    .setStrokeStyle(1, 0x66ccff, 0.3).setDepth(400);
  this.sheet.showBuild();
}
private closeBuildMenu(): void {
  this.sheet.hide();
  this.pendingTile = null;
  this.buildPreview?.destroy();
  this.buildPreview = null;
}
```

- [ ] **Step 3: showInspect / refreshUpgradeButton → InspectView**

```ts
private inspectView(tower: Tower): InspectView {
  const info = towerInfo(tower.key, tower.level, tower.path);
  const pathName = tower.path ? ` · ${getTower(tower.key).paths![tower.path].name}` : '';
  const buffRadius = tower.stats().buffRadius;
  const dpsLine = buffRadius != null
    ? `버프 범위 ${Math.round((buffRadius * 2) / TILE)}칸`
    : info.nextDps != null ? `DPS ${info.dps} → ${info.nextDps}` : `DPS ${info.dps} (최대)`;
  const rate = Number(info.fireRate.toFixed(2));
  const lines = [dpsLine, `사거리 ${buffRadius ?? info.range}   연사 ${rate}/초`];
  if (info.note) lines.push(info.note);
  const maxed = tower.level >= tower.maxLevel;
  const cost = upgradeCost(getTower(tower.key), tower.level);
  const refund = Math.floor(cumulativeCost(getTower(tower.key), tower.level) * this.eco.sellRatio);
  return {
    title: `${info.name}${pathName} Lv${info.level}`,
    lines,
    upgrade: maxed ? null : { label: `⬆ Lv${tower.level + 1} 강화  ${cost}G`, afford: this.eco.gold >= cost },
    sell: { label: `⌫ 판매 +${refund}G` },
  };
}

private showInspect(tower?: Tower): void {
  if (!tower || !this.towers.includes(tower)) {
    this.selectedTower = undefined;
    if (this.sheet.mode === 'inspect') this.sheet.hide();
    return;
  }
  this.selectedTower = tower;
  this.sheet.showInspect(this.inspectView(tower));
}
```
`refreshUpgradeButton()` 삭제, 호출부(update L1290)를:
```ts
if (this.sheet.mode === 'build') this.sheet.refreshBuild();
else if (this.sheet.mode === 'inspect' && this.selectedTower && this.towers.includes(this.selectedTower))
  this.sheet.refreshInspect(this.inspectView(this.selectedTower));
```
(update L1289 `if (this.buildMenu.isOpen) this.buildMenu.refresh();` 도 위로 대체.)

- [ ] **Step 4: sellSelected 추출 + catcher + 정리 훅 + 튜토리얼 inset**

- 기존 판매 버튼 콜백 본문을 `private sellSelected(): void { ... }` 로. (선택 타워 판매 확인 팝업 or 즉시 판매 —
  기존 동작 그대로 옮긴다. 원래 콜백이 `showSellPrompt` 를 부르면 그대로.)
- catcher `pointerup`: `this.pathMenu.isOpen` 분기 삭제(`path` 는 백드롭이 처리). 나머지:
  ```ts
  if (this.time.now < this.suppressTapUntil) return;
  if (this.sheet.mode === 'path') return;         // 백드롭이 먹지만 이중 안전
  this.clearTowerRanges();
  if (this.sheet.isOpen) { this.closeBuildMenu(); this.showInspect(undefined); return; }
  const tile = this.grid.pixelToTile({ x: pointer.worldX, y: pointer.worldY });
  if (!this.grid.canPlace(tile)) return;
  this.openBuildMenu(tile);
  ```
- `onSheetDismiss()`: `this.pendingTile = null; this.buildPreview?.destroy(); this.buildPreview = null;` (build/inspect dismiss 정리).
- SHUTDOWN(L188) `this.pathMenu?.destroy()` → `this.sheet?.destroy()`.
  `removeTower`(L623)·`endStage`(L776) `this.pathMenu?.close()` → `this.sheet?.hide()`.
  (기존 `this.buildMenu` 참조 전부 `this.sheet` 로.)
- `finishTutorial()`/`skipTutorial()` 에 `this.sheet?.setBottomInset(0);` 추가.

- [ ] **Step 5: 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS. `tests/balance/**` 불변(시트는 시뮬에서 `showBuild` 등 호출 안 됨 — 생성만).
harness 가짜 씬이 `BottomSheet` 생성자(`add.container` 등)를 견디는지 확인 — 안 되면 no-op 메서드 추가.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/Game.ts
git commit -m "feat(ui): route build menu + tower panel through BottomSheet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Game.ts — 경로 선택을 시트로

**Files:**
- Modify: `src/scenes/Game.ts`

**Interfaces:**
- Consumes: Task 3 (`sheet.showPath`), Task 5 (`this.sheet`, `onPathPick`/`onDismiss` opts).
- Produces: `Game` 필드 `pendingPathAction?: (p: 'a' | 'b') => void`. `this.pathMenu` 필드 완전 제거.

- [ ] **Step 1: pending 액션 저장소**

```ts
private pendingPathAction?: (p: 'a' | 'b') => void;

private resolvePendingPath(p: 'a' | 'b'): void {
  const act = this.pendingPathAction;
  this.pendingPathAction = undefined;
  act?.(p);
}
```
`onSheetDismiss()` 에 `this.pendingPathAction = undefined;` 추가(경로 선택 취소 시 액션 폐기).

- [ ] **Step 2: tryUpgradeSelected**

`if (tower.needsPathChoice) this.pathMenu.open(tower.key, tower.homePos, finish); else finish();` →
```ts
if (tower.needsPathChoice) { this.pendingPathAction = finish; this.sheet.showPath(tower.key); }
else finish();
```
(`finish` 은 `(path?) => {...}` 그대로. `showPath` 가 비분기 타워면 즉시 `onPathPick('a')` → `resolvePendingPath('a')` → `finish('a')`. 분기 타워는 카드 선택까지 대기.)

- [ ] **Step 3: dragend 머지**

`if (targetTower.needsPathChoice) { this.snapHome(dragged); this.pathMenu.open(targetTower.key, targetTower.homePos, doMerge); } else doMerge();` →
```ts
if (targetTower.needsPathChoice) {
  this.snapHome(dragged);
  this.pendingPathAction = doMerge;
  this.sheet.showPath(targetTower.key);
} else doMerge();
```

- [ ] **Step 4: pathMenu 잔재 제거**

`this.pathMenu` 필드 선언, `create` 의 `this.pathMenu = new PathChoiceMenu(this)` (L196),
SHUTDOWN/`removeTower`/`endStage` 의 `this.pathMenu?.*` — 전부 삭제(정리는 Task 5 에서 `this.sheet` 로 이미 대체됨).
`import { PathChoiceMenu }` 제거(Task 7 에서 파일 삭제하지만 import 는 지금 지운다 — noUnusedLocals).

- [ ] **Step 5: 회귀 + 빌드**

Run: `npm test && npm run build` → PASS. `tests/balance/harness.ts` 의 `merge` 는 `to.setLevel(to.level+1, path)`
로 경로를 직접 넘기므로 UI 무관, 불변.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/Game.ts
git commit -m "feat(ui): route Lv3 path choice through BottomSheet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 3 — 정리 + 검증

### Task 7: BuildMenu·PathChoiceMenu 삭제 + 검증 + ROADMAP

**Files:**
- Delete: `src/ui/BuildMenu.ts`, `src/ui/PathChoiceMenu.ts`
- Delete/Modify: `tests/ui/*` 중 위 두 컴포넌트 전용 테스트
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: 참조 확인**

```bash
grep -rn "BuildMenu\|PathChoiceMenu" src/ tests/
```
Expected: `src/scenes/Game.ts` 에 import·사용 없음(Task 5·6 에서 제거됨). 테스트에만 남아 있어야 함.

- [ ] **Step 2: 삭제**

```bash
git rm src/ui/BuildMenu.ts src/ui/PathChoiceMenu.ts
```
`tests/ui/` 에 `buildMenu.test.ts` / `pathChoice.test.ts` 류가 있으면: 검증 의도(봉인 표시, atLimit "가득",
비분기 즉시 'a')가 `tests/ui/bottomSheet.test.ts` 에 커버되는지 확인 후 `git rm`. 커버 안 되면 시트 테스트에 이관.

- [ ] **Step 3: 전체 회귀 + 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS. `tests/architecture.test.ts`(core/systems phaser 금지) 영향 없음.

- [ ] **Step 4: 브라우저 검증** (`npm run dev`, 뷰포트 모바일 375×812)

`window.__game` 로 Game 씬 진입 후 확인:
1. 빈 칸 탭 → 하단에서 타워 그리드 슬라이드 업. 다른 빈 칸 탭 → 유지/갱신. 빈 보드 탭 → 내려감.
2. 타워 탭 → 하단에 정보 + 강화/판매. 강화 눌러 Lv2 → 다시 강화 → **하단에 A/B 카드** + 백드롭.
   카드 선택 → 카드 사라지고 타워 Lv3, 정보 패널이 "· 경로명 Lv3".
3. 백드롭(카드 바깥) 탭 → 카드 닫힘, 골드 안 나감, 타워 Lv2 유지.
4. Lv3 A + Lv3 B 드래그 → 머지 안 되고 자리 교체(기존 동작).
5. 1-1 진입 시 튜토리얼 코치가 **화면 하단 얇은 바**로, 그 위로 시트가 슬라이드 업.
   튜토리얼 끝나면 코치 사라지고 시트 바닥 오프셋 0.
6. `read_console_messages` 에러 없음. 스크린샷 3장(build/inspect/path) 증빙.

- [ ] **Step 5: ROADMAP + 커밋**

`docs/ROADMAP.md` "완료" 에:
```markdown
- **하단 시트 UI**: 설치 메뉴·경로 선택·타워 정보/강화/판매를 화면 하단 슬라이드 시트 하나로 통합
  (`src/ui/BottomSheet.ts`). 튜토리얼 코치는 하단 얇은 바로. BuildMenu·PathChoiceMenu 삭제.
```

```bash
git add -A
git commit -m "chore(ui): drop BuildMenu/PathChoiceMenu, roadmap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin feature/bottom-sheet   # PR 리뷰 후 main
```

---

## Self-Review (작성자 체크 — 완료)

**1. Spec coverage:**
- 컴포넌트 `BottomSheet.ts` 3모드 → Task 1·2·3 ✅
- 레이아웃(하단 앵커, 슬라이드, path 백드롭, 코치 inset) → Task 1(slideIn), Task 3(백드롭), Task 4·5(inset) ✅
- 모드 규칙 표(빈칸/타워 탭, 교체, path 우선, dismiss) → Task 3(우선), Task 5(catcher/교체) ✅
- 코치 바 이동 → Task 4 ✅
- 보스바 유지 → 명시적 비목표, 태스크 없음 ✅
- 이관 매핑(BuildMenu/PathChoiceMenu/inspect 3필드/pathMenu 필드) → Task 5·6·7 ✅
- 테스트(bottomSheet.test, harness 가짜 씬, 기존 테스트 이관) → Task 1-3, Task 5 Step 5, Task 7 ✅

**2. Placeholder scan:** Task 2 Step 1 이 "버튼 콜백 발화는 브라우저 검증에서" 로 명시적 위임 — 유닛 한계라 OK.
`sellSelected()` 는 "기존 동작 그대로 옮긴다" 로 남김: 원본 콜백이 짧고(showSellPrompt 호출) 구현자가 그 자리에서 봄. 그 외 TBD 없음.

**3. Type consistency:** `SheetMode`/`BottomSheetOpts`/`InspectView` — Task 1 정의, Task 2 확장, Task 5·6 소비 일치.
`showBuild()/showInspect(view)/showPath(key)/refreshBuild()/refreshInspect(view)/hide()/mode/isOpen/setBottomInset` —
Task 1-3 정의, Task 5·6 호출 시그니처 일치. `onPathPick`/`onDismiss`/`onUpgrade`/`onSell` opts — Task 1 선언, Task 5 채움.
`pendingPathAction: (p:'a'|'b')=>void` — Task 6 내부 일관.
