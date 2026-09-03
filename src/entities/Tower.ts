import Phaser from 'phaser';
import type { TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { getTower } from '../data/towers';
import { COLORS, TILE } from '../core/constants';
import { TARGET_PRIORITIES } from '../systems/TargetingSystem';
import type { TargetPriority } from '../systems/TargetingSystem';

let nextId = 1;
const ANIMATED_TOWER_KEYS = new Set(['arrow', 'cannon', 'frost', 'bolt', 'sniper', 'poison', 'laser', 'command', 'mine', 'ballista']);

/**
 * 배치된 타워 1기. Phaser 스프라이트 + 사거리 표시 링을 감싼 얇은 래퍼.
 * 발사/투사체 로직은 여기 없음 — Task 15 의 Game.updateTowers 가 담당.
 */
export class Tower {
  readonly id = nextId++;
  level = 1;
  /** 분기 타워(paths)의 선택 경로. Lv3 진입 시 확정된다. */
  path: 'a' | 'b' | null = null;
  /** 공명 충전 상태 — Game.recomputeCharged 가 매 배치 변경마다 갱신한다. 공명선·정보 시트용. */
  charged = false;
  /** 표적 우선순위. 플레이어가 선택 패널에서 순환시킨다. */
  priority: TargetPriority = 'first';
  /** 발사 쿨다운(ms). Task 15 에서 사용. */
  cooldownMs = 0;
  /** 전투와 무관한 공격 포즈 타이머. 4프레임 타워 시트에서만 의미가 있다. */
  private attackVisualMs = 0;
  /** beam(레이저탑): 현재 조준 중인 대상 id, 그 대상에 빔이 머문 시간(ms), 스파크 연출 타이머. */
  beamTargetId: number | null = null;
  beamLockMs = 0;
  beamFxMs = 0;
  beamTickMs = 0;
  /** 씬이 소유·갱신하는 지속 빔 그래픽. */
  beamGfx?: Phaser.GameObjects.Line;
  /** 씬이 소유하는 slowAura(빙결 경로 B) 반경 링 — 있으면 한 번만 그린다. */
  auraRing?: Phaser.GameObjects.Arc;
  /** support(금광탑): 골드 생성까지 누적된 시간(ms), 뜨는 숫자용 누적 골드. */
  goldTimerMs = 0;
  goldDisplayAcc = 0;
  readonly sprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Arc;
  private mergeHint: Phaser.GameObjects.Arc;
  /** 타일 중심 픽셀 좌표. 드래그 취소(머지 실패) 시 스냅백 대상. */
  readonly homePos: Vec2;

  constructor(
    scene: Phaser.Scene,
    readonly key: string,
    public tile: TileCoord,
    pos: Vec2,
  ) {
    this.homePos = { x: pos.x, y: pos.y };
    this.sprite = scene.add
      .image(pos.x, pos.y, `tower_${key}`)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    const buff = this.stats().buffRadius != null;
    this.ring = scene.add
      .circle(pos.x, pos.y, this.displayRadius(), buff ? COLORS.command : 0xffffff, buff ? 0.06 : 0.05)
      .setStrokeStyle(1, buff ? COLORS.command : 0xffffff, buff ? 0.5 : 0.25)
      .setDepth(9)
      .setVisible(false);
    this.mergeHint = scene.add
      .circle(pos.x, pos.y, TILE * 0.44, 0x7dd87d, 0.18)
      .setStrokeStyle(2, 0x7dd87d, 0.9)
      .setDepth(8)
      .setVisible(false);
    this.applyLevelVisual();

    // 드래그&드롭 머지(Task 16). 스냅백/드롭 판정은 Game 이 담당.
    scene.input.setDraggable(this.sprite);
    this.sprite.setData('towerId', this.id);
  }

  stats(): TowerLevelStats {
    const def = getTower(this.key);
    // 분기 타워(paths)는 Lv3~5 를 선택한 경로에서 고른다.
    if (this.level <= 2 || !def.paths || !this.path) {
      // Lv3+ 인데 path 가 비어 있으면 데이터 버그(setLevel 이 항상 채운다).
      // def.levels 는 길이 2 라 그대로 쓰면 undefined — 방어적으로 A 경로 폴백.
      if (this.level >= 3 && def.paths && !this.path) return def.paths.a.levels[this.level - 3];
      return def.levels[this.level - 1];
    }
    return def.paths[this.path].levels[this.level - 3];
  }

  get needsPathChoice(): boolean {
    const def = getTower(this.key);
    return !!def.paths && this.level === 2 && !this.path;
  }

  get maxLevel(): number {
    return getTower(this.key).maxLevel;
  }

  get pos(): Vec2 {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setLevel(n: number, path?: 'a' | 'b'): void {
    const clamped = Math.min(Math.max(n, 1), this.maxLevel);
    const def = getTower(this.key);
    if (clamped >= 3 && def.paths && !this.path) this.path = path ?? 'a';
    this.level = clamped;
    this.applyLevelVisual();
    if (this.path === 'b') {
      const s = this.sprite as Phaser.GameObjects.Image & { setTint?: (c: number) => unknown };
      s.setTint?.(0xffd9a0);
    }
  }

  /** 사거리 링에 그릴 반경. 지휘탑은 버프 반경(그게 정체성), 나머지는 공격 사거리. */
  private displayRadius(): number {
    const s = this.stats();
    return s.buffRadius ?? s.slowAuraRadius ?? s.range;
  }

  private applyLevelVisual(): void {
    // 레벨이 올라도 스프라이트 크기는 고정 — 커지면 화면이 어수선하고 타일 경계를 넘는다.
    this.sprite.setData('level', this.level);
    this.ring.setRadius(this.displayRadius());
  }

  get rangeVisible(): boolean {
    return this.ring.visible;
  }

  showRange(v: boolean): void {
    this.ring.setVisible(v);
  }

  /** 발사 직후 공격 프레임을 보여준다. 전투 수치·쿨다운에는 관여하지 않는다. */
  playAttack(): void {
    if (!ANIMATED_TOWER_KEYS.has(this.key)) return;
    this.attackVisualMs = 140;
    this.sprite.setFrame(2);
  }

  /** 공격 프레임을 windup → release → idle 순서로 진행한다. */
  updateVisual(dtMs: number): void {
    if (!ANIMATED_TOWER_KEYS.has(this.key) || this.attackVisualMs <= 0) return;
    this.attackVisualMs = Math.max(0, this.attackVisualMs - dtMs);
    this.sprite.setFrame(this.attackVisualMs > 70 ? 2 : this.attackVisualMs > 0 ? 3 : 0);
  }

  cyclePriority(): TargetPriority {
    const i = TARGET_PRIORITIES.indexOf(this.priority);
    this.priority = TARGET_PRIORITIES[(i + 1) % TARGET_PRIORITIES.length];
    return this.priority;
  }

  /** 빈 타일로 이동 배치. 레벨·비용은 그대로. */
  relocate(tile: TileCoord, pos: Vec2): void {
    this.tile = tile;
    this.homePos.x = pos.x;
    this.homePos.y = pos.y;
    this.sprite.setPosition(pos.x, pos.y).setDepth(10);
    this.ring.setPosition(pos.x, pos.y);
    this.mergeHint.setPosition(pos.x, pos.y);
  }

  /** 드래그 중 유효한 머지 대상임을 알리는 초록 링. */
  showMergeHint(v: boolean): void {
    this.mergeHint.setVisible(v);
  }

  destroy(): void {
    this.sprite.destroy();
    this.ring.destroy();
    this.mergeHint.destroy();
    this.beamGfx?.destroy();
    this.auraRing?.destroy();
  }
}

void COLORS;
