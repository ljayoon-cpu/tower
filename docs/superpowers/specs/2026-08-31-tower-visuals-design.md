# Tower Visual Production Design

**Date:** 2026-08-31

## Goal

Replace the procedural tower placeholders with immediately readable, compact
fantasy-spire artwork. Every tower must communicate its combat role before a
player opens the inspect panel, and each attack must have a distinct visible
wind-up and release.

## Constraints

- Do not change tower or enemy numerical data, wave data, combat targeting, or
  balance simulation behavior.
- Work only in a `C:\\Users\\uon10\\Desktop\\game-codex-*` worktree on a
  `codex/` branch. Never push or merge directly to `main`.
- One production batch is one conventional commit and one PR.
- Each production PR adds at most 200 KB to the PWA.
- `npm test`, `npm run build`, and `tests/balance/balance.test.ts` must pass
  before every production commit.
- Sustain 60 fps with 100 active enemies on a mid-range Android device.

## Visual Language

The defenders are magic spires opposing a dark clockwork army. Towers use a
single clean silhouette, a large functional object, and a role color. The base
is dark stone so the functional object is readable on every world background.
Generated art is flattened to compact, alpha-background sprite sheets.

| Tower | Role signal | Palette | Idle / attack pose |
|---|---|---|---|
| 화살탑 | crystal bow | cyan, silver | string breathes / bow bends and releases |
| 파열탑 | rune mortar | brass, orange | furnace flickers / barrel recoils |
| 서리탑 | snow crystal | ice blue, white | crystal glints / petals open and launch ice |
| 번개탑 | storm coil | violet, electric blue | arc crawls / coil compresses and discharges |
| 저격탑 | long rune rifle | gold, amber | lens focuses / muzzle flash and rear recoil |
| 역병탑 | poison vial | emerald, acid green | fluid bubbles / vial tips and spits a flask |
| 마광탑 | prism emitter | magenta, rose | core rotates / core expands while beam is held |
| 지휘탑 | command banner | gold, ivory | banner waves / halo expands to bless allies |
| 연금탑 | alchemy crucible | lime, brass | bubbles rise / flask pops with a coin sparkle |
| 창공탑 | winged ballista | sky blue, navy | wings flex / bowstring snaps and launches a spear |

## Animation Contract

Each tower image is a four-cell horizontal sprite sheet with 64 px square
cells: `idle-1`, `idle-2`, `attack-windup`, `attack-release`. Idle alternates
at a low cadence. When an attack begins, the entity switches to windup, then
release, then returns to idle after 140 ms. Beam towers hold release while the
beam is active; support towers use the same release cell for their pulse.

The sprite sheet is rendered at the existing tower footprint. No visual frame
changes game position, hit timing, projectile damage, range, attack speed, or
targeting.

## Projectile and Hit Presentation

Existing projectile texture keys remain the gameplay-facing interface. Their
rendering gains only visual motion: arrow and spear rotate to travel direction;
cannon and poison leave a small fading trail; frost leaves ice motes; bolt and
laser pulse their light. A hit burst uses the existing reusable effect path,
with at most six short-lived particles. All effect objects are reused or
destroyed by Phaser after a short lifetime; per-frame allocations and new
physics bodies are prohibited.

## Implementation Boundary

`src/data/towers.ts`, `src/data/enemies.ts`, combat systems, and stage data are
out of scope. The production implementation may change the following rendering
boundary only:

- `public/art/towers/*.png`: compressed source-derived tower sprite sheets.
- `src/scenes/Preload.ts`: load the sheets using stable `tower_*_sheet` keys.
- `src/ui/textures.ts`: keep small fallback/projectile textures and remove only
  replaced tower placeholder textures.
- `src/entities/Tower.ts`: choose idle and attack frames through a visual-only
  `playAttack()` method and never alter combat state.
- `src/entities/Projectile.ts` and `src/scenes/Game.ts`: apply display-only
  rotation, trails, and hit effects without modifying hit resolution.
- `tests/balance/harness.ts`: add no-op display methods only if a newly used
  Phaser display API is not represented by the fake scene.

## Delivery Batches

1. **Core launchers:** 화살탑, 파열탑, 서리탑. One commit and PR.
2. **Elemental precision:** 번개탑, 저격탑, 역병탑. One commit and PR.
3. **Persistent and support:** 마광탑, 지휘탑, 연금탑, 창공탑. One commit and PR.

Every batch contains its own art, frame loading, runtime integration, and
verification. Later batches must not depend on unmerged later artwork.

## Acceptance Checks

- A new player can identify slow, splash, chain, poison, beam, support, gold,
  and long-range roles from silhouette and color alone.
- Every implemented tower visibly transitions through an attack pose at the
  existing combat trigger.
- Existing projectile behavior and all balance tests remain unchanged.
- The production build remains successful and the compressed assets in a batch
  total no more than 200 KB.
