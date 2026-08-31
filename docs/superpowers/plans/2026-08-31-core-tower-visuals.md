# Core Tower Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give 화살탑, 파열탑, and 서리탑 compact four-frame art and an attack-pose transition without changing combat behavior.

**Architecture:** Preload three 256×64 tower sheets under their existing `tower_*` texture keys so menu icons and merge feedback retain frame zero automatically. `Tower` stays an image wrapper and changes its display frame only; `Game` signals attacks and advances display timing alongside the existing combat loop.

**Tech Stack:** Phaser 3, TypeScript strict mode, Vite PWA, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-tower-visuals-design.md`

## Global Constraints

- Do not change tower or enemy numerical data, wave data, combat targeting, or balance simulation behavior.
- Work only in `C:\\Users\\uon10\\Desktop\\game-codex-tower-visuals-wave-1` on `codex/tower-visuals-wave-1`; never push or merge directly to `main`.
- This production batch is one conventional commit and one PR.
- New PWA assets total at most 200 KB.
- `npm test`, `npm run build`, and `tests/balance/balance.test.ts` must pass before the production commit.
- Sustain 60 fps with 100 active enemies on a mid-range Android device.

---

## File Structure

| File | Responsibility |
|---|---|
| `public/art/towers/arrow-tower-sheet-v1.png` | 4×64 px cyan crystal-bow idle/windup/release sheet. |
| `public/art/towers/cannon-tower-sheet-v1.png` | 4×64 px brass rune-mortar idle/windup/recoil sheet. |
| `public/art/towers/frost-tower-sheet-v1.png` | 4×64 px ice-crystal idle/open/release sheet. |
| `src/scenes/Preload.ts` | Load the three sheets using the existing `tower_arrow`, `tower_cannon`, and `tower_frost` keys. |
| `src/ui/textures.ts` | Stop procedurally generating only the three replaced tower keys; retain the seven remaining tower and all projectile fallback textures. |
| `src/entities/Tower.ts` | Store a visual attack timer; select sheet frames 0–3 without changing combat fields. |
| `src/scenes/Game.ts` | Advance tower visuals each update and call `playAttack()` precisely after a target is acquired and the existing cooldown is assigned. |
| `tests/entities/Tower.test.ts` | Verify attack frame progression and idle reset using a Phaser-shaped fake scene. |
| `tests/balance/harness.ts` | Add `setFrame()` to the display no-op so combat simulation remains renderer-independent. |

### Task 1: Define and test the visual-only tower frame contract

**Files:**
- Create: `tests/entities/Tower.test.ts`
- Modify: `src/entities/Tower.ts`
- Modify: `tests/balance/harness.ts`

**Interfaces:**
- Consumes: `Tower` constructor and `Tower.sprite` image wrapper.
- Produces: `Tower.playAttack(): void` and `Tower.updateVisual(dtMs: number): void`.

- [ ] **Step 1: Write the failing tower visual test**

```ts
it('shows windup, release, then returns to idle without changing its level', () => {
  const tower = new Tower(fakeScene, 'arrow', { col: 1, row: 1 }, { x: 64, y: 64 });
  tower.setLevel(3);
  tower.playAttack();
  expect(sprite.setFrame).toHaveBeenLastCalledWith(2);
  tower.updateVisual(75);
  expect(sprite.setFrame).toHaveBeenLastCalledWith(3);
  tower.updateVisual(90);
  expect(sprite.setFrame).toHaveBeenLastCalledWith(0);
  expect(tower.level).toBe(3);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run tests/entities/Tower.test.ts`

Expected: FAIL because `playAttack` and `updateVisual` are not defined.

- [ ] **Step 3: Add the minimal visual timer**

```ts
private attackVisualMs = 0;

playAttack(): void {
  this.attackVisualMs = 140;
  this.sprite.setFrame(2);
}

updateVisual(dtMs: number): void {
  if (this.attackVisualMs <= 0) return;
  this.attackVisualMs = Math.max(0, this.attackVisualMs - dtMs);
  this.sprite.setFrame(this.attackVisualMs > 70 ? 2 : this.attackVisualMs > 0 ? 3 : 0);
}
```

Keep this method display-only: it must not write `cooldownMs`, target state, position, level, damage, or range. Add the same `setFrame()` chainable no-op to `DisplayObject` in the balance harness.

- [ ] **Step 4: Run focused and regression tests**

Run: `npx vitest run tests/entities/Tower.test.ts tests/entities/Projectile.test.ts tests/balance/balance.test.ts`

Expected: PASS with no balance-report changes.

### Task 2: Load compressed sheets and bind them to existing tower texture keys

**Files:**
- Create: `public/art/towers/arrow-tower-sheet-v1.png`
- Create: `public/art/towers/cannon-tower-sheet-v1.png`
- Create: `public/art/towers/frost-tower-sheet-v1.png`
- Modify: `src/scenes/Preload.ts`
- Modify: `src/ui/textures.ts`

**Interfaces:**
- Consumes: 256×64 PNG tower sheets where frames 0–3 are idle-1, idle-2, windup, release.
- Produces: Phaser texture keys `tower_arrow`, `tower_cannon`, and `tower_frost`, each with a 64×64 frame grid.

- [ ] **Step 1: Produce source artwork and flatten it into the required sheets**

Generate isolated alpha-background art with four horizontally aligned 64 px cells. Preserve the generated source separately, crop only the three production sheets, and use lossless PNG optimization. The three final files must together be at most 200 KB.

- [ ] **Step 2: Load production sheets before `buildTextures` runs**

```ts
for (const [key, file] of [
  ['tower_arrow', 'arrow-tower-sheet-v1'],
  ['tower_cannon', 'cannon-tower-sheet-v1'],
  ['tower_frost', 'frost-tower-sheet-v1'],
] as const) {
  this.load.spritesheet(key, `art/towers/${file}.png`, { frameWidth: 64, frameHeight: 64 });
}
```

Remove only the procedural `generateTexture('tower_arrow' | 'tower_cannon' | 'tower_frost')` blocks, since a generated texture cannot replace a loaded texture with the same key. Leave all remaining texture generation untouched.

- [ ] **Step 3: Run build and check bundle asset size**

Run: `npm run build`

Expected: TypeScript compilation and PWA build pass. Run `Get-ChildItem public/art/towers -File | Measure-Object -Property Length -Sum` and verify the batch total is no more than `204800` bytes.

### Task 3: Trigger frames at the existing combat event

**Files:**
- Modify: `src/scenes/Game.ts`

**Interfaces:**
- Consumes: `Tower.updateVisual(dtMs)` and `Tower.playAttack()` from Task 1.
- Produces: all towers advance a visual timer, while the three new sheets enter attack poses only when their existing attacks are fired.

- [ ] **Step 1: Add display-only calls at stable points**

At the beginning of each `updateTowers` loop iteration, call `tower.updateVisual(dtMs)`. After target selection and `tower.cooldownMs = 1000 / s.fireRate`, call `tower.playAttack()` before the muzzle flash/projectile branches. Do not place it before target selection, and do not modify `ProjectileOpts`, damage callbacks, or hitstop code.

- [ ] **Step 2: Verify full behavior**

Run: `npm test; npm run build; npx vitest run tests/balance/balance.test.ts --reporter=verbose`

Expected: all tests and build pass; balance scenarios retain their existing pass/fail assertions.

- [ ] **Step 3: Capture evidence and commit the batch**

Run the game at 420×840, capture an idle and attack frame for each of the three towers, and record the three file sizes. Then commit exactly the listed batch files with:

```bash
git add public/art/towers src/scenes/Preload.ts src/ui/textures.ts src/entities/Tower.ts src/scenes/Game.ts tests/entities/Tower.test.ts tests/balance/harness.ts
git commit -m "feat: animate core tower visuals"
```
