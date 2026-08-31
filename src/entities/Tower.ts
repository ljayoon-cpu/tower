import Phaser from 'phaser';
import type { TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { getTower } from '../data/towers';
import { COLORS, TILE } from '../core/constants';
import { TARGET_PRIORITIES } from '../systems/TargetingSystem';
import type { TargetPriority } from '../systems/TargetingSystem';

let nextId = 1;

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
    this.ring = scene.add
      .circle(pos.x, pos.y, this.stats().range, 0xffffff, 0.05)
      .setStrokeStyle(1, 0xffffff, 0.25)
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

  private applyLevelVisual(): void {
    const scale = 1 + (this.level - 1) * 0.12;
    this.sprite.setScale(scale);
    this.sprite.setData('level', this.level);
    this.ring.setRadius(this.stats().range);
  }

  get rangeVisible(): boolean {
    return this.ring.visible;
  }

  showRange(v: boolean): void {
    this.ring.setVisible(v);
  }

  /** 스프라이트를 표적 쪽으로 회전. 원형(대포)은 회전이 무의미하므로 제외. */
  faceToward(target: Vec2): void {
    if (this.key === 'cannon') return;
    this.sprite.setRotation(
      Math.atan2(target.y - this.sprite.y, target.x - this.sprite.x) + Math.PI / 2,
    );
  }

  cyclePriority(): TargetPriority {
    const i = TARGET_PRIORITIES.indexOf(this.priority);
    this.priority = TARGET_PRIORITIES[(i + 1) % TARGET_PRIORITIES.length];
    return this.priority;
  }

  /** 드래그 중 유효한 머지 대상임을 알리는 초록 링. */
  showMergeHint(v: boolean): void {
    this.mergeHint.setVisible(v);
  }

  destroy(): void {
    this.sprite.destroy();
    this.ring.destroy();
    this.mergeHint.destroy();
  }
}

void COLORS;
