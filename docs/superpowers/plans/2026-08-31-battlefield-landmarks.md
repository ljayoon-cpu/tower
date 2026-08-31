# Battlefield Landmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add readable stage entrance, defense core, landmarks, boss arena treatment, and a chapter progress map without changing game rules.

**Architecture:** `WorldMapPainter` retains battle-map drawing and exposes pure deterministic helpers for tests. `Game.drawMap` draws the unchanged interactive tiles then stage decoration. `WorldProgressMap` renders a noninteractive route in StageSelect from existing stage IDs and save data.

**Tech Stack:** Phaser 3, TypeScript strict mode, Vitest, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-08-31-battlefield-landmarks-design.md`

## Global Constraints

* Do not modify tower, enemy, stage, combat, or balance data.
* Use Graphics only; add no raster files or update-loop terrain objects.
* Keep overlays beneath towers and combat sprites; preserve existing tile input and mobile layout.
* Run `npm test`, `npm run build`, and balance regression before one feature commit.

---

### Task 1: Test deterministic landmark selection

**Files:** `src/ui/worldMap.ts`, `tests/ui/worldMap.test.ts`

- [x] Add failing tests for world-specific landmark types and deterministic BUILDABLE cell selection.
- [x] Implement `battlefieldLandmarkKind(world, stageId)` and `landmarkCells(stageId, grid, limit)` with stable ID hashing.
- [x] Run `npx vitest run tests/ui/worldMap.test.ts`.

### Task 2: Render battlefield landmarks

**Files:** `src/ui/worldMap.ts`, `src/scenes/Game.ts`

- [x] Add `WorldMapPainter.drawStageLandmarks(stage)` for entrance, per-goal cores, up to four landmarks, and boss arena warning treatment.
- [x] Call it after the unchanged interactive tile loop.
- [x] Run focused and balance tests.

### Task 3: Render chapter progress map

**Files:** `src/ui/WorldProgressMap.ts`, `src/scenes/StageSelect.ts`

- [x] Render a connected themed node per unique chapter using existing stage IDs and save data.
- [x] Dim locked chapters and retain all existing card behavior.
- [x] Run full tests.

### Task 4: Verify and deliver

- [x] Inspect stage select and an unlocked battle at 420×840.
- [x] Run test, build, and balance regression.
- [ ] Squash task changes into one feature commit, rebase on the parent visual branch, push, and open a dependent PR.
