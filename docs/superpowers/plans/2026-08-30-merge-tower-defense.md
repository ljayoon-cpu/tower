# 머지 타워디펜스 Implementation Plan

> **상태 (2026-08-31): Task 1~22 완료.** 이후 작업과 방향은 [/CLAUDE.md](../../../CLAUDE.md)와
> [/docs/ROADMAP.md](../../ROADMAP.md)를 본다. 이 문서는 초기 구현 기록으로 남긴다.
> (체크박스는 실제 진행과 무관하게 갱신되지 않았다 — 완료 여부는 git 로그 기준.)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고전 타워디펜스에 머지 업그레이드를 결합한 세로 화면 모바일 게임(v1: 월드 1, 스테이지 1-1~1-5)을 PWA로 완성한다.

**Architecture:** Phaser 3가 렌더/입력/씬을 담당하고, 게임 규칙(그리드·경로·이코노미·웨이브·타겟팅·머지)은 Phaser에 의존하지 않는 순수 TS 모듈로 분리해 Vitest로 단위 테스트한다. 타워·적·스테이지는 전부 데이터 파일로 정의한다. 씬은 `eventBus`로 통신한다.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, vite-plugin-pwa. 패키지 매니저는 npm.

**Spec:** `docs/superpowers/specs/2026-08-30-merge-tower-defense-design.md`

## Global Constraints

- 언어: TypeScript strict 모드. `any` 금지(불가피하면 주석으로 사유).
- 화면: 세로 고정, 기준 해상도 **720×1280**, Phaser `Scale.FIT` + `Scale.CENTER_BOTH`.
- 엔진: **Phaser 3** (npm `phaser`, 3.80 이상).
- 순수 로직 모듈(`src/systems/`, `src/core/`)은 `phaser`를 import 하지 않는다. 이 규칙은 Vitest 테스트로 강제한다.
- 데이터 주도: 타워/적/스테이지 수치는 `src/data/`에만 존재. 시스템 코드에 매직 넘버 밸런싱 값 금지.
- 좌표 단위: 그리드 타일 좌표 `{col, row}` 와 픽셀 좌표 `{x, y}` 를 타입으로 구분(`TileCoord`, `Vec2`).
- 저장: `localStorage` 키 프리픽스 `mtd:` (merge-tower-defense).
- 타워 최대 레벨 **5**. 머지 조건: 같은 `key` AND 같은 `level` AND `level < maxLevel`. 머지 비용 0.
- 커밋: 각 태스크 종료 시 커밋. 커밋 메시지는 Conventional Commits(`feat:`, `test:`, `chore:` ...).
- 모든 커밋 메시지 끝에 다음 줄 추가:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

---

## File Structure

```
game/
  index.html
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  public/
    manifest.webmanifest
    icons/icon-192.png  icons/icon-512.png
  src/
    main.ts                      # Phaser.Game 부트스트랩
    core/
      types.ts                   # 전 게임 공용 타입
      constants.ts               # 해상도, 타일 크기, 색 팔레트, 저장 키
      eventBus.ts                # typed 이벤트 emitter (Phaser 비의존)
      save.ts                    # localStorage 로드/세이브
      rng.ts                     # 시드 가능한 난수(테스트 결정성)
    systems/                     # 전부 Phaser 비의존, 순수 로직
      GridManager.ts
      PathManager.ts
      EconomyManager.ts
      WaveManager.ts
      TargetingSystem.ts
      MergeController.ts
    data/
      towers.ts  enemies.ts
      stages/index.ts
      stages/stage-1-1.ts ... stage-1-5.ts
    entities/                    # Phaser 오브젝트 래퍼
      Enemy.ts  Tower.ts  Projectile.ts
    scenes/
      Boot.ts  Preload.ts  MainMenu.ts  StageSelect.ts  Game.ts  HUD.ts  Result.ts
    ui/
      BuildMenu.ts
      textures.ts                # generateTexture 도형 정의
  tests/
    systems/*.test.ts
    core/*.test.ts
    data/stages.test.ts
    architecture.test.ts         # 순수 모듈이 phaser를 import 안 하는지 검사
```

**책임 분리 요지**
- `systems/*`: 입력을 받아 순수하게 상태 전이/계산만. Phaser·DOM·시간 API 직접 접근 금지(경과시간 `dtMs`를 인자로 받음).
- `entities/*`: 시스템이 계산한 상태를 Phaser 스프라이트에 반영. 규칙 없음.
- `scenes/Game.ts`: 시스템들을 조립하고 매 프레임 `update(dtMs)` 호출, 이벤트 배선.
- `data/*`: 순수 상수. 함수 있으면 순수 함수만.

---

## Task 1: 프로젝트 스캐폴드 + 개발 서버

**Files:**
- Create: `game/package.json`, `game/tsconfig.json`, `game/vite.config.ts`, `game/vitest.config.ts`, `game/index.html`, `game/.gitignore`
- Create: `game/src/main.ts`, `game/src/core/constants.ts`
- Create: `game/src/scenes/Boot.ts`, `game/src/scenes/Preload.ts`, `game/src/scenes/MainMenu.ts`
- Create: `game/tests/architecture.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `constants.ts` exports: `GAME_WIDTH = 720`, `GAME_HEIGHT = 1280`, `TILE = 64`, `COLORS` (레트로 팔레트 객체), `SAVE_KEY = 'mtd:save'`
  - `main.ts` default export: 없음 (부작용으로 `new Phaser.Game(config)` 생성)
  - 씬 클래스 `Boot`, `Preload`, `MainMenu` (각각 `Phaser.Scene` 상속, `key` 는 클래스명 소문자)

- [ ] **Step 1: `git init` 및 프로젝트 초기화**

```bash
cd game
git init
npm init -y
npm install phaser
npm install -D typescript vite vitest @types/node vite-plugin-pwa
```

- [ ] **Step 2: `package.json` scripts 설정**

`package.json` 의 `"scripts"` 를 다음으로 교체:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: `tsconfig.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: `vite.config.ts` 와 `vitest.config.ts` 작성**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '머지 타워디펜스',
        short_name: 'MergeTD',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#0f1020',
        theme_color: '#0f1020',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 5: `index.html` 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <title>머지 타워디펜스</title>
    <style>
      html, body { margin: 0; padding: 0; background: #0f1020; overflow: hidden; }
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: `.gitignore` 작성**

```
node_modules
dist
dev-dist
*.local
.DS_Store
```

- [ ] **Step 7: `src/core/constants.ts` 작성**

```ts
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const TILE = 64;              // 픽셀. 그리드 11열 x 20행 = 704x1280

export const GRID_COLS = 11;
export const GRID_ROWS = 20;

export const SAVE_KEY = 'mtd:save';

export const COLORS = {
  bg: 0x0f1020,
  path: 0x2a2c44,
  buildable: 0x1b1d33,
  grid: 0x2f3350,
  text: 0xf2f2f7,
  gold: 0xffcc44,
  life: 0xff5566,
  arrow: 0x66ccff,
  cannon: 0xff9944,
  frost: 0x99e6ff,
  bolt: 0xffe066,
  enemyNormal: 0xff6688,
  enemyFast: 0x66ff99,
  enemyTank: 0xaa88ff,
  enemyBoss: 0xff3355,
} as const;
```

- [ ] **Step 8: 세 씬 작성 (Boot, Preload, MainMenu)**

`src/scenes/Boot.ts`:

```ts
import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() { this.scene.start('preload'); }
}
```

`src/scenes/Preload.ts`:

```ts
import Phaser from 'phaser';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  preload() {
    // 이후 태스크에서 텍스처 생성 추가
  }
  create() { this.scene.start('mainmenu'); }
}
```

`src/scenes/MainMenu.ts`:

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/constants';

export class MainMenu extends Phaser.Scene {
  constructor() { super('mainmenu'); }
  create() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '머지 타워디펜스', {
      fontFamily: 'monospace', fontSize: '56px', color: '#f2f2f7',
    }).setOrigin(0.5);

    const start = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, '▶ 시작', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffcc44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerup', () => this.scene.start('stageselect'));
    // stageselect 씬은 Task 13에서 추가. 그 전까지는 'game' 으로 바꿔 임시 테스트.
  }
}
```

- [ ] **Step 9: `src/main.ts` 작성**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './core/constants';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preload, MainMenu],
});
```

- [ ] **Step 10: 아키텍처 가드 테스트 작성**

`tests/architecture.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PURE_DIRS = ['src/systems', 'src/core'];

function tsFiles(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('architecture', () => {
  it('pure logic modules do not import phaser', () => {
    for (const dir of PURE_DIRS) {
      for (const f of tsFiles(dir)) {
        const src = readFileSync(f, 'utf8');
        expect(src, `${f} imports phaser`).not.toMatch(/from ['"]phaser['"]/);
      }
    }
  });
});
```

- [ ] **Step 11: 테스트 실행 (통과 확인)**

Run: `npm test`
Expected: PASS (`architecture` 1 test). `src/systems` 폴더가 없으면 생성: `mkdir -p src/systems`.

- [ ] **Step 12: 개발 서버 수동 확인**

Run: `npm run dev`
Expected: 브라우저에서 `localhost:5173` 열면 검은 배경 + "머지 타워디펜스" 제목 + "▶ 시작" 텍스트. 콘솔 에러 없음. (임시로 MainMenu의 `stageselect` → `game` 로 두었다면 클릭 시 씬 없음 에러가 나므로, 이 태스크에서는 클릭 전까지만 확인.)

- [ ] **Step 13: 커밋**

```bash
git add -A
git commit -m "chore: scaffold vite + phaser + vitest project

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: 공용 타입 + eventBus + rng

**Files:**
- Create: `src/core/types.ts`, `src/core/eventBus.ts`, `src/core/rng.ts`
- Test: `tests/core/eventBus.test.ts`, `tests/core/rng.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `types.ts`: `Vec2`, `TileCoord`, `TileType`, `PathNode`, `AttackKind`, `TowerDef`, `TowerLevelStats`, `EnemyDef`, `WaveGroup`, `Wave`, `StageDef`, `SaveData`, `GameEvents` (아래 코드 그대로)
  - `eventBus.ts`: `createEventBus<T>()` → `{ on, off, emit }`. `emit(event, payload)` 타입 안전.
  - `rng.ts`: `class Rng { constructor(seed: number); next(): number /*0~1*/; int(maxExclusive: number): number; pick<T>(arr: T[]): T }`

- [ ] **Step 1: `src/core/types.ts` 작성**

```ts
export interface Vec2 { x: number; y: number; }
export interface TileCoord { col: number; row: number; }

export type TileType = 'PATH' | 'BUILDABLE' | 'BLOCKED';

/** 경로 트리. points 를 따라가다 branches 가 있으면 각 분기로 갈라진다. */
export interface PathNode {
  points: Vec2[];
  branches?: PathNode[];
}

export type AttackKind = 'single' | 'splash' | 'slow' | 'chain';

export interface TowerLevelStats {
  damage: number;
  range: number;        // 픽셀
  fireRate: number;     // 초당 발사 횟수
  splashRadius?: number;
  slowMul?: number;     // 0.5 = 50% 감속
  slowDurationMs?: number;
  chainTargets?: number;  // 1차 대상 외에 추가로 튀는 적 수 (chain)
  chainFalloff?: number;  // 점프마다 곱해지는 데미지 배율 (0.65 = 매 점프 65%)
  chainRange?: number;    // 마지막 피격 적으로부터 다음 체인 대상 탐색 반경(px)
}

export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;         // Lv1 설치 비용
  maxLevel: number;     // 5
  levels: TowerLevelStats[]; // length === maxLevel, index 0 = Lv1
}

export interface EnemyDef {
  key: string;
  name: string;
  hp: number;
  speed: number;        // 픽셀/초
  bounty: number;
  lifeDamage: number;
  isBoss?: boolean;
}

export interface WaveGroup {
  enemy: string;        // EnemyDef.key
  count: number;
  intervalMs: number;   // 그룹 내 스폰 간격
  startDelayMs: number; // 웨이브 시작 기준 지연
}

export interface Wave {
  groups: WaveGroup[];
  clearBonus: number;
}

export interface StageDef {
  id: string;                 // '1-1'
  grid: TileType[][];         // [row][col]
  path: PathNode;
  spawn: Vec2;                // 픽셀
  goals: Vec2[];              // 픽셀, 분기 끝점들
  startGold: number;
  startLives: number;
  waves: Wave[];
  starThresholds: [number, number, number]; // 남은 라이프 비율 하한 [1별,2별,3별], 오름차순
}

export interface StageProgress { stars: number; unlocked: boolean; }
export interface SaveData { stages: Record<string, StageProgress>; }

export interface GameEvents {
  'enemy:killed': { bounty: number };
  'enemy:reachedGoal': { lifeDamage: number };
  'gold:changed': { gold: number };
  'life:changed': { lives: number };
  'wave:started': { index: number; total: number };
  'wave:cleared': { index: number };
  'stage:won': { stars: number };
  'stage:lost': Record<string, never>;
  'speed:changed': { multiplier: number };
}
```

- [ ] **Step 2: `tests/core/eventBus.test.ts` 작성 (실패)**

```ts
import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents } from '../../src/core/types';

describe('eventBus', () => {
  it('delivers payload to subscribers', () => {
    const bus = createEventBus<GameEvents>();
    const seen: number[] = [];
    bus.on('gold:changed', (p) => seen.push(p.gold));
    bus.emit('gold:changed', { gold: 42 });
    bus.emit('gold:changed', { gold: 7 });
    expect(seen).toEqual([42, 7]);
  });

  it('off removes the listener', () => {
    const bus = createEventBus<GameEvents>();
    const seen: number[] = [];
    const fn = (p: { lives: number }) => seen.push(p.lives);
    bus.on('life:changed', fn);
    bus.off('life:changed', fn);
    bus.emit('life:changed', { lives: 3 });
    expect(seen).toEqual([]);
  });
});
```

- [ ] **Step 3: 실행 → 실패 확인**

Run: `npm test -- eventBus`
Expected: FAIL ("Cannot find module ... eventBus").

- [ ] **Step 4: `src/core/eventBus.ts` 구현**

```ts
type Handler<P> = (payload: P) => void;

export function createEventBus<T extends Record<string, unknown>>() {
  const map = new Map<keyof T, Set<Handler<unknown>>>();

  return {
    on<K extends keyof T>(event: K, fn: Handler<T[K]>) {
      let set = map.get(event);
      if (!set) { set = new Set(); map.set(event, set); }
      set.add(fn as Handler<unknown>);
    },
    off<K extends keyof T>(event: K, fn: Handler<T[K]>) {
      map.get(event)?.delete(fn as Handler<unknown>);
    },
    emit<K extends keyof T>(event: K, payload: T[K]) {
      map.get(event)?.forEach((fn) => (fn as Handler<T[K]>)(payload));
    },
    clear() { map.clear(); },
  };
}

export type EventBus<T extends Record<string, unknown>> = ReturnType<typeof createEventBus<T>>;
```

- [ ] **Step 5: `tests/core/rng.test.ts` 작성 (실패)**

```ts
import { Rng } from '../../src/core/rng';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('int returns values in [0, maxExclusive)', () => {
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
```

- [ ] **Step 6: 실행 → 실패 확인**

Run: `npm test -- rng`
Expected: FAIL.

- [ ] **Step 7: `src/core/rng.ts` 구현 (mulberry32)**

```ts
export class Rng {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
}
```

