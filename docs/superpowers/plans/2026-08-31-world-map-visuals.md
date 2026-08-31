# World Map Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give chapters 1 and 2 clearly different, readable, mobile-safe battle maps without changing combat rules or stage data.

**Architecture:** A `WorldMapPainter` owns static, world-specific tile textures and map decoration. `Game.drawMap` asks it for the correct texture per existing `PATH` or `BUILDABLE` tile, while `WorldBackground` supplies the low-cost distant ambience. `StageSelect` reads the stage ID prefix only to decorate each existing card; it does not change unlock state or navigation.

**Tech Stack:** Phaser 3, TypeScript strict mode, Vite PWA, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-world-map-visuals-design.md`

## Global Constraints

* Keep `src/data/stages/**`, tower/monster data, combat systems, and all balance numbers unchanged.
* Add no raster art files and no runtime-updated terrain objects beyond the existing background drift layers.
* Limit static map decorations to 60 per 11×20 board and tile textures to four total.
* Preserve the 420×840 mobile layout and keep every interactive tile backed by its existing image object.
* Unknown world IDs must use chapter 1's theme.
* Run `npm test`, `npm run build`, and `npx vitest run tests/balance/balance.test.ts --reporter=dot` before the single feature commit.

---

### Task 1: Define world map themes and tile texture selection

**Files:**
- Create: `src/ui/worldMap.ts`
- Create: `tests/ui/worldMap.test.ts`

**Interfaces:**
- Produces: `WorldMapTheme`, `worldMapTheme(world: string): WorldMapTheme`, `worldTileTextureKey(world: string, tile: 'PATH' | 'BUILDABLE'): string`, and `WorldMapPainter`.
- Consumes: `TILE`, `GAME_WIDTH`, `GAME_HEIGHT`, `GRID_COLS`, and `GRID_ROWS` from `src/core/constants.ts`.

- [ ] **Step 1: Write the failing theme-selection test**

```ts
import { describe, expect, it } from 'vitest';
import { worldMapTheme, worldTileTextureKey } from '../../src/ui/worldMap';

describe('world map theme', () => {
  it('uses separate readable path tiles for chapters one and two', () => {
    expect(worldTileTextureKey('1', 'PATH')).toBe('world1_path');
    expect(worldTileTextureKey('2', 'PATH')).toBe('world2_path');
    expect(worldMapTheme('1').pathBase).not.toBe(worldMapTheme('2').pathBase);
  });

  it('falls back to chapter one for unknown worlds', () => {
    expect(worldMapTheme('99')).toEqual(worldMapTheme('1'));
    expect(worldTileTextureKey('99', 'BUILDABLE')).toBe('world1_buildable');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ui/worldMap.test.ts`

Expected: FAIL because `src/ui/worldMap.ts` does not exist.

- [ ] **Step 3: Implement the pure theme API and static painter**

```ts
export interface WorldMapTheme {
  pathBase: number;
  buildableBase: number;
  pathEdge: number;
  buildableEdge: number;
  accent: number;
}

export function worldMapTheme(world: string): WorldMapTheme {
  return MAP_THEMES[world] ?? MAP_THEMES['1'];
}

export function worldTileTextureKey(world: string, tile: 'PATH' | 'BUILDABLE'): string {
  const prefix = world === '2' ? 'world2' : 'world1';
  return `${prefix}_${tile.toLowerCase()}`;
}
```

`WorldMapPainter` creates only `world1_path`, `world1_buildable`, `world2_path`, and `world2_buildable` from `Graphics`, each 64×64. World 1 tiles use grass speckle or dirt/stone bands; world 2 tiles use cracked rock or riveted steel plus orange edge light. Its `drawDecorations(grid)` adds at most 60 static circles/rectangles behind the board using deterministic `(row * 11 + col)` modular checks.

- [ ] **Step 4: Run the focused test**

Run: `npx vitest run tests/ui/worldMap.test.ts`

Expected: PASS with two tests.

### Task 2: Integrate themed terrain into the battle board

**Files:**
- Modify: `src/scenes/Game.ts: drawMap`
- Modify: `tests/balance/harness.ts` only if the existing fake scene lacks a no-op Phaser method used by `WorldMapPainter`
- Test: `tests/ui/worldMap.test.ts`

**Interfaces:**
- Consumes: `WorldMapPainter`, `worldTileTextureKey`, and `TileType[][]` from the active `StageDef`.
- Produces: existing interactive board images with `world1_*` or `world2_*` texture keys and unchanged tile coordinates.

- [ ] **Step 1: Extend the focused test with texture key coverage**

```ts
it('keeps buildable and path texture keys inside each world namespace', () => {
  expect(worldTileTextureKey('1', 'BUILDABLE')).toBe('world1_buildable');
  expect(worldTileTextureKey('2', 'BUILDABLE')).toBe('world2_buildable');
});
```

- [ ] **Step 2: Run the test to verify the new assertion passes against the API**

Run: `npx vitest run tests/ui/worldMap.test.ts`

Expected: PASS; this protects the integration contract before `Game.drawMap` changes.

- [ ] **Step 3: Replace generic tile tinting with painter texture keys**

In `Game.drawMap`, derive `world` from `this.stage.id`, create `WorldMapPainter(this, world, this.stage.grid)`, call `drawDecorations`, then keep the existing tile loop and input behavior. Replace `this.add.image(..., 'tile').setTint(...)` with `this.add.image(..., worldTileTextureKey(world, t))`; retain `setDisplaySize(TILE - 2, TILE - 2)` and depth below towers.

If any new `Graphics` method is unavailable in the balance fake scene, add a no-op with the exact method name to `tests/balance/harness.ts`; do not change combat calculation paths.

- [ ] **Step 4: Run focused and balance verification**

Run: `npx vitest run tests/ui/worldMap.test.ts && npx vitest run tests/balance/balance.test.ts --reporter=dot`

Expected: PASS. The balance test may print its strategy table but reports one passing test.

### Task 3: Make the chapter distinction visible before play

**Files:**
- Modify: `src/scenes/StageSelect.ts: stage card creation`
- Test: `tests/ui/worldMap.test.ts`

**Interfaces:**
- Consumes: `worldMapTheme(world: string)` and existing `StageDef.id`.
- Produces: a non-interactive color rail and subtitle on each stage card, while `attachPressFeedback`, lock state, stars, and `fadeToScene` remain unchanged.

- [ ] **Step 1: Add a pure stage-label test**

```ts
import { worldLabel } from '../../src/ui/worldMap';

it('labels the two campaign worlds', () => {
  expect(worldLabel('1')).toBe('국경 성벽');
  expect(worldLabel('2')).toBe('붉은 용광로');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ui/worldMap.test.ts`

Expected: FAIL because `worldLabel` is not exported.

- [ ] **Step 3: Add the label helper and card treatment**

Export `worldLabel(world: string): string`, returning `국경 성벽` for world 1 and `붉은 용광로` for world 2, with world 1 fallback. In `StageSelect`, derive `world` once per card; add a 10px-wide non-interactive rectangle on the card's left edge using `worldMapTheme(world).accent`, and append the world label to the existing brief only for the first card of each world. Keep the new objects in the card container so scrolling and card visibility behave exactly as before.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/ui/worldMap.test.ts`

Expected: PASS with the theme, key, fallback, and label checks.

### Task 4: Verify mobile rendering and create the feature commit

**Files:**
- Modify: only files changed by Tasks 1–3
- Test: all existing tests

**Interfaces:**
- Consumes: implemented map painter and card label APIs.
- Produces: one feature commit that contains all map visuals and their tests.

- [ ] **Step 1: Start the app and inspect both worlds at mobile size**

Run: `npm run dev -- --host 127.0.0.1`.

Open the existing navigation flow at 420×840: Main Menu → Stage Select → `1-1`, then return and scroll to `2-1`. Verify both boards render the correct path/buildable distinction, all card rails remain aligned while scrolling, and browser console error logs are empty.

- [ ] **Step 2: Run final automated verification**

Run: `npm test && npm run build && npx vitest run tests/balance/balance.test.ts --reporter=dot`

Expected: all test files pass, TypeScript build completes, and the PWA build succeeds. Existing bundle-size advisory is informational only if it is unchanged except for generated code.

- [ ] **Step 3: Review and commit once**

Run: `git diff --check && git status --short`.

Commit only map-painter, game integration, stage-select, and test files in one feature commit:

```bash
git add src/ui/worldMap.ts src/scenes/Game.ts src/scenes/StageSelect.ts tests/ui/worldMap.test.ts tests/balance/harness.ts
git commit -m "feat: distinguish chapter battle maps"
```

Do not commit `dist/`, `node_modules/`, stage data, balance data, or generated PWA files.
