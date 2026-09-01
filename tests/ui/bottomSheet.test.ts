import { describe, it, expect, vi } from 'vitest';
import type Phaser from 'phaser';
import { BottomSheet } from '../../src/ui/BottomSheet';

function fakeScene(): Phaser.Scene {
  const factory = () => {
    const o: Record<string, unknown> = {};
    for (const m of ['setDepth', 'setOrigin', 'setVisible', 'setStrokeStyle', 'setInteractive',
      'disableInteractive', 'setScale', 'setPosition', 'setStyle', 'setText', 'setAlpha', 'setColor',
      'removeAll', 'add', 'destroy', 'on', 'emit']) o[m] = () => o;
    o.list = [];
    o.width = 0;
    return o;
  };
  return {
    add: { container: factory, rectangle: factory, text: factory, image: factory },
    tweens: undefined,
  } as unknown as Phaser.Scene;
}

/**
 * fakeScene 과 같되 tweens 를 지연 실행하는 stub 으로 바꾼다: add() 는 설정을 쌓아두고
 * remove() 가능한 핸들을 돌려주며, flush() 를 부를 때 아직 살아있는 tween 의 onComplete 만 실행한다.
 * hide() 슬라이드아웃 완료가 그 사이 다시 열린 시트를 지우는 레이스를 재현하는 데 쓴다.
 */
function deferredTweenScene(): { scene: Phaser.Scene; flush: () => void } {
  const base = fakeScene() as unknown as Record<string, unknown>;
  const pending: Array<{ cfg: { onComplete?: () => void }; removed: boolean }> = [];
  base.tweens = {
    add: (cfg: { onComplete?: () => void }) => {
      const entry = { cfg, removed: false };
      pending.push(entry);
      return { remove: () => { entry.removed = true; } };
    },
  };
  const flush = (): void => {
    for (const e of pending) if (!e.removed) e.cfg.onComplete?.();
    pending.length = 0;
  };
  return { scene: base as unknown as Phaser.Scene, flush };
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

  it('setBottomInset before open does not throw and stays closed', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.setBottomInset(56);
    expect(s.isOpen).toBe(false);
  });

  it('refreshBuild is a no-op while closed', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(() => s.refreshBuild()).not.toThrow();
  });
});

describe('BottomSheet inspect mode', () => {
  const view = () => ({
    title: '화살탑 Lv2',
    lines: ['DPS 30 → 60', '사거리 162   연사 2.2/초'],
    upgrade: { label: '⬆ Lv3 강화  100G', afford: true },
    sell: { label: '⌫ 판매 +60G' },
  });

  it('shows inspect and swaps from build', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.showBuild();
    expect(s.mode).toBe('build');
    s.showInspect(view());
    expect(s.mode).toBe('inspect');
    expect(s.isOpen).toBe(true);
  });

  it('refreshInspect is a no-op unless in inspect mode', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(() => s.refreshInspect(view())).not.toThrow();
    s.showBuild();
    expect(() => s.refreshInspect(view())).not.toThrow();
    expect(s.mode).toBe('build');
  });

  it('handles a max-level tower (no upgrade)', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.showInspect({ ...view(), upgrade: null });
    expect(s.mode).toBe('inspect');
  });

  it('makes the upgrade + sell hit areas interactive', () => {
    // A Phaser GameObject with no input area emits no pointer events, so the
    // attachPressFeedback listeners would never fire in-game without setInteractive.
    let interactiveCalls = 0;
    const scene = fakeScene();
    const add = scene.add as unknown as { rectangle: () => Record<string, unknown> };
    const realRect = add.rectangle;
    add.rectangle = () => {
      const o = realRect();
      o.setInteractive = () => {
        interactiveCalls += 1;
        return o;
      };
      return o;
    };
    const s = new BottomSheet(scene, opts());
    s.showInspect(view());
    expect(interactiveCalls).toBeGreaterThanOrEqual(2); // upgrade hit + sell hit
  });
});