- [ ] **Step 8: 전체 테스트 실행**

Run: `npm test`
Expected: PASS (architecture + eventBus 2 + rng 2).

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: add core types, typed event bus, seedable rng

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: save.ts (localStorage 진행도)

**Files:**
- Create: `src/core/save.ts`
- Test: `tests/core/save.test.ts`

**Interfaces:**
- Consumes: `SaveData`, `StageProgress` from `core/types`; `SAVE_KEY` from `core/constants`
- Produces:
  - `loadSave(storage?: StorageLike): SaveData` — 없거나 파싱 실패 시 `{ stages: {} }`
  - `writeSave(data: SaveData, storage?: StorageLike): void`
  - `recordResult(stageId: string, stars: number, nextStageId: string | null, storage?: StorageLike): SaveData` — 별점은 최대값 유지, `nextStageId` 해금, 저장 후 반환
  - `isUnlocked(data: SaveData, stageId: string): boolean` — `'1-1'` 은 항상 true
  - `type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void }`

- [ ] **Step 1: `tests/core/save.test.ts` 작성 (실패)**

```ts
import { loadSave, recordResult, isUnlocked } from '../../src/core/save';
import type { StorageLike } from '../../src/core/save';

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
  };
}

describe('save', () => {
  it('returns empty save when storage is blank', () => {
    expect(loadSave(memStorage())).toEqual({ stages: {} });
  });

  it('1-1 is always unlocked', () => {
    expect(isUnlocked({ stages: {} }, '1-1')).toBe(true);
    expect(isUnlocked({ stages: {} }, '1-2')).toBe(false);
  });

  it('recordResult keeps best stars and unlocks next stage', () => {
    const s = memStorage();
    recordResult('1-1', 2, '1-2', s);
    let data = recordResult('1-1', 1, '1-2', s); // 낮은 별점은 무시
    expect(data.stages['1-1'].stars).toBe(2);
    expect(data.stages['1-2'].unlocked).toBe(true);
    expect(isUnlocked(data, '1-2')).toBe(true);
  });

  it('persists across loads', () => {
    const s = memStorage();
    recordResult('1-1', 3, '1-2', s);
    expect(loadSave(s).stages['1-1'].stars).toBe(3);
  });

  it('tolerates corrupt json', () => {
    const s = memStorage();
    s.setItem('mtd:save', '{not json');
    expect(loadSave(s)).toEqual({ stages: {} });
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- save`
Expected: FAIL.

- [ ] **Step 3: `src/core/save.ts` 구현**

```ts
import { SAVE_KEY } from './constants';
import type { SaveData } from './types';

export type StorageLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
};

function defaultStorage(): StorageLike {
  if (typeof localStorage !== 'undefined') return localStorage;
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
}

export function loadSave(storage: StorageLike = defaultStorage()): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { stages: {} };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.stages) return parsed as SaveData;
    return { stages: {} };
  } catch {
    return { stages: {} };
  }
}

export function writeSave(data: SaveData, storage: StorageLike = defaultStorage()): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function isUnlocked(data: SaveData, stageId: string): boolean {
  if (stageId === '1-1') return true;
  return data.stages[stageId]?.unlocked ?? false;
}

export function recordResult(
  stageId: string,
  stars: number,
  nextStageId: string | null,
  storage: StorageLike = defaultStorage(),
): SaveData {
  const data = loadSave(storage);
  const prev = data.stages[stageId];
  data.stages[stageId] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    unlocked: true,
  };
  if (nextStageId && stars > 0) {
    const n = data.stages[nextStageId];
    data.stages[nextStageId] = { stars: n?.stars ?? 0, unlocked: true };
  }
  writeSave(data, storage);
  return data;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- save`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add localStorage save with best-stars and stage unlock

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: GridManager

**Files:**
- Create: `src/systems/GridManager.ts`
- Test: `tests/systems/GridManager.test.ts`

**Interfaces:**
- Consumes: `TileType`, `TileCoord`, `Vec2` from `core/types`; `TILE` from `core/constants`
- Produces:
  - `class GridManager`
    - `constructor(grid: TileType[][])`
    - `tileAt(c: TileCoord): TileType | null` — 범위 밖이면 null
    - `pixelToTile(p: Vec2): TileCoord` — `col = floor(x / TILE)`, `row = floor(y / TILE)`
    - `tileToPixelCenter(c: TileCoord): Vec2` — 타일 중심 픽셀
    - `canPlace(c: TileCoord): boolean` — `BUILDABLE` 이고 미점유
    - `occupy(c: TileCoord, towerId: number): void`
    - `release(c: TileCoord): void`
    - `occupantAt(c: TileCoord): number | null`

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/GridManager.test.ts`:

```ts
import { GridManager } from '../../src/systems/GridManager';
import type { TileType } from '../../src/core/types';

// 3x3: 가운데 세로줄이 PATH, 나머지 BUILDABLE, [0][0] BLOCKED
const grid: TileType[][] = [
  ['BLOCKED',  'PATH', 'BUILDABLE'],
  ['BUILDABLE','PATH', 'BUILDABLE'],
  ['BUILDABLE','PATH', 'BUILDABLE'],
];

describe('GridManager', () => {
  it('maps pixel to tile and back to center', () => {
    const g = new GridManager(grid);
    expect(g.pixelToTile({ x: 70, y: 10 })).toEqual({ col: 1, row: 0 });
    expect(g.tileToPixelCenter({ col: 1, row: 0 })).toEqual({ x: 96, y: 32 });
  });

  it('tileAt returns null out of bounds', () => {
    const g = new GridManager(grid);
    expect(g.tileAt({ col: 9, row: 0 })).toBeNull();
    expect(g.tileAt({ col: 0, row: 0 })).toBe('BLOCKED');
  });

  it('canPlace only on empty BUILDABLE', () => {
    const g = new GridManager(grid);
    expect(g.canPlace({ col: 2, row: 0 })).toBe(true);   // BUILDABLE
    expect(g.canPlace({ col: 1, row: 0 })).toBe(false);  // PATH
    expect(g.canPlace({ col: 0, row: 0 })).toBe(false);  // BLOCKED
  });

  it('occupy blocks further placement until release', () => {
    const g = new GridManager(grid);
    g.occupy({ col: 2, row: 0 }, 7);
    expect(g.canPlace({ col: 2, row: 0 })).toBe(false);
    expect(g.occupantAt({ col: 2, row: 0 })).toBe(7);
    g.release({ col: 2, row: 0 });
    expect(g.canPlace({ col: 2, row: 0 })).toBe(true);
    expect(g.occupantAt({ col: 2, row: 0 })).toBeNull();
  });
});
```

TILE=64 이므로 center of (col1,row0) = (1*64+32, 0*64+32) = (96,32). 테스트 값 확인.

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- GridManager`
Expected: FAIL.

- [ ] **Step 3: `src/systems/GridManager.ts` 구현**

```ts
import { TILE } from '../core/constants';
import type { TileType, TileCoord, Vec2 } from '../core/types';

export class GridManager {
  private readonly rows: number;
  private readonly cols: number;
  private readonly occupants = new Map<string, number>();

  constructor(private readonly grid: TileType[][]) {
    this.rows = grid.length;
    this.cols = grid[0]?.length ?? 0;
  }

  private key(c: TileCoord): string { return `${c.col},${c.row}`; }

  tileAt(c: TileCoord): TileType | null {
    if (c.row < 0 || c.row >= this.rows || c.col < 0 || c.col >= this.cols) return null;
    return this.grid[c.row][c.col];
  }

  pixelToTile(p: Vec2): TileCoord {
    return { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
  }

  tileToPixelCenter(c: TileCoord): Vec2 {
    return { x: c.col * TILE + TILE / 2, y: c.row * TILE + TILE / 2 };
  }

  occupantAt(c: TileCoord): number | null {
    return this.occupants.get(this.key(c)) ?? null;
  }

  canPlace(c: TileCoord): boolean {
    return this.tileAt(c) === 'BUILDABLE' && this.occupantAt(c) === null;
  }

  occupy(c: TileCoord, towerId: number): void {
    this.occupants.set(this.key(c), towerId);
  }

  release(c: TileCoord): void {
    this.occupants.delete(this.key(c));
  }
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- GridManager`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add GridManager (tile<->pixel, placement, occupancy)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: PathManager (분기 경로 + 진행률)

**Files:**
- Create: `src/systems/PathManager.ts`
- Test: `tests/systems/PathManager.test.ts`

**Interfaces:**
- Consumes: `PathNode`, `Vec2` from `core/types`; `Rng` from `core/rng`
- Produces:
  - `class PathManager`
    - `constructor(root: PathNode)`
    - `routes(): Vec2[][]` — 루트→각 잎(goal)까지 이어붙인 폴리라인 배열. 분기 없으면 길이 1.
    - `chooseRoute(rng: Rng): { routeIndex: number; polyline: Vec2[]; length: number }`
    - `static advance(polyline: Vec2[], distance: number): { pos: Vec2; done: boolean; progress: number }`
      — 폴리라인 시작부터 `distance`(픽셀)만큼 이동한 위치. `distance >= 전체길이` 면 `done: true`, `pos = 마지막점`. `progress` 는 0~1.
    - `static polylineLength(polyline: Vec2[]): number`

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/PathManager.test.ts`:

```ts
import { PathManager } from '../../src/systems/PathManager';
import { Rng } from '../../src/core/rng';
import type { PathNode } from '../../src/core/types';

// (0,0) -> (100,0) 후 두 분기: 위로 (100,-50), 아래로 (100,50)
const root: PathNode = {
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  branches: [
    { points: [{ x: 100, y: 0 }, { x: 100, y: -50 }] },
    { points: [{ x: 100, y: 0 }, { x: 100, y: 50 }] },
  ],
};

