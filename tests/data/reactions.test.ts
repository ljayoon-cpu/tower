import { describe, expect, it } from 'vitest';
import { REACTIONS, elementOf, MARK_DURATION_MS } from '../../src/data/reactions';

describe('reactions data', () => {
  it('maps the four elemental towers and nothing else', () => {
    expect(elementOf('frost')).toBe('ice');
    expect(elementOf('bolt')).toBe('lightning');
    expect(elementOf('poison')).toBe('decay');
    expect(elementOf('cannon')).toBe('fire');
    for (const k of ['arrow', 'sniper', 'laser', 'command', 'mine', 'ballista']) {
      expect(elementOf(k)).toBeNull();
    }
  });

  it('has a reaction def per element with a positive cooldown', () => {
    for (const el of ['ice', 'lightning', 'decay', 'fire'] as const) {
      expect(REACTIONS[el].key).toBe(el);
      expect(REACTIONS[el].name.length).toBeGreaterThan(0);
      expect(REACTIONS[el].cooldownMs).toBeGreaterThan(0);
    }
  });

  it('mark duration is a sane positive window', () => {
    expect(MARK_DURATION_MS).toBeGreaterThanOrEqual(1000);
  });
});
