import Phaser from 'phaser';
import type { TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { getTower } from '../data/towers';
import { COLORS, TILE } from '../core/constants';
import { TARGET_PRIORITIES } from '../systems/TargetingSystem';
import type { TargetPriority } from '../systems/TargetingSystem';

let nextId = 1;
const SUPPORT_GLOW_TOWER_KEYS = new Set(['command', 'mine']);
const SUPPORT_GLOW_FRAMES = [0, 1, 2, 1] as const;
const SUPPORT_GLOW_FRAME_MS = 560;

/**
 * 배치된 타워 1기. Phaser 스프라이트 + 사거리 표시 링을 감싼 얇은 래퍼.
 * 발사/투사체 로직은 여기 없음 — Task 15 의 Game.updateTowers 가 담당.
 */
export class Tower {
  readonly id = nextId++;
  level = 1;
  /** 표적 우선순위. 플레이어가 선택 패널에서 순환시킨다. */
  priority: TargetPriority = 'first';
  /** 발사 쿨다운(ms). Task 15 에서 사용. */
  cooldownMs = 0;
  /** 지원탑의 제자리 광량 변화. 게임 배속이 아닌 실제 시간으로만 갱신한다. */
  private supportGlowMs = 0;
  /** beam(레이저탑): 현재 조준 중인 대상 id, 그 대상에 빔이 머문 시간(ms), 스파크 연출 타이머. */
  beamTargetId: number | null = null;
  beamLockMs = 0;
  beamFxMs = 0;
  beamTickMs = 0;
  /** 씬이 소유·갱신하는 지속 빔 그래픽. */
  beamGfx?: Phaser.GameObjects.Line;
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
    return getTower(this.key).levels[this.level - 1];
  }

  get maxLevel(): number {
    return getTower(this.key).maxLevel;
  }

  get pos(): Vec2 {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setLevel(n: number): void {
    this.level = Math.min(Math.max(n, 1), this.maxLevel);
    this.applyLevelVisual();
  }

  /** 사거리 링에 그릴 반경. 지휘탑은 버프 반경(그게 정체성), 나머지는 공격 사거리. */
  private displayRadius(): number {
    const s = this.stats();
    return s.buffRadius ?? s.range;
  }

  private applyLevelVisual(): void {
    const scale = 1 + (this.level - 1) * 0.12;
    this.sprite.setScale(scale);
    this.sprite.setData('level', this.level);
    this.ring.setRadius(this.displayRadius());
  }

  get rangeVisible(): boolean {
    return this.ring.visible;
  }

  showRange(v: boolean): void {
    this.ring.setVisible(v);
  }

  /** 지휘탑·금광탑은 이동이나 발사 자세 없이 광량만 천천히 바꾼다. */
  updateSupportGlow(realDtMs: number): void {
    if (!SUPPORT_GLOW_TOWER_KEYS.has(this.key)) return;
    this.supportGlowMs += Math.max(0, realDtMs);
    const frameIndex = Math.floor(this.supportGlowMs / SUPPORT_GLOW_FRAME_MS) % SUPPORT_GLOW_FRAMES.length;
    this.sprite.setFrame(SUPPORT_GLOW_FRAMES[frameIndex]);
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
  }
}

void COLORS;