describe('PathManager', () => {
  it('expands into one polyline per leaf', () => {
    const pm = new PathManager(root);
    const rs = pm.routes();
    expect(rs.length).toBe(2);
    expect(rs[0][rs[0].length - 1]).toEqual({ x: 100, y: -50 });
    expect(rs[1][rs[1].length - 1]).toEqual({ x: 100, y: 50 });
  });

  it('polylineLength sums segments', () => {
    expect(PathManager.polylineLength([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])).toBe(150);
  });

  it('advance interpolates along the polyline', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const a = PathManager.advance(line, 25);
    expect(a.pos).toEqual({ x: 25, y: 0 });
    expect(a.done).toBe(false);
    expect(a.progress).toBeCloseTo(0.25);
  });

  it('advance clamps and reports done at the end', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const a = PathManager.advance(line, 999);
    expect(a.pos).toEqual({ x: 100, y: 0 });
    expect(a.done).toBe(true);
    expect(a.progress).toBe(1);
  });

  it('chooseRoute is deterministic under a seeded rng', () => {
    const pm = new PathManager(root);
    const i1 = new PathManager(root).chooseRoute(new Rng(5)).routeIndex;
    const i2 = pm.chooseRoute(new Rng(5)).routeIndex;
    expect(i1).toBe(i2);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- PathManager`
Expected: FAIL.

- [ ] **Step 3: `src/systems/PathManager.ts` 구현**

```ts
import type { PathNode, Vec2 } from '../core/types';
import type { Rng } from '../core/rng';

export class PathManager {
  private readonly _routes: Vec2[][];

  constructor(root: PathNode) {
    this._routes = PathManager.expand(root);
  }

  private static expand(node: PathNode, prefix: Vec2[] = []): Vec2[][] {
    // prefix 의 마지막 점이 node.points[0] 과 같으면 중복 제거
    const merged = [...prefix];
    for (const p of node.points) {
      const last = merged[merged.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) merged.push(p);
    }
    if (!node.branches || node.branches.length === 0) return [merged];
    let out: Vec2[][] = [];
    for (const b of node.branches) out = out.concat(PathManager.expand(b, merged));
    return out;
  }

  routes(): Vec2[][] { return this._routes; }

  static polylineLength(polyline: Vec2[]): number {
    let len = 0;
    for (let i = 1; i < polyline.length; i++) {
      len += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y);
    }
    return len;
  }

  static advance(polyline: Vec2[], distance: number): { pos: Vec2; done: boolean; progress: number } {
    const total = PathManager.polylineLength(polyline);
    if (distance >= total) {
      return { pos: { ...polyline[polyline.length - 1] }, done: true, progress: 1 };
    }
    let remaining = Math.max(0, distance);
    for (let i = 1; i < polyline.length; i++) {
      const a = polyline[i - 1];
      const b = polyline[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= seg) {
        const t = seg === 0 ? 0 : remaining / seg;
        return {
          pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
          done: false,
          progress: total === 0 ? 0 : distance / total,
        };
      }
      remaining -= seg;
    }
    return { pos: { ...polyline[polyline.length - 1] }, done: true, progress: 1 };
  }

  chooseRoute(rng: Rng): { routeIndex: number; polyline: Vec2[]; length: number } {
    const routeIndex = rng.int(this._routes.length);
    const polyline = this._routes[routeIndex];
    return { routeIndex, polyline, length: PathManager.polylineLength(polyline) };
  }
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- PathManager`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add PathManager (branch expansion, polyline advance)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: EconomyManager

**Files:**
- Create: `src/systems/EconomyManager.ts`
- Test: `tests/systems/EconomyManager.test.ts`

**Interfaces:**
- Consumes: `EventBus`, `GameEvents`
- Produces:
  - `class EconomyManager`
    - `constructor(startGold: number, bus: EventBus<GameEvents>)`
    - `get gold(): number`
    - `canAfford(cost: number): boolean`
    - `spend(cost: number): boolean` — 부족하면 false, 성공 시 차감 후 `gold:changed` emit
    - `earn(amount: number): void` — 증가 후 `gold:changed` emit
    - `sellRefund(totalInvested: number): number` — `floor(totalInvested * 0.6)` 반환 + earn
    - `static SELL_RATIO = 0.6`

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/EconomyManager.test.ts`:

```ts
import { EconomyManager } from '../../src/systems/EconomyManager';
import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents } from '../../src/core/types';

function setup(start: number) {
  const bus = createEventBus<GameEvents>();
  const events: number[] = [];
  bus.on('gold:changed', (p) => events.push(p.gold));
  return { eco: new EconomyManager(start, bus), events };
}

describe('EconomyManager', () => {
  it('spend fails when short and does not emit', () => {
    const { eco, events } = setup(50);
    expect(eco.spend(80)).toBe(false);
    expect(eco.gold).toBe(50);
    expect(events).toEqual([]);
  });

  it('spend succeeds, deducts, emits', () => {
    const { eco, events } = setup(100);
    expect(eco.spend(30)).toBe(true);
    expect(eco.gold).toBe(70);
    expect(events).toEqual([70]);
  });

  it('earn adds and emits', () => {
    const { eco, events } = setup(0);
    eco.earn(15);
    expect(eco.gold).toBe(15);
    expect(events).toEqual([15]);
  });

  it('sellRefund returns 60% floored and credits it', () => {
    const { eco } = setup(0);
    const refund = eco.sellRefund(101); // floor(60.6) = 60
    expect(refund).toBe(60);
    expect(eco.gold).toBe(60);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- EconomyManager`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
import type { EventBus } from '../core/eventBus';
import type { GameEvents } from '../core/types';

export class EconomyManager {
  static readonly SELL_RATIO = 0.6;
  private _gold: number;

  constructor(startGold: number, private readonly bus: EventBus<GameEvents>) {
    this._gold = startGold;
  }

  get gold(): number { return this._gold; }

  canAfford(cost: number): boolean { return this._gold >= cost; }

  spend(cost: number): boolean {
    if (this._gold < cost) return false;
    this._gold -= cost;
    this.bus.emit('gold:changed', { gold: this._gold });
    return true;
  }

  earn(amount: number): void {
    this._gold += amount;
    this.bus.emit('gold:changed', { gold: this._gold });
  }

  sellRefund(totalInvested: number): number {
    const refund = Math.floor(totalInvested * EconomyManager.SELL_RATIO);
    this.earn(refund);
    return refund;
  }
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- EconomyManager`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add EconomyManager (spend/earn/sell + gold events)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: 타워 / 적 데이터 정의

**Files:**
- Create: `src/data/towers.ts`, `src/data/enemies.ts`
- Modify: `src/core/types.ts` — `AttackKind` 와 `TowerLevelStats` 를 Step 0 대로 갱신 (ramp → chain). Task 2 가 만든 파일이며 이 필드를 쓰는 코드는 아직 없음(Task 15 에서 소비). `npm run build` 로 회귀 확인.
- Test: `tests/data/definitions.test.ts`

**Interfaces:**
- Consumes: `TowerDef`, `EnemyDef` from `core/types`
- Produces:
  - `towers.ts`: `TOWERS: Record<string, TowerDef>` (keys: `arrow`, `cannon`, `frost`, `bolt`), `TOWER_KEYS: string[]`, `getTower(key): TowerDef`
  - `enemies.ts`: `ENEMIES: Record<string, EnemyDef>` (keys: `normal`, `fast`, `tank`, `boss`), `getEnemy(key): EnemyDef`
  - `cumulativeCost(def: TowerDef, level: number): number` in `towers.ts` — Lv1 설치 + 이후 머지는 무료이므로 = `def.cost` (판매 계산용, 추후 확장 대비 함수로 분리)

- [ ] **Step 0: `src/core/types.ts` 의 `AttackKind` / `TowerLevelStats` 갱신**

기존 두 정의를 아래로 교체 (다른 타입은 그대로):

```ts
export type AttackKind = 'single' | 'splash' | 'slow' | 'chain';

export interface TowerLevelStats {
  damage: number;
  range: number;        // 픽셀
  fireRate: number;     // 초당 발사 횟수
  splashRadius?: number;
  slowMul?: number;     // 0.5 = 50% 감속
  slowDurationMs?: number;
  chainTargets?: number;  // 1차 대상 외에 추가로 튀는 적 수 (chain)
  chainFalloff?: number;  // 점프마다 곱해지는 데미지 배율 (0.65 = 매 점프 65%)
  chainRange?: number;    // 마지막 피격 적으로부터 다음 체인 대상 탐색 반경(px)
}
```

`npm run build` (tsc) 가 통과해야 함 — `rampStep`/`rampMax` 를 참조하는 코드는 아직 없음.

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/data/definitions.test.ts`:

```ts
import { TOWERS, TOWER_KEYS, getTower } from '../../src/data/towers';
import { ENEMIES, getEnemy } from '../../src/data/enemies';

describe('tower definitions', () => {
  it('every tower has exactly maxLevel level entries with increasing damage', () => {
    for (const key of TOWER_KEYS) {
      const t = TOWERS[key];
      expect(t.levels.length).toBe(t.maxLevel);
      expect(t.maxLevel).toBe(5);
      for (let i = 1; i < t.levels.length; i++) {
        expect(t.levels[i].damage).toBeGreaterThanOrEqual(t.levels[i - 1].damage);
        expect(t.levels[i].range).toBeGreaterThanOrEqual(t.levels[i - 1].range);
      }
    }
  });

  it('attack-kind specific fields are present', () => {
    expect(TOWERS.cannon.levels[0].splashRadius).toBeGreaterThan(0);
    expect(TOWERS.frost.levels[0].slowMul).toBeGreaterThan(0);
    expect(TOWERS.frost.levels[0].slowMul).toBeLessThan(1);
    expect(TOWERS.bolt.attack).toBe('chain');
    expect(TOWERS.bolt.levels[0].chainTargets).toBeGreaterThan(0);
    expect(TOWERS.bolt.levels[0].chainFalloff).toBeGreaterThan(0);
    expect(TOWERS.bolt.levels[0].chainFalloff).toBeLessThan(1);
    expect(TOWERS.bolt.levels[0].chainRange).toBeGreaterThan(0);
  });

  it('bolt chain gets more targets and gentler falloff as it levels', () => {
    const lv = TOWERS.bolt.levels;
    expect(lv[4].chainTargets!).toBeGreaterThanOrEqual(lv[0].chainTargets!);
    expect(lv[4].chainFalloff!).toBeGreaterThanOrEqual(lv[0].chainFalloff!);
  });

  it('getTower throws on unknown key', () => {
    expect(() => getTower('nope')).toThrow();
  });
});

describe('enemy definitions', () => {
  it('fast is faster than normal, tank has more hp', () => {
    expect(ENEMIES.fast.speed).toBeGreaterThan(ENEMIES.normal.speed);
    expect(ENEMIES.tank.hp).toBeGreaterThan(ENEMIES.normal.hp);
    expect(ENEMIES.boss.isBoss).toBe(true);
  });

  it('getEnemy throws on unknown key', () => {
    expect(() => getEnemy('nope')).toThrow();
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- definitions`
Expected: FAIL.

- [ ] **Step 3: `src/data/towers.ts` 구현**

```ts
import type { TowerDef } from '../core/types';

export const TOWERS: Record<string, TowerDef> = {
  arrow: {
    key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
    levels: [
      { damage: 8,  range: 150, fireRate: 2.0 },
      { damage: 13, range: 160, fireRate: 2.2 },
      { damage: 20, range: 170, fireRate: 2.4 },
      { damage: 30, range: 185, fireRate: 2.7 },
      { damage: 46, range: 200, fireRate: 3.0 },
    ],
  },
  cannon: {
    key: 'cannon', name: '대포', attack: 'splash', cost: 110, maxLevel: 5,
    levels: [
      { damage: 22, range: 130, fireRate: 0.7, splashRadius: 55 },
      { damage: 34, range: 135, fireRate: 0.75, splashRadius: 60 },
      { damage: 52, range: 142, fireRate: 0.8, splashRadius: 66 },
      { damage: 80, range: 150, fireRate: 0.85, splashRadius: 72 },
      { damage: 122, range: 160, fireRate: 0.9, splashRadius: 80 },
    ],
  },
  frost: {
    key: 'frost', name: '서리탑', attack: 'slow', cost: 80, maxLevel: 5,
    levels: [
      { damage: 3, range: 140, fireRate: 1.5, slowMul: 0.75, slowDurationMs: 1200 },
      { damage: 5, range: 148, fireRate: 1.6, slowMul: 0.70, slowDurationMs: 1300 },
      { damage: 8, range: 156, fireRate: 1.7, slowMul: 0.62, slowDurationMs: 1400 },
      { damage: 12, range: 165, fireRate: 1.8, slowMul: 0.54, slowDurationMs: 1600 },
      { damage: 18, range: 175, fireRate: 2.0, slowMul: 0.45, slowDurationMs: 1800 },
    ],
  },
  bolt: {
    // 체인 라이트닝: 1차 대상 명중 후 근처 적에게 순차 전이, 전이마다 데미지 ×chainFalloff.
    key: 'bolt', name: '번개탑', attack: 'chain', cost: 95, maxLevel: 5,
    levels: [
      { damage: 7,  range: 150, fireRate: 2.4, chainTargets: 2, chainFalloff: 0.55, chainRange: 90 },
      { damage: 11, range: 158, fireRate: 2.5, chainTargets: 2, chainFalloff: 0.60, chainRange: 95 },
      { damage: 17, range: 166, fireRate: 2.6, chainTargets: 3, chainFalloff: 0.65, chainRange: 100 },
      { damage: 26, range: 176, fireRate: 2.8, chainTargets: 3, chainFalloff: 0.70, chainRange: 110 },
      { damage: 40, range: 188, fireRate: 3.0, chainTargets: 4, chainFalloff: 0.75, chainRange: 120 },
    ],
  },
};

export const TOWER_KEYS = Object.keys(TOWERS);

export function getTower(key: string): TowerDef {
  const t = TOWERS[key];
  if (!t) throw new Error(`unknown tower: ${key}`);
  return t;
}

/** 판매 환급 기준액. 머지는 무료이므로 현재는 Lv1 설치비 고정. */
export function cumulativeCost(def: TowerDef, _level: number): number {
  return def.cost;
}
```

- [ ] **Step 4: `src/data/enemies.ts` 구현**

```ts
import type { EnemyDef } from '../core/types';

export const ENEMIES: Record<string, EnemyDef> = {
  normal: { key: 'normal', name: '일반', hp: 40,  speed: 70,  bounty: 6,  lifeDamage: 1 },
  fast:   { key: 'fast',   name: '쾌속', hp: 22,  speed: 120, bounty: 7,  lifeDamage: 1 },
  tank:   { key: 'tank',   name: '탱커', hp: 150, speed: 45,  bounty: 14, lifeDamage: 1 },
  boss:   { key: 'boss',   name: '보스', hp: 1200, speed: 40, bounty: 120, lifeDamage: 6, isBoss: true },
};

export function getEnemy(key: string): EnemyDef {
  const e = ENEMIES[key];
  if (!e) throw new Error(`unknown enemy: ${key}`);
  return e;
}
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npm test -- definitions`
Expected: PASS (5 tests).

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: add tower and enemy data definitions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: WaveManager (스폰 스케줄 + 웨이브 종료)

> POST-IMPL FIX (Task 12b): `startNextWave()` returns `false` while a wave is active (`if (this.waveActive) return false;` at top); added `get isWaveActive(): boolean`. HUD dims "다음 웨이브" during an active wave. Prevents skipping waves via button spam (which produced a false "CLEAR").

**Files:**
- Create: `src/systems/WaveManager.ts`
- Test: `tests/systems/WaveManager.test.ts`

**Interfaces:**
- Consumes: `Wave`, `WaveGroup` from `core/types`; `EventBus`, `GameEvents`
- Produces:
  - `interface SpawnRequest { enemyKey: string; }`
  - `class WaveManager`
    - `constructor(waves: Wave[], bus: EventBus<GameEvents>)`
    - `get waveIndex(): number` (0-based, 시작 전 -1)
    - `get totalWaves(): number`
    - `get isFinished(): boolean` — 마지막 웨이브까지 clear
    - `startNextWave(): boolean` — 다음 웨이브 시작, `wave:started` emit. 더 없으면 false.
    - `update(dtMs: number): SpawnRequest[]` — 이번 tick에 스폰할 적 목록 반환
    - `notifyEnemyRemoved(): void` — 적 1기 처리(죽음/도달) 알림. 카운트 기반 종료 판정에 사용
    - `notifyEnemySpawned(): void` — 스폰된 적 수 추적
    - `isWaveComplete(): boolean` — 이번 웨이브 전량 스폰됐고 살아있는 적 0
    - 웨이브 완료 시 `wave:cleared` emit + `clearBonus` 는 Game 씬이 EconomyManager에 반영 (WaveManager는 이벤트만)

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/WaveManager.test.ts`:

```ts
import { WaveManager } from '../../src/systems/WaveManager';
import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents, Wave } from '../../src/core/types';

const waves: Wave[] = [
  { clearBonus: 20, groups: [
    { enemy: 'normal', count: 3, intervalMs: 500, startDelayMs: 0 },
    { enemy: 'fast', count: 2, intervalMs: 300, startDelayMs: 1000 },
  ]},
  { clearBonus: 30, groups: [
    { enemy: 'tank', count: 1, intervalMs: 0, startDelayMs: 0 },
  ]},
];

function setup() {
  const bus = createEventBus<GameEvents>();
  const started: number[] = [];
  const cleared: number[] = [];
  bus.on('wave:started', (p) => started.push(p.index));
  bus.on('wave:cleared', (p) => cleared.push(p.index));
  return { wm: new WaveManager(waves, bus), started, cleared };
}

describe('WaveManager', () => {
  it('spawns first group immediately, second after its delay', () => {
    const { wm } = setup();
    wm.startNextWave();
    // t=0: normal #1
    expect(wm.update(0).map(s => s.enemyKey)).toEqual(['normal']);
    // t=500: normal #2
    expect(wm.update(500).map(s => s.enemyKey)).toEqual(['normal']);
    // t=1000: normal #3 + fast #1 (fast startDelay=1000)
    const at1000 = wm.update(500).map(s => s.enemyKey).sort();
    expect(at1000).toEqual(['fast', 'normal']);
    // t=1300: fast #2
    expect(wm.update(300).map(s => s.enemyKey)).toEqual(['fast']);
    // no more spawns
    expect(wm.update(5000)).toEqual([]);
  });

  it('isWaveComplete only when all spawned and all removed', () => {
    const { wm, cleared } = setup();
    wm.startNextWave();
    let spawned = 0;
    for (let i = 0; i < 20; i++) spawned += wm.update(300).length;
    wm.notifyEnemySpawned(); // 실제로는 Game이 매 스폰마다 호출; 여기선 총합으로 근사
    expect(spawned).toBe(5);
    // 5기 스폰 → 5기 제거
    for (let i = 0; i < 5; i++) { wm.notifyEnemySpawned(); }
    expect(wm.isWaveComplete()).toBe(false);
    for (let i = 0; i < 5; i++) wm.notifyEnemyRemoved();
    // 다시 계산: spawnedCount(5) === removedCount(5) && no pending
    expect(wm.isWaveComplete()).toBe(true);
  });

  it('startNextWave returns false past the last wave', () => {
    const { wm, started } = setup();
    expect(wm.startNextWave()).toBe(true);  // wave 0
    expect(wm.startNextWave()).toBe(true);  // wave 1
    expect(wm.startNextWave()).toBe(false); // none
    expect(started).toEqual([0, 1]);
  });
});
```

> 참고: 위 `isWaveComplete` 테스트는 카운트 기반 API를 직접 검증하기 어색하므로 Step 3 구현에서 API를 **spawnedCount / removedCount 를 WaveManager가 직접 관리**하도록 하고, 테스트는 다음처럼 단순화한다. Step 1 작성 시 아래 최종본을 쓸 것:

```ts
  it('isWaveComplete only when every scheduled enemy is spawned and removed', () => {
    const { wm } = setup();
    wm.startNextWave();
    let spawned = 0;
    for (let i = 0; i < 40; i++) {
      const reqs = wm.update(200);
      spawned += reqs.length;
      reqs.forEach(() => wm.notifyEnemySpawned());
    }
    expect(spawned).toBe(5);
    expect(wm.isWaveComplete()).toBe(false);
    for (let i = 0; i < 4; i++) wm.notifyEnemyRemoved();
    expect(wm.isWaveComplete()).toBe(false);
    wm.notifyEnemyRemoved();
    expect(wm.isWaveComplete()).toBe(true);
  });
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- WaveManager`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
import type { EventBus } from '../core/eventBus';
import type { GameEvents, Wave } from '../core/types';

export interface SpawnRequest { enemyKey: string; }

interface GroupState {
  enemyKey: string;
  remaining: number;
  intervalMs: number;
  nextAtMs: number; // 웨이브 경과시간 기준 다음 스폰 시각
}

export class WaveManager {
  private _waveIndex = -1;
  private elapsedMs = 0;
  private groups: GroupState[] = [];
  private scheduledThisWave = 0;
  private spawnedCount = 0;
  private removedCount = 0;
  private waveActive = false;

  constructor(private readonly waves: Wave[], private readonly bus: EventBus<GameEvents>) {}

  get waveIndex(): number { return this._waveIndex; }
  get totalWaves(): number { return this.waves.length; }
  get isFinished(): boolean {
    return this._waveIndex >= this.waves.length - 1 && this.isWaveComplete();
  }

  startNextWave(): boolean {
    if (this._waveIndex >= this.waves.length - 1) return false;
    this._waveIndex++;
    this.elapsedMs = 0;
    this.spawnedCount = 0;
    this.removedCount = 0;
    this.waveActive = true;
    const wave = this.waves[this._waveIndex];
    this.groups = wave.groups.map((g) => ({
      enemyKey: g.enemy,
      remaining: g.count,
      intervalMs: g.intervalMs,
      nextAtMs: g.startDelayMs,
    }));
    this.scheduledThisWave = wave.groups.reduce((s, g) => s + g.count, 0);
    this.bus.emit('wave:started', { index: this._waveIndex, total: this.waves.length });
    return true;
  }

  update(dtMs: number): SpawnRequest[] {
    if (!this.waveActive) return [];
    this.elapsedMs += dtMs;
    const out: SpawnRequest[] = [];
    for (const g of this.groups) {
      while (g.remaining > 0 && this.elapsedMs >= g.nextAtMs) {
        out.push({ enemyKey: g.enemyKey });
        g.remaining--;
        g.nextAtMs += g.intervalMs > 0 ? g.intervalMs : 1; // 0 간격이면 다음 tick 방지용 +1
      }
    }
    return out;
  }

  notifyEnemySpawned(): void { this.spawnedCount++; }
  notifyEnemyRemoved(): void { this.removedCount++; this.checkComplete(); }

  isWaveComplete(): boolean {
    return this.waveActive === false
      || (this.allScheduledSpawned() && this.removedCount >= this.scheduledThisWave);
  }

  private allScheduledSpawned(): boolean {
    return this.groups.every((g) => g.remaining === 0);
  }

  private checkComplete(): void {
    if (this.waveActive && this.allScheduledSpawned() && this.removedCount >= this.scheduledThisWave) {
      this.waveActive = false;
      this.bus.emit('wave:cleared', { index: this._waveIndex });
    }
  }

  currentClearBonus(): number {
    return this.waves[this._waveIndex]?.clearBonus ?? 0;
  }
}
```

> `isWaveComplete()` 가 `waveActive === false` 도 true로 치므로, 테스트에서 첫 호출 시 `waveActive`는 true여야 한다. `startNextWave()` 직후 상태 확인. 위 단순화 테스트대로면 통과.

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- WaveManager`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add WaveManager (spawn scheduling, wave completion)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: TargetingSystem

**Files:**
- Create: `src/systems/TargetingSystem.ts`
- Test: `tests/systems/TargetingSystem.test.ts`

**Interfaces:**
- Consumes: `Vec2`
- Produces:
  - `interface Targetable { id: number; pos: Vec2; progress: number; alive: boolean; }`
  - `function pickTarget(origin: Vec2, range: number, enemies: Targetable[]): Targetable | null`
    — 사거리(픽셀) 내 `alive` 적 중 `progress` 최대. 동률이면 `id` 작은 쪽.
  - `function enemiesInRadius(center: Vec2, radius: number, enemies: Targetable[]): Targetable[]` — 스플래시용

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/TargetingSystem.test.ts`:

```ts
import { pickTarget, enemiesInRadius } from '../../src/systems/TargetingSystem';
import type { Targetable } from '../../src/systems/TargetingSystem';

const mk = (id: number, x: number, y: number, progress: number, alive = true): Targetable =>
  ({ id, pos: { x, y }, progress, alive });

describe('pickTarget', () => {
  it('returns null when nobody is in range', () => {
    expect(pickTarget({ x: 0, y: 0 }, 50, [mk(1, 100, 0, 0.5)])).toBeNull();
  });

  it('picks the furthest-progressed enemy in range', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [
      mk(1, 10, 0, 0.2), mk(2, 20, 0, 0.9), mk(3, 30, 0, 0.5),
    ]);
    expect(t?.id).toBe(2);
  });

  it('ignores dead enemies', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [mk(1, 10, 0, 0.9, false), mk(2, 20, 0, 0.1)]);
    expect(t?.id).toBe(2);
  });

  it('breaks ties by lower id', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [mk(5, 10, 0, 0.5), mk(2, 12, 0, 0.5)]);
    expect(t?.id).toBe(2);
  });
});

describe('enemiesInRadius', () => {
  it('returns all alive enemies within radius', () => {
    const res = enemiesInRadius({ x: 0, y: 0 }, 15, [
      mk(1, 10, 0, 0), mk(2, 20, 0, 0), mk(3, 5, 5, 0, false),
    ]);
    expect(res.map(e => e.id)).toEqual([1]);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- TargetingSystem`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
import type { Vec2 } from '../core/types';

export interface Targetable {
  id: number;
  pos: Vec2;
  progress: number;
  alive: boolean;
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function pickTarget(origin: Vec2, range: number, enemies: Targetable[]): Targetable | null {
  const r2 = range * range;
  let best: Targetable | null = null;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (dist2(origin, e.pos) > r2) continue;
    if (
      best === null ||
      e.progress > best.progress ||
      (e.progress === best.progress && e.id < best.id)
    ) {
      best = e;
    }
  }
  return best;
}

export function enemiesInRadius(center: Vec2, radius: number, enemies: Targetable[]): Targetable[] {
  const r2 = radius * radius;
  return enemies.filter((e) => e.alive && dist2(center, e.pos) <= r2);
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- TargetingSystem`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add TargetingSystem (range filter, furthest-progress priority)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: MergeController

**Files:**
- Create: `src/systems/MergeController.ts`
- Test: `tests/systems/MergeController.test.ts`

**Interfaces:**
- Consumes: `TowerDef` from `core/types`
- Produces:
  - `interface MergeCandidate { id: number; key: string; level: number; }`
  - `function canMerge(a: MergeCandidate, b: MergeCandidate, maxLevel: number): boolean`
    — 서로 다른 id, 같은 key, 같은 level, `level < maxLevel`
  - `function mergeResultLevel(level: number): number` — `level + 1`

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/systems/MergeController.test.ts`:

```ts
import { canMerge, mergeResultLevel } from '../../src/systems/MergeController';
import type { MergeCandidate } from '../../src/systems/MergeController';

const c = (id: number, key: string, level: number): MergeCandidate => ({ id, key, level });

describe('canMerge', () => {
  it('true for same key + same level below max', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'arrow', 2), 5)).toBe(true);
  });
  it('false for different key', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'cannon', 2), 5)).toBe(false);
  });
  it('false for different level', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'arrow', 3), 5)).toBe(false);
  });
  it('false at max level', () => {
    expect(canMerge(c(1, 'arrow', 5), c(2, 'arrow', 5), 5)).toBe(false);
  });
  it('false for same tower (same id)', () => {
    expect(canMerge(c(1, 'arrow', 2), c(1, 'arrow', 2), 5)).toBe(false);
  });
});

describe('mergeResultLevel', () => {
  it('adds one level', () => {
    expect(mergeResultLevel(2)).toBe(3);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- MergeController`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
export interface MergeCandidate {
  id: number;
  key: string;
  level: number;
}

export function canMerge(a: MergeCandidate, b: MergeCandidate, maxLevel: number): boolean {
  return a.id !== b.id
    && a.key === b.key
    && a.level === b.level
    && a.level < maxLevel;
}

export function mergeResultLevel(level: number): number {
  return level + 1;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- MergeController`
Expected: PASS (6 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add MergeController (merge eligibility rules)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: 스테이지 데이터 (1-1 ~ 1-5) + 로더

**Files:**
- Create: `src/data/stages/stage-1-1.ts` ... `stage-1-5.ts`, `src/data/stages/index.ts`
- Create: `src/data/stages/helpers.ts` (그리드 문자열 → `TileType[][]`)
- Test: `tests/data/stages.test.ts`

**Interfaces:**
- Consumes: `StageDef`, `TileType`, `PathNode` from `core/types`; `GridManager`, `PathManager`, `ENEMIES`, `getEnemy`
- Produces:
  - `helpers.ts`: `parseGrid(rows: string[]): TileType[][]` — `.`=BUILDABLE, `#`=PATH, `X`=BLOCKED
  - `index.ts`: `STAGES: StageDef[]` (순서대로 1-1..1-5), `STAGE_IDS: string[]`, `getStage(id): StageDef`, `nextStageId(id): string | null`

- [ ] **Step 1: 테스트 작성 (실패)**

`tests/data/stages.test.ts`:

```ts
import { STAGES, getStage, nextStageId, STAGE_IDS } from '../../src/data/stages';
import { parseGrid } from '../../src/data/stages/helpers';
import { PathManager } from '../../src/systems/PathManager';
import { GridManager } from '../../src/systems/GridManager';
import { getEnemy } from '../../src/data/enemies';
import { GRID_COLS, GRID_ROWS } from '../../src/core/constants';

describe('parseGrid', () => {
  it('maps chars to tile types', () => {
    expect(parseGrid(['.#X'])).toEqual([['BUILDABLE', 'PATH', 'BLOCKED']]);
  });
});

describe('stage definitions', () => {
  it('there are 5 stages 1-1..1-5 in order', () => {
    expect(STAGE_IDS).toEqual(['1-1', '1-2', '1-3', '1-4', '1-5']);
  });

  it('every stage grid is GRID_COLS x GRID_ROWS', () => {
    for (const s of STAGES) {
      expect(s.grid.length).toBe(GRID_ROWS);
      for (const row of s.grid) expect(row.length).toBe(GRID_COLS);
    }
  });

  it('every stage path expands to at least one route ending near a goal', () => {
    for (const s of STAGES) {
      const pm = new PathManager(s.path);
      const routes = pm.routes();
      expect(routes.length).toBe(s.goals.length);
      routes.forEach((r, i) => {
        const end = r[r.length - 1];
        expect(Math.hypot(end.x - s.goals[i].x, end.y - s.goals[i].y)).toBeLessThan(1);
      });
    }
  });

  it('every wave references a known enemy', () => {
    for (const s of STAGES) {
      for (const w of s.waves) {
        for (const g of w.groups) expect(() => getEnemy(g.enemy)).not.toThrow();
      }
    }
  });

  it('starThresholds are ascending [1star, 2star, 3star] within (0,1]', () => {
    // starsFor(Task 18) reads [0]=1별 하한, [1]=2별 하한, [2]=3별 하한 → 오름차순.
    for (const s of STAGES) {
      const [a, b, c] = s.starThresholds;
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(b);
      expect(b).toBeLessThanOrEqual(c);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('1-1 has a single route, later stages branch', () => {
    expect(new PathManager(getStage('1-1').path).routes().length).toBe(1);
    expect(new PathManager(getStage('1-2').path).routes().length).toBe(2);
  });

  it('nextStageId chains and ends null', () => {
    expect(nextStageId('1-1')).toBe('1-2');
    expect(nextStageId('1-5')).toBeNull();
  });

  it('spawn tile and goal tiles are on PATH', () => {
    for (const s of STAGES) {
      const g = new GridManager(s.grid);
      expect(g.tileAt(g.pixelToTile(s.spawn))).toBe('PATH');
      for (const goal of s.goals) expect(g.tileAt(g.pixelToTile(goal))).toBe('PATH');
    }
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- stages`
Expected: FAIL.

- [ ] **Step 3: `helpers.ts` 작성**

```ts
import type { TileType } from '../../core/types';

const MAP: Record<string, TileType> = { '.': 'BUILDABLE', '#': 'PATH', 'X': 'BLOCKED' };

export function parseGrid(rows: string[]): TileType[][] {
  return rows.map((r) => [...r].map((ch) => {
    const t = MAP[ch];
    if (!t) throw new Error(`bad grid char: '${ch}'`);
    return t;
  }));
}
```

- [ ] **Step 4: `stage-1-1.ts` 작성 (튜토리얼, 단일 경로)**

그리드는 11열 × 20행. `#` 로 세로 직선 경로(가운데 col 5), 스폰 = 맨 위 중앙, goal = 맨 아래 중앙. TILE=64 이므로 중앙 col5 픽셀 x = 5*64+32 = 352.

```ts
import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
];

const X = 5 * TILE + TILE / 2; // 352

export const stage11: StageDef = {
  id: '1-1',
  grid: parseGrid(rows),
  spawn: { x: X, y: 0 },
  goals: [{ x: X, y: 20 * TILE }],
  path: { points: [{ x: X, y: 0 }, { x: X, y: 20 * TILE }] },
  startGold: 200,
  startLives: 20,
  starThresholds: [0.3, 0.6, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 6, intervalMs: 700, startDelayMs: 0 }] },
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 8, intervalMs: 600, startDelayMs: 0 }] },
    { clearBonus: 30, groups: [
      { enemy: 'normal', count: 6, intervalMs: 500, startDelayMs: 0 },
      { enemy: 'fast', count: 4, intervalMs: 400, startDelayMs: 2500 },
    ]},
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 12, intervalMs: 350, startDelayMs: 0 }] },
    { clearBonus: 50, groups: [
      { enemy: 'normal', count: 10, intervalMs: 400, startDelayMs: 0 },
      { enemy: 'tank', count: 2, intervalMs: 1500, startDelayMs: 1000 },
    ]},
  ],
};
```

- [ ] **Step 5: `stage-1-2.ts` ~ `stage-1-5.ts` 작성 (분기 경로)**

각 스테이지는 세로로 내려오다 중간 행에서 좌/우로 갈라져 두 goal로. 아래는 1-2 예시. 1-3~1-5는 같은 맵 골격에 웨이브만 강화(웨이브 6~8개, 적 밀도↑, 1-4·1-5는 boss 포함, startGold 대비 난이도↑).

`stage-1-2.ts`:

```ts
import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// col5 세로로 내려오다 row10에서 좌(col1)·우(col9)로 갈라져 바닥까지
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.#######.#.', // row10: 분기 가로줄 (col1..col9 중 경로부 표시는 아래 path가 결정)
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
];
```

> 그리드 문자열은 시각적 참고용이고, 실제 적 이동은 `path` 트리가 정의한다. 위 문자열의 `#` 위치가 `spawn`/`goals` 픽셀 좌표를 `pixelToTile` 했을 때 `PATH` 가 되도록만 맞추면 된다(테스트 `spawn tile ... on PATH`). 갈라지는 가로 구간도 `#` 로 칠할 것.

```ts
const cx = 5 * TILE + TILE / 2;      // 352
const lx = 1 * TILE + TILE / 2;      // 96
const rx = 9 * TILE + TILE / 2;      // 608
const midY = 10 * TILE + TILE / 2;   // 672
const botY = 20 * TILE;              // 1280

export const stage12: StageDef = {
  id: '1-2',
  grid: parseGrid(rows),
  spawn: { x: cx, y: 0 },
  goals: [{ x: lx, y: botY }, { x: rx, y: botY }],
  path: {
    points: [{ x: cx, y: 0 }, { x: cx, y: midY }],
    branches: [
      { points: [{ x: cx, y: midY }, { x: lx, y: midY }, { x: lx, y: botY }] },
      { points: [{ x: cx, y: midY }, { x: rx, y: midY }, { x: rx, y: botY }] },
    ],
  },
  startGold: 230,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 8, intervalMs: 600, startDelayMs: 0 }] },
    { clearBonus: 25, groups: [
      { enemy: 'normal', count: 6, intervalMs: 450, startDelayMs: 0 },
      { enemy: 'fast', count: 6, intervalMs: 350, startDelayMs: 1500 },
    ]},
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 16, intervalMs: 250, startDelayMs: 0 }] },
    { clearBonus: 30, groups: [
      { enemy: 'normal', count: 10, intervalMs: 350, startDelayMs: 0 },
      { enemy: 'tank', count: 3, intervalMs: 1200, startDelayMs: 800 },
    ]},
    { clearBonus: 35, groups: [
      { enemy: 'fast', count: 20, intervalMs: 200, startDelayMs: 0 },
      { enemy: 'tank', count: 2, intervalMs: 1500, startDelayMs: 3000 },
    ]},
    { clearBonus: 70, groups: [
      { enemy: 'normal', count: 14, intervalMs: 300, startDelayMs: 0 },
      { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 1000 },
    ]},
  ],
};
```

1-3 / 1-4 / 1-5: 같은 `rows`, `path`, `spawn`, `goals` 구조 재사용(파일 상단에서 import 공유하지 말고 각 파일에 복붙 — 실행자가 순서 무관하게 읽음). 차이:
- `1-3`: startGold 250, 웨이브 7개, fast/tank 혼합 강화.
- `1-4`: startGold 280, 웨이브 8개, 웨이브5에 `boss` 1기, 마지막 웨이브 tank 6기.
- `1-5`: startGold 300, 웨이브 8개, 웨이브5·8에 `boss`, 전반적으로 count 1.3배·interval 0.8배.

각 파일 export 이름: `stage13`, `stage14`, `stage15`.

- [ ] **Step 6: `index.ts` 작성**

```ts
import type { StageDef } from '../../core/types';
import { stage11 } from './stage-1-1';
import { stage12 } from './stage-1-2';
import { stage13 } from './stage-1-3';
import { stage14 } from './stage-1-4';
import { stage15 } from './stage-1-5';

export const STAGES: StageDef[] = [stage11, stage12, stage13, stage14, stage15];
export const STAGE_IDS = STAGES.map((s) => s.id);

export function getStage(id: string): StageDef {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stage: ${id}`);
  return s;
}

export function nextStageId(id: string): string | null {
  const i = STAGE_IDS.indexOf(id);
  if (i < 0 || i >= STAGE_IDS.length - 1) return null;
  return STAGE_IDS[i + 1];
}
```

- [ ] **Step 7: 실행 → 통과 확인**

Run: `npm test -- stages`
Expected: PASS. 실패 시 그리드 `#` 위치와 `spawn`/`goals` 픽셀→타일 결과를 맞춘다.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: add stages 1-1..1-5 with branching paths and wave scripts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: 텍스처 생성 + Enemy 엔티티 + Game 씬 (적이 경로를 따라 이동, 도달 시 라이프 감소)

**Files:**
- Create: `src/ui/textures.ts`, `src/entities/Enemy.ts`, `src/scenes/Game.ts`, `src/scenes/HUD.ts`
- Modify: `src/scenes/Preload.ts` (텍스처 생성 호출), `src/main.ts` (Game/HUD 씬 등록), `src/scenes/MainMenu.ts` (임시로 `game` 시작 + `{ stageId: '1-1' }`)
- Test: `tests/architecture.test.ts` 는 이미 존재; 별도 유닛 테스트 없음(씬). 수동 검증.

**Interfaces:**
- Consumes: `GridManager`, `PathManager`, `WaveManager`, `EconomyManager`, `getStage`, `getEnemy`, `createEventBus`, `COLORS`, `TILE`
- Produces:
  - `textures.ts`: `buildTextures(scene: Phaser.Scene): void` — 키 생성: `tower_arrow`, `tower_cannon`, `tower_frost`, `tower_bolt`, `enemy_normal`, `enemy_fast`, `enemy_tank`, `enemy_boss`, `projectile`, `tile`
  - `Enemy.ts`: `class Enemy` — `constructor(scene, def: EnemyDef, polyline: Vec2[])`, `update(dtMs, speedMul): void`, `takeDamage(n): void`, `applySlow(mul, durationMs): void`, getters `pos`, `progress`, `alive`, `reachedGoal`, `id`, `hp`, `def`; `sprite: Phaser.GameObjects.Image`
  - `Game.ts`: scene key `game`. `init(data: { stageId: string })`. 소유: `bus`, `grid`, `path`, `waves`, `eco`, `enemies: Enemy[]`, `lives`, `speedMul`. `update(_, dtMsRaw)` 에서 `dtMs = dtMsRaw * speedMul` 로 시스템 갱신.
  - `HUD.ts`: scene key `hud`. `init(data: { bus, getState })`. 골드/라이프/웨이브 텍스트 + "다음 웨이브" 버튼 + 배속 버튼 자리(Task 16에서 채움).

- [ ] **Step 1: `src/ui/textures.ts` 작성**

```ts
import Phaser from 'phaser';
import { COLORS, TILE } from '../core/constants';

export function buildTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  const circle = (key: string, color: number, r: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
  };
  const triangle = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    g.fillTriangle(s / 2, 4, s - 4, s - 4, 4, s - 4);
    g.generateTexture(key, s, s);
  };
  const diamond = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(s / 2, 2), new Phaser.Math.Vector2(s - 2, s / 2),
      new Phaser.Math.Vector2(s / 2, s - 2), new Phaser.Math.Vector2(2, s / 2),
    ], true);
    g.generateTexture(key, s, s);
  };
  const star = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1);
    const cx = s / 2, cy = s / 2, spikes = 5, outer = s / 2 - 2, inner = outer * 0.45;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
    g.fillPoints(pts, true);
    g.generateTexture(key, s, s);
  };
  const square = (key: string, color: number, s: number) => {
    g.clear(); g.fillStyle(color, 1); g.fillRect(0, 0, s, s);
    g.generateTexture(key, s, s);
  };

  triangle('tower_arrow', COLORS.arrow, 44);
  circle('tower_cannon', COLORS.cannon, 22);
  diamond('tower_frost', COLORS.frost, 44);
  star('tower_bolt', COLORS.bolt, 46);

  circle('enemy_normal', COLORS.enemyNormal, 14);
  circle('enemy_fast', COLORS.enemyFast, 11);
  circle('enemy_tank', COLORS.enemyTank, 20);
  square('enemy_boss', COLORS.enemyBoss, 40);

  circle('projectile', COLORS.text, 5);
  square('tile', 0xffffff, TILE); // tint 로 색 입힘

  g.destroy();
}
```

- [ ] **Step 2: `Preload.ts` 수정**

```ts
import Phaser from 'phaser';
import { buildTextures } from '../ui/textures';

export class Preload extends Phaser.Scene {
  constructor() { super('preload'); }
  create() {
    buildTextures(this);
    this.scene.start('mainmenu');
  }
}
```

- [ ] **Step 3: `src/entities/Enemy.ts` 작성**

```ts
import Phaser from 'phaser';
import type { EnemyDef, Vec2 } from '../core/types';
import { PathManager } from '../systems/PathManager';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly sprite: Phaser.GameObjects.Image;
  private traveled = 0;
  private _hp: number;
  private slowMul = 1;
  private slowLeftMs = 0;
  private _done = false;

  constructor(
    scene: Phaser.Scene,
    readonly def: EnemyDef,
    private readonly polyline: Vec2[],
  ) {
    this._hp = def.hp;
    const start = polyline[0];
    this.sprite = scene.add.image(start.x, start.y, `enemy_${def.key}`);
  }

  get pos(): Vec2 { return { x: this.sprite.x, y: this.sprite.y }; }
  get hp(): number { return this._hp; }
  get alive(): boolean { return this._hp > 0 && !this._done; }
  get reachedGoal(): boolean { return this._done; }
  get progress(): number {
    return PathManager.advance(this.polyline, this.traveled).progress;
  }

  takeDamage(n: number): void {
    if (!this.alive) return;
    this._hp -= n;
    if (this._hp <= 0) this.sprite.setVisible(false);
  }

  applySlow(mul: number, durationMs: number): void {
    // 더 강한(작은) 감속 우선, 지속시간 갱신
    this.slowMul = Math.min(this.slowMul === 1 ? mul : this.slowMul, mul);
    this.slowLeftMs = Math.max(this.slowLeftMs, durationMs);
  }

  update(dtMs: number, speedMul: number): void {
    if (!this.alive) return;
    if (this.slowLeftMs > 0) {
      this.slowLeftMs -= dtMs;
      if (this.slowLeftMs <= 0) this.slowMul = 1;
    }
    const effSpeed = this.def.speed * this.slowMul;
    this.traveled += (effSpeed * dtMs / 1000) * speedMul;
    const a = PathManager.advance(this.polyline, this.traveled);
    this.sprite.setPosition(a.pos.x, a.pos.y);
    if (a.done) { this._done = true; this.sprite.setVisible(false); }
  }

  destroy(): void { this.sprite.destroy(); }
}
```

- [ ] **Step 4: `src/scenes/HUD.ts` 작성**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH } from '../core/constants';
import type { EventBus } from '../core/eventBus';
import type { GameEvents } from '../core/types';

export interface HudInit {
  bus: EventBus<GameEvents>;
  gold: number;
  lives: number;
  totalWaves: number;
  onNextWave: () => void;
}

export class HUD extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private lifeText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;

  constructor() { super('hud'); }

  create(data: HudInit) {
    const style = { fontFamily: 'monospace', fontSize: '28px', color: '#f2f2f7' };
    this.goldText = this.add.text(16, 12, '', style);
    this.lifeText = this.add.text(16, 46, '', style);
    this.waveText = this.add.text(GAME_WIDTH - 16, 12, '', style).setOrigin(1, 0);

    const btn = this.add.text(GAME_WIDTH - 16, 46, '▶ 다음 웨이브', {
      ...style, color: '#ffcc44',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => data.onNextWave());

    const render = () => {
      this.goldText.setText(`골드 ${data.gold}`);
      this.lifeText.setText(`라이프 ${data.lives}`);
    };
    data.bus.on('gold:changed', (p) => { data.gold = p.gold; render(); });
    data.bus.on('life:changed', (p) => { data.lives = p.lives; render(); });
    data.bus.on('wave:started', (p) => this.waveText.setText(`웨이브 ${p.index + 1}/${p.total}`));
    render();
    this.waveText.setText(`웨이브 -/${data.totalWaves}`);
  }
}
```

- [ ] **Step 5: `src/scenes/Game.ts` 작성 (이번 태스크 범위: 맵 + 적 이동 + 라이프)**

```ts
import Phaser from 'phaser';
import { COLORS, TILE, GRID_COLS, GRID_ROWS } from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, StageDef } from '../core/types';
import { getStage } from '../data/stages';
import { getEnemy } from '../data/enemies';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { Enemy } from '../entities/Enemy';
import type { HudInit } from './HUD';

