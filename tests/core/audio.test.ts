import { SoundEffects, type SoundBackend } from '../../src/core/audio';

function fixture(saved: string | null = null) {
  const played: string[] = [];
  let stops = 0;
  let available = true;
  let now = 0;
  const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
  const backend: SoundBackend = {
    play: (key) => { if (!available) return false; played.push(key); return true; },
    stopAll: () => { stops++; },
  };
  const audio = new SoundEffects(backend, () => now, storage);
  return { audio, played, storage, backend, advance: (ms: number) => { now += ms; },
    unavailable: () => { available = false; }, available: () => { available = true; }, stops: () => stops };
}

it('limits overlapping repeated shots using real time, without suppressing other tower sounds', () => {
  const f = fixture();
  f.audio.play('arrow'); f.audio.play('arrow'); f.audio.play('cannon');
  expect(f.played).toEqual(['arrow', 'cannon']);
  f.advance(200); f.audio.play('arrow');
  expect(f.played).toEqual(['arrow', 'cannon', 'arrow']);
});

it('muting stops current effects, suppresses new ones, and persists across controllers', () => {
  const f = fixture();
  f.audio.play('merge'); f.audio.toggle(); f.audio.play('clear');
  expect(f.stops()).toBe(1);
  expect(f.played).toEqual(['merge']);
  const restored = new SoundEffects(f.backend, () => 0, f.storage);
  expect(restored.muted).toBe(true);
  restored.toggle(); restored.play('clear');
  expect(f.played).toEqual(['merge', 'clear']);
});

it('storage failures never interrupt gameplay or the in-memory mute setting', () => {
  const f = fixture();
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  const audio = new SoundEffects(f.backend, () => 0, denied);
  expect(() => audio.toggle()).not.toThrow();
  expect(audio.muted).toBe(true);
  audio.play('wave');
  expect(f.played).toEqual([]);
});

it('a failed or locked playback does not consume the next audible cue', () => {
  const f = fixture();
  f.unavailable(); f.audio.play('arrow');
  f.available(); f.audio.play('arrow');
  expect(f.played).toEqual(['arrow']);
});

it('stopping combat clears rate limits before the next scene', () => {
  const f = fixture();
  f.audio.play('wave'); f.audio.stop(); f.audio.play('wave');
  expect(f.stops()).toBe(1);
  expect(f.played).toEqual(['wave', 'wave']);
});