describe('BottomSheet slide-tween race', () => {
  const view = () => ({
    title: '화살탑 Lv2',
    lines: ['DPS 30 → 60', '사거리 162   연사 2.2/초'],
    upgrade: { label: '⬆ Lv3 강화  100G', afford: true },
    sell: { label: '⌫ 판매 +60G' },
  });

  it('a hide() slide-out completing after a re-show does not wipe the new sheet', () => {
    const { scene, flush } = deferredTweenScene();
    const s = new BottomSheet(scene, opts());
    s.showBuild();
    s.hide();              // 슬라이드아웃 onComplete 예약 (아직 실행 안 됨)
    s.showInspect(view()); // _mode -> 'inspect' 동기 반영, 대기 중 hide tween 취소
    flush();               // 남은 onComplete 실행 — 낡은 hide 정리는 no-op 이어야 한다
    expect(s.mode).toBe('inspect');
    expect(s.isOpen).toBe(true);
  });

  it('hide() then an immediate showBuild() stays in build mode (synchronous path)', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.showInspect(view());
    s.hide();
    s.showBuild();
    expect(s.mode).toBe('build');
    expect(s.isOpen).toBe(true);
  });

  it('two back-to-back hide() calls end hidden without a dangling slide (fix B)', () => {
    const { scene, flush } = deferredTweenScene();
    let visible = false;
    const add = scene.add as unknown as { container: () => Record<string, unknown> };
    const realContainer = add.container;
    add.container = () => {
      const c = realContainer();
      c.setVisible = (v: boolean) => { visible = v; return c; };
      return c;
    };
    const s = new BottomSheet(scene, opts());
    s.showInspect(view());   // 시트 열림 (visible === true)
    s.hide();                // 첫 슬라이드아웃 예약
    s.hide();                // 두 번째 hide — _mode 가 이미 null → 동기적으로 시각 상태 강제
    expect(s.isOpen).toBe(false);
    expect(visible).toBe(false);
    flush();                 // 남은 onComplete 실행 — 상태 그대로 유지
    expect(s.isOpen).toBe(false);
    expect(visible).toBe(false);
  });
});

describe('BottomSheet path mode', () => {
  it('path mode blocks build/inspect until resolved', () => {
    const o = opts();
    const s = new BottomSheet(fakeScene(), o);
    s.showPath('bolt');
    expect(s.mode).toBe('path');
    s.showBuild();
    expect(s.mode).toBe('path'); // 무시
    s.showInspect({ title: 'x', lines: [], upgrade: null, sell: { label: 'y' } });
    expect(s.mode).toBe('path'); // 무시
    expect(o.onPathPick).not.toHaveBeenCalled();
    s.hide();
    expect(s.mode).toBeNull();
    s.showBuild();
    expect(s.mode).toBe('build'); // 이제 가능
  });

  it('non-branched tower resolves to a immediately without opening', () => {
    const o = opts();
    const s = new BottomSheet(fakeScene(), o);
    s.showPath('laser'); // laser 는 paths 없음
    expect(o.onPathPick).toHaveBeenCalledWith('a');
    expect(s.isOpen).toBe(false);
  });

  it('backdrop tap dismisses without picking a path', () => {
    // buildPath wires the full-screen backdrop (first rectangle it adds) to hide + onDismiss.
    const o = opts();
    const scene = fakeScene();
    const add = scene.add as unknown as { rectangle: () => Record<string, unknown> };
    const realRect = add.rectangle;
    const handlers: Record<string, () => void> = {};
    let first = true;
    add.rectangle = () => {
      const r = realRect();
      if (first) {
        first = false;
        r.on = (ev: string, fn: () => void) => {
          handlers[ev] = fn;
          return r;
        };
        r.setInteractive = () => r;
      }
      return r;
    };
    const s = new BottomSheet(scene, o);
    s.showPath('bolt');
    expect(s.mode).toBe('path');
    handlers.pointerup?.();
    expect(o.onDismiss).toHaveBeenCalledTimes(1);
    expect(o.onPathPick).not.toHaveBeenCalled();
    expect(s.mode).toBeNull();
  });
});