export class Game extends Phaser.Scene {
  private stage!: StageDef;
  private bus!: EventBus<GameEvents>;
  private grid!: GridManager;
  private path!: PathManager;
  private waves!: WaveManager;
  private eco!: EconomyManager;
  private rng = new Rng(Date.now() & 0xffffffff);
  private enemies: Enemy[] = [];
  private lives = 0;
  private speedMul = 1;
  private running = false;

  constructor() { super('game'); }

  init(data: { stageId: string }) {
    this.stage = getStage(data.stageId ?? '1-1');
  }

  create() {
    this.bus = createEventBus<GameEvents>();
    this.grid = new GridManager(this.stage.grid);
    this.path = new PathManager(this.stage.path);
    this.waves = new WaveManager(this.stage.waves, this.bus);
    this.eco = new EconomyManager(this.stage.startGold, this.bus);
    this.lives = this.stage.startLives;
    this.enemies = [];
    this.speedMul = 1;
    this.running = true;

    this.drawMap();

    this.bus.on('enemy:reachedGoal', (p) => {
      this.lives = Math.max(0, this.lives - p.lifeDamage);
      this.bus.emit('life:changed', { lives: this.lives });
      if (this.lives <= 0) this.endStage(false);
    });
    this.bus.on('wave:cleared', () => {
      this.eco.earn(this.waves.currentClearBonus());
      if (this.waves.isFinished) this.endStage(true);
    });

    const hudInit: HudInit = {
      bus: this.bus,
      gold: this.eco.gold,
      lives: this.lives,
      totalWaves: this.waves.totalWaves,
      onNextWave: () => this.waves.startNextWave(),
    };
    this.scene.launch('hud', hudInit);
  }

  private drawMap() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this.stage.grid[r][c];
        if (t === 'BLOCKED') continue;
        const img = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile');
        img.setDisplaySize(TILE - 2, TILE - 2);
        img.setTint(t === 'PATH' ? COLORS.path : COLORS.buildable);
      }
    }
  }

  private spawnEnemy(enemyKey: string) {
    const def = getEnemy(enemyKey);
    const route = this.path.chooseRoute(this.rng);
    const enemy = new Enemy(this, def, route.polyline);
    this.enemies.push(enemy);
    this.waves.notifyEnemySpawned();
  }

  private endStage(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.scene.stop('hud');
    // Result 씬은 Task 15에서. 임시:
    this.add.text(360, 640, won ? 'CLEAR' : 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '48px', color: '#f2f2f7',
    }).setOrigin(0.5).setDepth(1000);
  }

  update(_time: number, dtMsRaw: number) {
    if (!this.running) return;
    const dtMs = dtMsRaw * this.speedMul;

    for (const req of this.waves.update(dtMsRaw)) this.spawnEnemy(req.enemyKey);

    for (const e of this.enemies) {
      e.update(dtMsRaw, this.speedMul);
      if (e.reachedGoal) {
        this.bus.emit('enemy:reachedGoal', { lifeDamage: e.def.lifeDamage });
      }
    }
    // 처리된 적 정리
    const removed = this.enemies.filter((e) => !e.alive);
    for (const e of removed) {
      if (e.hp <= 0) this.bus.emit('enemy:killed', { bounty: e.def.bounty });
      this.waves.notifyEnemyRemoved();
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    void dtMs; // 타워 발사에서 사용 (Task 14)
  }
}
```

> 주의: `WaveManager.update` 는 배속 미적용 `dtMsRaw` 로 호출하고 있는데, 배속 시 스폰도 빨라지려면 `dtMs` 를 넘겨야 한다. **`this.waves.update(dtMs)` 로 수정**하고, Enemy 이동도 `e.update(dtMsRaw, this.speedMul)` 에서 speedMul을 내부 적용하므로 일관됨. Step 작성 시 `this.waves.update(dtMs)` 로 쓸 것. (아래 Step 6 수동 테스트에서 배속은 Task 16 전까지 1 고정이라 무관.)

- [ ] **Step 6: `main.ts` 와 `MainMenu.ts` 수정**

`main.ts` 의 `scene` 배열: `[Boot, Preload, MainMenu, Game, HUD]` (import 추가).
`MainMenu.ts` 의 시작 핸들러: `this.scene.start('game', { stageId: '1-1' })` (임시).

- [ ] **Step 7: 수동 검증**

Run: `npm run dev`
1. 시작 클릭 → 세로 격자 맵, 가운데 세로줄이 어두운 "길" 색.
2. HUD에 "골드 200", "라이프 20", "웨이브 -/5".
3. "▶ 다음 웨이브" 클릭 → 위에서 분홍 원(일반 적)들이 700ms 간격으로 내려와 바닥에 도달, 라이프가 6씩... **아니라 1씩** 감소(normal lifeDamage=1). 라이프 0 되면 "GAME OVER".
4. 콘솔 에러 없음.

Run: `npm test` → 전부 PASS (아키텍처 가드 포함, 씬은 phaser import하므로 `src/scenes` 는 검사 대상 아님 확인).

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: render stage map, spawn enemies along path, lose life on goal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: StageSelect 씬

**Files:**
- Create: `src/scenes/StageSelect.ts`
- Modify: `src/main.ts` (등록), `src/scenes/MainMenu.ts` (`stageselect` 로 복귀)
- Test: 수동

**Interfaces:**
- Consumes: `STAGES`, `loadSave`, `isUnlocked`
- Produces: scene key `stageselect`. 각 스테이지 노드 클릭 → `this.scene.start('game', { stageId })`. 잠긴 스테이지는 비활성 + 자물쇠 표시. 별점 표시(★☆).

- [ ] **Step 1: `StageSelect.ts` 작성**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { STAGES } from '../data/stages';
import { loadSave, isUnlocked } from '../core/save';

export class StageSelect extends Phaser.Scene {
  constructor() { super('stageselect'); }

  create() {
    const save = loadSave();
    this.add.text(GAME_WIDTH / 2, 90, '스테이지 선택', {
      fontFamily: 'monospace', fontSize: '44px', color: '#f2f2f7',
    }).setOrigin(0.5);

    STAGES.forEach((stage, i) => {
      const y = 220 + i * 150;
      const unlocked = isUnlocked(save, stage.id);
      const stars = save.stages[stage.id]?.stars ?? 0;

      const box = this.add.rectangle(GAME_WIDTH / 2, y, 460, 110, unlocked ? 0x1b1d33 : 0x14141f)
        .setStrokeStyle(2, unlocked ? 0x66ccff : 0x333344);

      this.add.text(GAME_WIDTH / 2, y - 16, unlocked ? stage.id : `${stage.id} 🔒`, {
        fontFamily: 'monospace', fontSize: '34px', color: unlocked ? '#f2f2f7' : '#666677',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, y + 22, '★★★☆☆☆'.slice(3 - stars, 6 - stars), {
        fontFamily: 'monospace', fontSize: '26px', color: '#ffcc44',
      }).setOrigin(0.5);

      if (unlocked) {
        box.setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.start('game', { stageId: stage.id }));
      }
    });

    const back = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '← 메뉴', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('mainmenu'));
  }
}
```

> `'★★★☆☆☆'.slice(3 - stars, 6 - stars)` 는 stars=0 → `☆☆☆`, stars=3 → `★★★`. 확인.

- [ ] **Step 2: 등록 + 메뉴 복귀**

`main.ts` scene 배열에 `StageSelect` 추가: `[Boot, Preload, MainMenu, StageSelect, Game, HUD]`.
`MainMenu.ts` 시작 핸들러를 `this.scene.start('stageselect')` 로.

- [ ] **Step 3: 수동 검증**

Run: `npm run dev`
- 메뉴 → 시작 → 스테이지 목록. 1-1만 활성, 1-2~1-5는 자물쇠.
- 1-1 클릭 → 게임 시작. "← 메뉴" 동작.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: add stage select screen with lock/star state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 14: Tower 설치 (BuildMenu) + 골드 소모

**Files:**
- Create: `src/entities/Tower.ts`, `src/ui/BuildMenu.ts`
- Modify: `src/scenes/Game.ts` (타일 입력, 타워 배열, BuildMenu 연동)
- Test: 수동 (로직은 GridManager/Economy 에서 이미 커버)

**Interfaces:**
- Consumes: `getTower`, `TOWER_KEYS`, `GridManager`, `EconomyManager`, `TILE`, `COLORS`
- Produces:
  - `Tower.ts`: `class Tower`
    - `constructor(scene, key: string, tile: TileCoord, pos: Vec2)`
    - fields: `id`(고유), `key`, `level`(1..5), `tile`, `sprite: Phaser.GameObjects.Image`, `rangeCircle`(옵션 표시)
    - `stats(): TowerLevelStats` — `getTower(key).levels[level-1]`
    - `setLevel(n): void` — 스프라이트 스케일/테두리 갱신
    - `cooldownMs` 필드 (발사 쿨다운, Task 15에서 사용)
    - `static nextId`
  - `BuildMenu.ts`: `class BuildMenu` — `constructor(scene, opts: { onPick: (key: string) => void; canAfford: (key: string) => boolean })`; `openAt(x, y): void`; `close(): void`. 4개 타워 버튼(아이콘 + 이름 + 가격), 골드 부족 시 흐리게.
  - `Game.ts` 추가: `towers: Tower[]`, `buildMenu: BuildMenu`, 타일 `pointerup` 핸들러 `tryOpenBuild(tile)`, `placeTower(key, tile)`.

- [ ] **Step 1: `src/entities/Tower.ts` 작성**

```ts
import Phaser from 'phaser';
import type { TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { getTower } from '../data/towers';
import { COLORS } from '../core/constants';

let nextId = 1;

export class Tower {
  readonly id = nextId++;
  level = 1;
  cooldownMs = 0;
  readonly sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    readonly key: string,
    public tile: TileCoord,
    pos: Vec2,
  ) {
    this.sprite = scene.add.image(pos.x, pos.y, `tower_${key}`).setInteractive({ useHandCursor: true });
    this.ring = scene.add.circle(pos.x, pos.y, this.stats().range, 0xffffff, 0.05)
      .setStrokeStyle(1, 0xffffff, 0.25).setVisible(false);
    this.applyLevelVisual();
  }

  stats(): TowerLevelStats { return getTower(this.key).levels[this.level - 1]; }
  get maxLevel(): number { return getTower(this.key).maxLevel; }
  get pos(): Vec2 { return { x: this.sprite.x, y: this.sprite.y }; }

  setLevel(n: number): void {
    this.level = Math.min(n, this.maxLevel);
    this.applyLevelVisual();
  }

  private applyLevelVisual(): void {
    const scale = 1 + (this.level - 1) * 0.12;
    this.sprite.setScale(scale);
    this.sprite.setTint(0xffffff);
    // 레벨 테두리: 레벨 높을수록 밝은 금색 외곽
    this.sprite.setData('level', this.level);
    this.ring.setRadius(this.stats().range);
  }

  showRange(v: boolean): void { this.ring.setVisible(v); }

  destroy(): void { this.sprite.destroy(); this.ring.destroy(); }
}
void COLORS;
```

- [ ] **Step 2: `src/ui/BuildMenu.ts` 작성**

```ts
import Phaser from 'phaser';
import { TOWER_KEYS, getTower } from '../data/towers';

export interface BuildMenuOpts {
  onPick: (key: string) => void;
  canAfford: (key: string) => boolean;
}

export class BuildMenu {
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(private scene: Phaser.Scene, private opts: BuildMenuOpts) {
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
  }

  openAt(x: number, y: number): void {
    this.container.removeAll(true);
    const bg = this.scene.add.rectangle(0, 0, 220, 64 * TOWER_KEYS.length + 12, 0x11121f, 0.95)
      .setStrokeStyle(2, 0x66ccff);
    this.container.add(bg);

    TOWER_KEYS.forEach((key, i) => {
      const def = getTower(key);
      const yy = -((TOWER_KEYS.length - 1) / 2) * 64 + i * 64;
      const afford = this.opts.canAfford(key);
      const icon = this.scene.add.image(-80, yy, `tower_${key}`).setScale(0.7)
        .setAlpha(afford ? 1 : 0.35);
      const label = this.scene.add.text(-52, yy - 12, `${def.name}\n${def.cost}G`, {
        fontFamily: 'monospace', fontSize: '18px', color: afford ? '#f2f2f7' : '#777',
      });
      const hit = this.scene.add.rectangle(0, yy, 210, 60, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      if (afford) hit.on('pointerup', () => { this.opts.onPick(key); this.close(); });
      this.container.add([icon, label, hit]);
    });

    const cx = Phaser.Math.Clamp(x, 130, 720 - 130);
    const cy = Phaser.Math.Clamp(y, 160, 1280 - 160);
    this.container.setPosition(cx, cy).setVisible(true);
    this.visible = true;
  }

  close(): void { this.container.setVisible(false); this.visible = false; }
  get isOpen(): boolean { return this.visible; }
}
```

- [ ] **Step 3: `Game.ts` 에 타워 설치 배선**

`create()` 끝부분에 추가:

```ts
this.towers = [];
this.buildMenu = new BuildMenu(this, {
  onPick: (key) => { if (this.pendingTile) this.placeTower(key, this.pendingTile); },
  canAfford: (key) => this.eco.canAfford(getTower(key).cost),
});

this.input.on('pointerup', (pointer: Phaser.Input.Pointer, currentlyOver: unknown[]) => {
  if (this.buildMenu.isOpen) return; // 메뉴 내부 클릭은 메뉴가 처리
  if ((currentlyOver as unknown[]).length > 0) return; // 타워 등 다른 오브젝트 클릭
  const tile = this.grid.pixelToTile({ x: pointer.worldX, y: pointer.worldY });
  if (this.grid.canPlace(tile)) {
    this.pendingTile = tile;
    const c = this.grid.tileToPixelCenter(tile);
    this.buildMenu.openAt(c.x, c.y);
  } else {
    this.buildMenu.close();
  }
});
```

필드 추가: `private towers: Tower[] = []; private buildMenu!: BuildMenu; private pendingTile: TileCoord | null = null;`

메서드 추가:

```ts
private placeTower(key: string, tile: TileCoord) {
  const def = getTower(key);
  if (!this.grid.canPlace(tile)) return;
  if (!this.eco.spend(def.cost)) return;
  const pos = this.grid.tileToPixelCenter(tile);
  const tower = new Tower(this, key, tile, pos);
  this.grid.occupy(tile, tower.id);
  this.towers.push(tower);
  this.pendingTile = null;
}
```

import 추가: `Tower`, `BuildMenu`, `getTower`, `TileCoord`.

- [ ] **Step 4: 수동 검증**

Run: `npm run dev` → 1-1 진입.
1. 밝은 "설치 가능" 타일 탭 → BuildMenu 팝업(화살탑 50G / 대포 110G / 서리탑 80G / 번개탑 95G).
2. 화살탑 선택 → 골드 200 → 150, 타일에 삼각형 타워.
3. 같은 타일 다시 탭 → 팝업 안 뜸(점유됨).
4. 길 타일 탭 → 팝업 안 뜸.
5. 골드 부족하게 여러 개 설치 → 부족한 타워는 흐리게 표시되고 선택 불가.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: tower placement via build menu with gold cost

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 15: Projectile + 타워 발사 (single / splash / slow / chain) + 처치 보상

**Files:**
- Create: `src/entities/Projectile.ts`, `src/systems/combat.ts`
- Modify: `src/scenes/Game.ts` (타워 update 루프, 발사, 명중 처리)
- Test: `tests/systems/combat.test.ts` (순수 데미지 / 체인 계산 헬퍼)

**Interfaces:**
- Consumes: `pickTarget`, `enemiesInRadius`, `Targetable`, `Tower`, `Enemy`, `getTower`
- Produces:
  - `Projectile.ts`: `class Projectile` — `constructor(scene, from: Vec2, opts)`, `update(dtMs, speedMul): boolean` (명중/소멸 시 true). `opts: { targetPos: () => Vec2 | null; speed: number; onHit: (hitPos: Vec2) => void }`
  - `src/systems/combat.ts` (신규 순수 모듈, `phaser` 미포함, `Targetable` 타입만 `./TargetingSystem` 에서 import):
    - `effectiveDamage(base: number, mult: number): number` = `Math.round(base * mult)`
    - `chainDamages(base: number, falloff: number, extraJumps: number): number[]` — 길이 `extraJumps+1`, `[round(base), round(base*falloff), round(base*falloff^2), ...]`
    - `buildChain(primary: Targetable, all: Targetable[], chainRange: number, extraJumps: number): Targetable[]` — `primary` 부터 시작해 매 점프마다 "아직 안 맞은 살아있는 적 중 마지막 피격 지점에서 `chainRange` 이내 최근접"을 greedy 선택; 범위 내 대상 없으면 조기 종료. 반환 `[primary, ...점프들]`.
  - `Game.ts`: `private updateTowers(dtMs)` — 각 타워 쿨다운 감소, 0 이하면 `pickTarget` → 공격종류별 처리 → 쿨다운 = `1000 / fireRate`.

- [ ] **Step 1: `tests/systems/combat.test.ts` 작성 (실패)**

```ts
import { chainDamages, buildChain } from '../../src/systems/combat';
import type { Targetable } from '../../src/systems/TargetingSystem';

const mk = (id: number, x: number, y: number, alive = true): Targetable =>
  ({ id, pos: { x, y }, progress: 0, alive });

describe('chainDamages', () => {
  it('applies falloff per jump and rounds', () => {
    expect(chainDamages(40, 0.5, 3)).toEqual([40, 20, 10, 5]);
    expect(chainDamages(10, 0.6, 0)).toEqual([10]);
    expect(chainDamages(17, 0.65, 2)).toEqual([17, 11, 7]); // round(11.05), round(7.1825)
  });
});

describe('buildChain', () => {
  it('chains to nearest not-yet-hit alive enemy within range, stopping when none in range', () => {
    const primary = mk(1, 0, 0);
    const all = [primary, mk(2, 30, 0), mk(3, 55, 0), mk(4, 500, 0)];
    expect(buildChain(primary, all, 40, 3).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('stops early when no target in range', () => {
    const primary = mk(1, 0, 0);
    expect(buildChain(primary, [primary, mk(2, 200, 0)], 40, 3).map((t) => t.id)).toEqual([1]);
  });

  it('skips dead enemies', () => {
    const primary = mk(1, 0, 0);
    const all = [primary, mk(2, 20, 0, false), mk(3, 25, 0)];
    expect(buildChain(primary, all, 40, 2).map((t) => t.id)).toEqual([1, 3]);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- combat`
Expected: FAIL.

- [ ] **Step 3: `src/systems/combat.ts` 구현**

```ts
import type { Targetable } from './TargetingSystem';
import type { Vec2 } from '../core/types';

export function chainDamages(base: number, falloff: number, extraJumps: number): number[] {
  const out: number[] = [];
  let mult = 1;
  for (let i = 0; i <= extraJumps; i++) {
    out.push(Math.round(base * mult));
    mult *= falloff;
  }
  return out;
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function buildChain(
  primary: Targetable,
  all: Targetable[],
  chainRange: number,
  extraJumps: number,
): Targetable[] {
  const chain: Targetable[] = [primary];
  const hit = new Set<number>([primary.id]);
  const r2 = chainRange * chainRange;
  let current = primary;
  for (let j = 0; j < extraJumps; j++) {
    let best: Targetable | null = null;
    let bestD = Infinity;
    for (const e of all) {
      if (!e.alive || hit.has(e.id)) continue;
      const d = dist2(current.pos, e.pos);
      if (d <= r2 && d < bestD) { best = e; bestD = d; }
    }
    if (!best) break;
    chain.push(best);
    hit.add(best.id);
    current = best;
  }
  return chain;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- combat`
Expected: PASS (4 tests).

- [ ] **Step 5: `src/entities/Projectile.ts` 작성**

```ts
import Phaser from 'phaser';
import type { Vec2 } from '../core/types';

export interface ProjectileOpts {
  targetPos: () => Vec2 | null;
  speed: number;               // 픽셀/초
  onHit: (hitPos: Vec2) => void;
}

export class Projectile {
  private sprite: Phaser.GameObjects.Image;
  private last: Vec2;

  constructor(scene: Phaser.Scene, from: Vec2, private opts: ProjectileOpts) {
    this.sprite = scene.add.image(from.x, from.y, 'projectile');
    this.last = { ...from };
  }

  update(dtMs: number, speedMul: number): boolean {
    const target = this.opts.targetPos() ?? this.last;
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const move = (this.opts.speed * dtMs / 1000) * speedMul;
    if (dist <= move || dist === 0) {
      this.opts.onHit({ x: target.x, y: target.y });
      this.sprite.destroy();
      return true;
    }
    this.sprite.x += (dx / dist) * move;
    this.sprite.y += (dy / dist) * move;
    this.last = { x: this.sprite.x, y: this.sprite.y };
    return false;
  }

  destroy(): void { this.sprite.destroy(); }
}
```

- [ ] **Step 6: `Game.ts` 타워 발사 배선**

필드: `private projectiles: Projectile[] = [];`

`update()` 안, 적 이동 처리 앞에 `this.updateTowers(dtMs);` 추가. 그리고 투사체 업데이트:

```ts
this.projectiles = this.projectiles.filter((p) => !p.update(dtMs, this.speedMul));
```

메서드:

```ts
private updateTowers(dtMs: number) {
  const targets: Targetable[] = this.enemies.map((e) => ({
    id: e.id, pos: e.pos, progress: e.progress, alive: e.alive,
  }));

  for (const tower of this.towers) {
    tower.cooldownMs -= dtMs;
    if (tower.cooldownMs > 0) continue;
    const s = tower.stats();
    const target = pickTarget(tower.pos, s.range, targets);
    if (!target) continue;
    tower.cooldownMs = 1000 / s.fireRate;

    const enemy = this.enemies.find((e) => e.id === target.id);
    if (!enemy) continue;
    const def = getTower(tower.key);

    if (def.attack === 'chain') {
      const chain = buildChain(target, targets, s.chainRange ?? 0, s.chainTargets ?? 0);
      const dmgs = chainDamages(s.damage, s.chainFalloff ?? 1, chain.length - 1);
      const chainIds = chain.map((t) => t.id);
      this.projectiles.push(new Projectile(this, tower.pos, {
        speed: 620,
        targetPos: () => (enemy.alive ? enemy.pos : null),
        onHit: () => {
          chainIds.forEach((id, i) => {
            this.enemies.find((e) => e.id === id)?.takeDamage(dmgs[i]);
          });
        },
      }));
      continue;
    }

    this.projectiles.push(new Projectile(this, tower.pos, {
      speed: 520,
      targetPos: () => (enemy.alive ? enemy.pos : null),
      onHit: (hitPos) => {
        if (def.attack === 'splash') {
          for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0,
            this.enemies.map((e) => ({ id: e.id, pos: e.pos, progress: e.progress, alive: e.alive })))) {
            this.enemies.find((e) => e.id === hit.id)?.takeDamage(s.damage);
          }
        } else {
          if (!enemy.alive) return;
          enemy.takeDamage(s.damage);
          if (def.attack === 'slow') enemy.applySlow(s.slowMul ?? 1, s.slowDurationMs ?? 0);
        }
      },
    }));
  }
}
```

imports: `pickTarget`, `enemiesInRadius`, `Targetable` from `../systems/TargetingSystem`; `chainDamages`, `buildChain` from `../systems/combat` (`effectiveDamage` is exported but unused by Game — do not import it); `Projectile`; `getTower`.

- [ ] **Step 7: 수동 검증**

Run: `npm run dev` → 1-1, 화살탑을 길 옆에 설치, "다음 웨이브".
1. 타워가 사거리 안 적에게 점(투사체) 발사, 명중 시 적 사라짐, 골드 +6.
2. 대포 설치 → 느리게 쏘고 여러 적 동시 피해.
3. 서리탑 → 맞은 적이 눈에 띄게 느려짐.
4. 번개탑 → 1차 대상 명중 후 근처 적들에게 번개가 튀고(체인), 튈수록 데미지 감소. 밀집한 적 무리에 강함.
5. 웨이브 전부 막으면 클리어 보너스만큼 골드 증가, 5웨이브 다 막으면 "CLEAR".

Run: `npm test` → 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: projectiles and tower attacks (single/splash/slow/chain) + bounty

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 16: 머지 (드래그&드롭) + 판매

**Files:**
- Modify: `src/entities/Tower.ts` (드래그 가능), `src/scenes/Game.ts` (드롭 판정, 머지 실행, 판매 UI)
- Test: 수동 (규칙은 MergeController 테스트가 커버)

**Interfaces:**
- Consumes: `canMerge`, `mergeResultLevel`, `MergeCandidate`, `cumulativeCost`, `EconomyManager.sellRefund`
- Produces:
  - `Tower`: `enableDrag(scene)`, `sprite` 에 `scene.input.setDraggable`. 원위치 복귀 로직은 Game이 담당.
  - `Game.ts`: `dragstart`/`drag`/`dragend` 핸들러. `dragend` 시 드롭 위치 타일의 타워와 `canMerge` → 머지, 아니면 원위치. 타워 롱프레스(또는 선택 후 판매 버튼) → `confirmSell(tower)`.

- [ ] **Step 1: `Tower.ts` 에 드래그 활성화**

`constructor` 끝에: `scene.input.setDraggable(this.sprite);`
`this.sprite.setData('towerId', this.id);`
`homePos` 저장: `readonly homePos: Vec2` = pos 복사. (드래그 취소 시 복귀용)

- [ ] **Step 2: `Game.ts` 드래그 핸들러**

`create()` 에 추가:

```ts
this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
  obj.setDepth(600);
  const t = this.towers.find((x) => x.id === obj.getData('towerId'));
  t?.showRange(true);
});

this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
  obj.setPosition(dx, dy);
});

this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
  obj.setDepth(1);
  const dragged = this.towers.find((x) => x.id === obj.getData('towerId'));
  if (!dragged) return;
  dragged.showRange(false);

  const dropTile = this.grid.pixelToTile({ x: obj.x, y: obj.y });
  const occId = this.grid.occupantAt(dropTile);
  const targetTower = occId != null ? this.towers.find((x) => x.id === occId) : undefined;

  if (targetTower && targetTower.id !== dragged.id) {
    const a: MergeCandidate = { id: dragged.id, key: dragged.key, level: dragged.level };
    const b: MergeCandidate = { id: targetTower.id, key: targetTower.key, level: targetTower.level };
    if (canMerge(a, b, dragged.maxLevel)) {
      targetTower.setLevel(mergeResultLevel(targetTower.level));
      this.grid.release(dragged.tile);
      this.removeTower(dragged);
      this.snapHome(targetTower);
      return;
    }
  }
  // 머지 실패 → 원위치
  this.snapHome(dragged);
});
```

메서드:

```ts
private snapHome(t: Tower) {
  const c = this.grid.tileToPixelCenter(t.tile);
  t.sprite.setPosition(c.x, c.y);
}

private removeTower(t: Tower) {
  this.towers = this.towers.filter((x) => x.id !== t.id);
  t.destroy();
}

private confirmSell(t: Tower) {
  const refund = this.eco.sellRefund(cumulativeCost(getTower(t.key), t.level));
  this.grid.release(t.tile);
  this.removeTower(t);
  void refund;
}
```

판매 UI: 타워 `pointerdown` 후 500ms 유지 시 `confirmSell` 확인 팝업(간단히 `this.add.text` 로 "판매? [예]" 버튼). 구현 세부:

```ts
// Tower 생성 직후 Game.placeTower 안에서:
tower.sprite.on('pointerdown', () => {
  this.sellTimer = this.time.delayedCall(500, () => this.showSellPrompt(tower));
});
tower.sprite.on('pointerup', () => this.sellTimer?.remove());
tower.sprite.on('dragstart', () => this.sellTimer?.remove());
```

`showSellPrompt(tower)` 는 화면 중앙에 반투명 패널 + "판매 (+환급액)" / "취소" 버튼 2개. 예 선택 시 `confirmSell`.

필드: `private sellTimer?: Phaser.Time.TimerEvent;`
imports: `canMerge`, `mergeResultLevel`, `MergeCandidate` from `../systems/MergeController`; `cumulativeCost` from `../data/towers`.

- [ ] **Step 3: 수동 검증**

Run: `npm run dev` → 1-1.
1. 화살탑 2개 설치(둘 다 Lv1). 하나를 다른 하나 위로 드래그 → Lv2 (크기 커짐), 드래그한 건 사라지고 타일 비워짐.
2. Lv2 + Lv1 드래그 → 머지 안 됨, 원위치.
3. 화살탑 위에 대포 드래그 → 머지 안 됨, 원위치.
4. Lv5끼리 → 머지 안 됨.
5. 타워 길게 눌러 → 판매 팝업 → 예 → 타워 사라지고 골드 60% 환급, 타일 재사용 가능.
6. 빈 설치가능 타일로 타워 드래그(점유 안 된 곳)에 드롭 → 현재는 원위치(이동 배치는 v1 비포함). 정상.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: drag-to-merge towers and long-press sell

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 17: 배속(1x/2x) + 일시정지

**Files:**
- Modify: `src/scenes/HUD.ts` (배속·일시정지 버튼), `src/scenes/Game.ts` (`speedMul`, pause)
- Test: 수동

**Interfaces:**
- Consumes: `GameEvents['speed:changed']`
- Produces:
  - `HUD` 추가 콜백: `onToggleSpeed: () => void`, `onTogglePause: () => void`. 버튼 라벨 갱신(`1x`/`2x`, `⏸`/`▶`).
  - `Game`: `toggleSpeed()` → `speedMul` 1↔2, `bus.emit('speed:changed', ...)`. `togglePause()` → `this.running` 토글 + 물리/타이머 정지. 일시정지 시 `update` 조기 반환.

- [ ] **Step 1: `Game.ts` 메서드 추가**

```ts
toggleSpeed(): void {
  this.speedMul = this.speedMul === 1 ? 2 : 1;
  this.bus.emit('speed:changed', { multiplier: this.speedMul });
}

private paused = false;
togglePause(): void {
  this.paused = !this.paused;
}
```

`update()` 최상단: `if (!this.running || this.paused) return;`

`HudInit` 에 `onToggleSpeed`, `onTogglePause` 추가하고 `scene.launch('hud', {... onToggleSpeed: () => this.toggleSpeed(), onTogglePause: () => this.togglePause()})`.

- [ ] **Step 2: `HUD.ts` 버튼 추가**

우측 하단에 `1x` 토글 버튼, `⏸` 버튼. `speed:changed` 구독해서 라벨 갱신. pause는 HUD 로컬 상태로 `⏸`/`▶` 토글.

```ts
const speedBtn = this.add.text(GAME_WIDTH - 16, 84, '1x', {
  ...style, color: '#66ccff',
}).setOrigin(1, 0).setInteractive({ useHandCursor: true });
speedBtn.on('pointerup', () => data.onToggleSpeed());
data.bus.on('speed:changed', (p) => speedBtn.setText(`${p.multiplier}x`));

let paused = false;
const pauseBtn = this.add.text(GAME_WIDTH - 70, 84, '⏸', {
  ...style, color: '#66ccff',
}).setOrigin(1, 0).setInteractive({ useHandCursor: true });
pauseBtn.on('pointerup', () => { paused = !paused; pauseBtn.setText(paused ? '▶' : '⏸'); data.onTogglePause(); });
```

- [ ] **Step 3: 수동 검증**

Run: `npm run dev`
- `1x` 탭 → `2x`, 적/투사체/스폰 전부 2배 빠름. 다시 탭 → `1x`.
- `⏸` 탭 → 모든 움직임 멈춤, `▶` 로 바뀜. 다시 탭 → 재개.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: 2x speed toggle and pause

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 18: Result 씬 + 별점 + 저장/해금

**Files:**
- Create: `src/scenes/Result.ts`
- Modify: `src/scenes/Game.ts` (`endStage` → 별점 계산, `recordResult`, Result 씬 전환), `src/main.ts` (등록)
- Test: `tests/core/stars.test.ts` (별점 계산 헬퍼)

**Interfaces:**
- Consumes: `recordResult`, `nextStageId`, `STAGES`
- Produces:
  - `src/core/stars.ts` (신규 순수): `function starsFor(livesRatio: number, thresholds: [number, number, number]): number` — ratio ≥ thresholds[2] → 3, ≥[1] → 2, ≥[0] 또는 >0 → 1, ==0(패배) → 0. 정확히: 승리 시 최소 1.
    시그니처: `starsFor(livesLeft: number, livesStart: number, thresholds, won: boolean): number`
  - `Result.ts`: scene key `result`. `init(data: { stageId, won, stars })`. 별 3칸 표시, "다시 하기" → `game` 재시작, "스테이지 선택" → `stageselect`, 이겼고 다음 스테이지 있으면 "다음 스테이지".

- [ ] **Step 1: `tests/core/stars.test.ts` 작성 (실패)**

```ts
import { starsFor } from '../../src/core/stars';

const th: [number, number, number] = [0.3, 0.65, 1.0];

describe('starsFor', () => {
  it('loss is 0 stars', () => {
    expect(starsFor(0, 20, th, false)).toBe(0);
  });
  it('perfect (all lives) is 3', () => {
    expect(starsFor(20, 20, th, true)).toBe(3);
  });
  it('mid is 2', () => {
    expect(starsFor(14, 20, th, true)).toBe(2); // 0.7 >= 0.65
  });
  it('win with few lives is at least 1', () => {
    expect(starsFor(1, 20, th, true)).toBe(1); // 0.05 < 0.3 but won
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- stars`
Expected: FAIL.

- [ ] **Step 3: `src/core/stars.ts` 구현**

```ts
export function starsFor(
  livesLeft: number,
  livesStart: number,
  thresholds: [number, number, number],
  won: boolean,
): number {
  if (!won) return 0;
  const ratio = livesStart === 0 ? 1 : livesLeft / livesStart;
  if (ratio >= thresholds[2]) return 3;
  if (ratio >= thresholds[1]) return 2;
  return 1;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- stars`
Expected: PASS (4 tests).

- [ ] **Step 5: `src/scenes/Result.ts` 작성**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { nextStageId } from '../data/stages';

export class Result extends Phaser.Scene {
  constructor() { super('result'); }

  create(data: { stageId: string; won: boolean; stars: number }) {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020, 0.85);
    this.add.text(GAME_WIDTH / 2, 360, data.won ? 'CLEAR!' : 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '56px', color: data.won ? '#ffcc44' : '#ff5566',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 470, '★★★☆☆☆'.slice(3 - data.stars, 6 - data.stars), {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffcc44',
    }).setOrigin(0.5);

    const mkBtn = (y: number, label: string, fn: () => void) => {
      const t = this.add.text(GAME_WIDTH / 2, y, label, {
        fontFamily: 'monospace', fontSize: '32px', color: '#f2f2f7',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', fn);
    };

    let y = 620;
    mkBtn(y, '다시 하기', () => this.scene.start('game', { stageId: data.stageId }));
    y += 70;
    const nxt = nextStageId(data.stageId);
    if (data.won && nxt) {
      mkBtn(y, '다음 스테이지 ▶', () => this.scene.start('game', { stageId: nxt }));
      y += 70;
    }
    mkBtn(y, '스테이지 선택', () => this.scene.start('stageselect'));
  }
}
```

- [ ] **Step 6: `Game.ts` `endStage` 교체**

```ts
private endStage(won: boolean) {
  if (!this.running) return;
  this.running = false;
  this.scene.stop('hud');
  const stars = starsFor(this.lives, this.stage.startLives, this.stage.starThresholds, won);
  recordResult(this.stage.id, stars, nextStageId(this.stage.id), );
  if (won) this.bus.emit('stage:won', { stars });
  else this.bus.emit('stage:lost', {});
  this.scene.start('result', { stageId: this.stage.id, won, stars });
}
```

imports: `starsFor` from `../core/stars`; `recordResult` from `../core/save`; `nextStageId` from `../data/stages`.
`main.ts` scene 배열에 `Result` 추가.

- [ ] **Step 7: 수동 검증**

Run: `npm run dev`
1. 1-1 클리어 → Result "CLEAR!" + 별점. "다음 스테이지" 버튼.
2. "스테이지 선택" → 1-2 가 해금됨(자물쇠 사라짐), 1-1 에 별점 표시.
3. 브라우저 새로고침 → 해금·별점 유지(localStorage).
4. 일부러 라이프 0 → "GAME OVER", 별 0, 다음 스테이지 버튼 없음, 1-2 여전히 잠김.

Run: `npm test` → 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: result screen with star rating, save and stage unlock

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 19: 성능 — 오브젝트 풀링 + 2x 스트레스 확인

**Files:**
- Modify: `src/scenes/Game.ts` (enemy/projectile 배열 관리 최적화), `src/entities/Enemy.ts`, `src/entities/Projectile.ts` (필요 시 재사용 지원)
- Create: `src/core/pool.ts` + `tests/core/pool.test.ts`

**Interfaces:**
- Produces:
  - `pool.ts`: `class Pool<T> { constructor(make: () => T); acquire(): T; release(t: T): void; get activeCount(): number }` — 간단한 free-list.
  - Game 은 Projectile 을 Pool로 재사용(가장 생성/파괴 빈번). Enemy 는 텍스처 교체 비용이 있어 v1은 destroy 유지하되, 배열 필터를 프레임당 1회로 제한.

- [ ] **Step 1: `tests/core/pool.test.ts` 작성 (실패)**

```ts
import { Pool } from '../../src/core/pool';

describe('Pool', () => {
  it('reuses released instances', () => {
    let made = 0;
    const p = new Pool(() => ({ id: ++made }));
    const a = p.acquire();
    p.release(a);
    const b = p.acquire();
    expect(b).toBe(a);
    expect(made).toBe(1);
  });

  it('tracks active count', () => {
    const p = new Pool(() => ({}));
    const a = p.acquire(); p.acquire();
    expect(p.activeCount).toBe(2);
    p.release(a);
    expect(p.activeCount).toBe(1);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- pool`
Expected: FAIL.

- [ ] **Step 3: `src/core/pool.ts` 구현**

```ts
export class Pool<T> {
  private free: T[] = [];
  private active = new Set<T>();

  constructor(private make: () => T) {}

  acquire(): T {
    const item = this.free.pop() ?? this.make();
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (this.active.delete(item)) this.free.push(item);
  }

  get activeCount(): number { return this.active.size; }
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- pool`
Expected: PASS (2 tests).

- [ ] **Step 5: Projectile 풀링 적용 (선택적, 측정 후 판단)**

`Projectile` 에 `reset(from: Vec2, opts: ProjectileOpts): void` 추가(생성자 로직 재사용), `sprite.setActive(true).setVisible(true)`. 명중 시 `destroy` 대신 `sprite.setVisible(false)` + Game 이 `pool.release`.

> 먼저 측정. 아래 Step 6에서 프레임 저하가 없으면 이 스텝은 건너뛰고 커밋 메시지에 명시.

- [ ] **Step 6: 스트레스 수동 검증**

Run: `npm run dev` → 1-5, 2x 배속.
- Chrome DevTools > Performance 또는 `game.loop.actualFps` 를 화면에 임시 표시.
- 목표: 데스크톱에서 55fps 이상 유지, 적 60기+ 동시.
- 저하 시: Step 5 풀링 적용, `updateTowers` 의 `targets` 배열을 프레임당 1회만 생성(현재 splash 콜백에서 재생성하는 부분 제거하고 클로저로 공유).

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "perf: add object pool; reuse projectiles; single target list per frame

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 20: 사운드 (선택, 플래그로 on/off)

**Files:**
- Create: `public/sfx/` (CC0 효과음 4종: shoot.mp3, hit.mp3, clear.mp3, lose.mp3), `src/core/audio.ts`
- Modify: `src/scenes/Preload.ts` (로드), `src/scenes/Game.ts` (재생 훅), `src/core/constants.ts` (`SOUND_ENABLED`)

**Interfaces:**
- Produces: `audio.ts`: `playSfx(scene, key)` — `SOUND_ENABLED` false면 no-op. 파일 없으면 조용히 skip.

- [ ] **Step 1: `constants.ts` 에 `export const SOUND_ENABLED = true;` 추가**

- [ ] **Step 2: CC0 효과음 확보**

`public/sfx/` 에 4개 파일 배치. 출처: freesound.org CC0 또는 sfxr류 생성기. 없으면 `SOUND_ENABLED = false` 로 두고 이 태스크 종료(게임은 무음으로 정상 동작).

- [ ] **Step 3: `src/core/audio.ts`**

```ts
import type Phaser from 'phaser';
import { SOUND_ENABLED } from './constants';

export function playSfx(scene: Phaser.Scene, key: string): void {
  if (!SOUND_ENABLED) return;
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume: 0.4 });
}
```

- [ ] **Step 4: `Preload.ts` 로드**

```ts
this.load.audio('sfx_shoot', 'sfx/shoot.mp3');
this.load.audio('sfx_hit', 'sfx/hit.mp3');
this.load.audio('sfx_clear', 'sfx/clear.mp3');
this.load.audio('sfx_lose', 'sfx/lose.mp3');
```

`preload()` 로 이동(현재 create에서 텍스처만 생성 중이니 `preload()` 추가).

- [ ] **Step 5: `Game.ts` 훅**

- 타워 발사 시 `playSfx(this, 'sfx_shoot')` (연사 과하면 확률 0.3 로 제한).
- 적 처치 시 `playSfx(this, 'sfx_hit')`.
- `endStage(true)` → `sfx_clear`, `endStage(false)` → `sfx_lose`.

- [ ] **Step 6: 수동 검증**

Run: `npm run dev` → 소리 확인. `SOUND_ENABLED=false` 로 바꿔도 에러 없이 무음.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: optional sound effects behind SOUND_ENABLED flag

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 21: PWA 마감 + 아이콘 + 빌드 검증

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `index.html` (`theme-color`, apple meta), `src/main.ts` (없음), 필요 시 `vite.config.ts`
- Test: 빌드 + 수동 설치 확인

**Interfaces:**
- Produces: 프로덕션 빌드 `dist/` 가 오프라인에서 동작, 폰에서 "홈 화면에 추가" 시 전체화면 실행.

- [ ] **Step 1: 아이콘 생성**

512×512, 192×192 PNG. 배경 `#0f1020`, 중앙에 밝은 타워 삼각형 + 방패 느낌. 간단히 캔버스 스크립트나 이미지 툴로 생성해 `public/icons/` 에 배치.

- [ ] **Step 2: `index.html` 메타 추가**

```html
<meta name="theme-color" content="#0f1020" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: 타입 에러 0, `dist/` 생성, `dist/manifest.webmanifest` 와 서비스워커(`sw.js` 또는 `workbox-*.js`) 존재.

- [ ] **Step 4: 프리뷰 + 오프라인 확인**

Run: `npm run preview`
- 브라우저에서 열고 DevTools > Application > Service Workers 등록 확인.
- Network 를 Offline 으로 바꾸고 새로고침 → 여전히 로드됨.
- Lighthouse PWA 감사 → "Installable" 통과.

- [ ] **Step 5: 폰 실제 확인 (같은 와이파이)**

Run: `npm run preview -- --host`
- 폰 브라우저에서 `http://<PC-IP>:4173` 접속.
- 세로 화면, 터치로 타워 설치/머지 동작.
- 브라우저 메뉴 > "홈 화면에 추가" → 아이콘 생성 → 아이콘 실행 시 전체화면.

> 참고: iOS Safari 는 서비스워커 PWA 지원이 제한적이나 "홈 화면에 추가" + 전체화면은 동작. HTTPS 가 아니면 일부 기능 제한 — 실제 배포 시 정적 호스팅(Netlify/GitHub Pages 등)에 올릴 것(배포 자체는 v1 범위 밖).

- [ ] **Step 6: README 작성**

`game/README.md` 에: 실행법(`npm i`, `npm run dev`), 빌드법, 스테이지/타워 데이터 위치, "APK로 만들려면 Capacitor" 한 줄 안내, 테스트(`npm test`).

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: finalize PWA (icons, meta, offline), add README

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 22: 통합 점검 (플레이스루) + 밸런스 1차 조정

**Files:**
- Modify: `src/data/towers.ts`, `src/data/enemies.ts`, `src/data/stages/*` (수치만)
- Test: `npm test` 회귀

**Interfaces:** 없음 (데이터 튜닝)

- [ ] **Step 1: 전체 플레이스루**

1-1부터 1-5까지 순서대로 클리어 시도. 각 스테이지에 대해 기록:
- 1-1: 첫 타워 없이도 몇 라이프 남는지 / 화살탑 1개로 클리어 가능한지 (튜토리얼이므로 쉬워야 함, 3별 여유).
- 1-3~1-5: 머지 없이 클리어 불가능해야 함(머지 유도). 최적 플레이 시 2~3별.
- boss 웨이브가 실제로 위협적인지.

- [ ] **Step 2: 조정 기준**

- 어떤 스테이지가 1분 안에 첫 시도 클리어되면 난이도 부족 → 웨이브 count +20% 또는 startGold -10%.
- 3별이 불가능해 보이면 starThresholds[2] 를 0.9 로 완화.
- 특정 타워가 항상 정답이면(예: 대포만) 해당 타워 cost +15% 또는 fireRate -10%.

- [ ] **Step 3: 조정 후 회귀**

Run: `npm test`
Expected: `stages.test.ts`, `definitions.test.ts` 여전히 PASS (스키마 유지).

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "balance: first-pass tuning across stages 1-1..1-5

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage**

| 스펙 항목 | 태스크 |
|---|---|
| PWA / Vite / 세로 스케일 | 1, 21 |
| 씬 구성 (Boot~Result, HUD 오버레이) | 1, 12, 13, 18 |
| 로직/렌더 분리 + 아키텍처 가드 | 1 (테스트), 2·4~10 (순수 모듈) |
| 데이터 주도 (towers/enemies/stages) | 7, 11 |
| eventBus | 2, 12 |
| GridManager (타일<->픽셀, 점유) | 4 |
| PathManager (분기, 진행률) | 5 |
| EconomyManager | 6 |
| WaveManager (스폰 스케줄, 종료) | 8 |
| TargetingSystem (가장 앞선 적) | 9 |
| MergeController (같은 종류/레벨, 최대레벨) | 10 |
| 타워 설치 (위치+종류 선택, 골드) | 14 |
| 투사체 + 4가지 공격 (single/splash/slow/chain) | 15 |
| 머지 드래그&드롭 + 판매 | 16 |
| 배속 1x/2x + 일시정지 | 17 |
| 승패 + 별점 + 저장/해금 | 3, 18 |
| StageSelect (잠금/별) | 13 |
| v1 콘텐츠: 타워 4종 | 7 |
| v1 콘텐츠: 적 3종 + 보스 | 7, 11 |
| v1 콘텐츠: 스테이지 1-1~1-5, 분기 | 11 |
| 아트: generateTexture 도형, 레트로 | 12 |
| 사운드 (선택) | 20 |
| 대량 스폰 + 2x 성능 | 19 |
| DoD 플레이스루 | 22 |

갭 없음.

**2. Placeholder scan**

- Task 11 Step 5의 1-3/1-4/1-5 는 "1-2 구조 재사용 + 아래 명시된 수치 차이"로 구체 지시(웨이브 수, startGold, boss 위치). 완전한 코드 리터럴은 아니지만 실행자가 1-2를 복제해 명시된 델타만 적용하면 됨 — 허용 범위로 판단. 더 엄격히 하려면 실행 시 각 파일 전체를 1-2에서 복붙 후 지정 수치 반영.
- Task 19 Step 5는 "측정 후 판단" 조건부 — 측정 기준(55fps, 60기)과 대안(풀링, target 리스트 1회 생성)을 명시했으므로 실행 가능.
- Task 20은 에셋 확보 실패 시 `SOUND_ENABLED=false` 로 명확한 폴백.

**3. Type consistency**

- `WaveManager.update(dtMs)` — Task 12 Step 5 본문에 `dtMsRaw` 로 쓴 뒤 주석으로 `dtMs` 로 정정 지시. 실행자가 `this.waves.update(dtMs)` 로 작성하도록 Task 15에서 `updateTowers(dtMs)` 와 일관.
- `Enemy.update(dtMs, speedMul)` — Task 12에서 정의, Task 15·17에서 동일 시그니처 사용.
- `Targetable` — Task 9 정의, Task 15에서 `{ id, pos, progress, alive }` 로 생성. 일치.
- `MergeCandidate` — Task 10 정의 `{ id, key, level }`, Task 16에서 동일. 일치.
- `starsFor(livesLeft, livesStart, thresholds, won)` — Task 18 Step 3 구현과 Step 6 호출 인자 순서 일치.
- `recordResult(stageId, stars, nextStageId, storage?)` — Task 3 정의, Task 18 Step 6 호출 `recordResult(this.stage.id, stars, nextStageId(this.stage.id), )` 의 trailing 콤마는 제거할 것(3인자 호출).
- `EconomyManager.sellRefund(totalInvested)` — Task 6 정의, Task 16 `confirmSell` 에서 `cumulativeCost(getTower(t.key), t.level)` 전달. `cumulativeCost` 는 Task 7 정의. 일치.
- `HudInit` — Task 12 정의 후 Task 17에서 `onToggleSpeed`, `onTogglePause` 추가. Task 17 Step 1에 인터페이스 확장 명시.

수정 사항(실행자 유의):
- Task 18 Step 6의 `recordResult(..., )` → `recordResult(this.stage.id, stars, nextStageId(this.stage.id))`.
- Task 12 Step 5의 `this.waves.update(dtMsRaw)` → `this.waves.update(dtMs)`.

---

## Execution Handoff

계획 완료. `docs/superpowers/plans/2026-08-30-merge-tower-defense.md` 에 저장됨.

두 가지 실행 방식:

1. **Subagent-Driven (추천)** — 태스크마다 새 서브에이전트를 띄우고, 태스크 사이에 리뷰. 빠른 반복.
2. **Inline Execution** — 이 세션에서 순차 실행, 체크포인트마다 리뷰.

어느 쪽으로 할까요?
