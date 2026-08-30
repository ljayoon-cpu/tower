import { SOUND_ENABLED } from './constants';

export const SFX_KEYS = ['arrow', 'cannon', 'frost', 'bolt', 'hit', 'leak', 'place', 'merge', 'sell', 'wave', 'clear', 'lose', 'click'] as const;
export type SfxKey = typeof SFX_KEYS[number];
export interface SoundBackend {
  play(key: SfxKey): boolean;
  stopAll(): void;
}
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;
const MUTE_KEY = 'mtd:muted';
const INTERVAL: Record<SfxKey, number> = {
  arrow: 100, cannon: 160, frost: 140, bolt: 140, hit: 120, leak: 250,
  place: 70, merge: 100, sell: 100, wave: 300, clear: 1000, lose: 1000, click: 60,
};

function defaultStorage(): SettingsStorage | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; }
  catch { return undefined; }
}

/** Audio uses wall-clock time: 2x gameplay must not double pitch or overload speakers. */
export class SoundEffects {
  private lastPlayed = new Map<SfxKey, number>();
  private _muted = false;

  constructor(
    private readonly backend: SoundBackend,
    private readonly clock: () => number = () => performance.now(),
    private readonly storage: SettingsStorage | undefined = defaultStorage(),
  ) {
    try { this._muted = storage?.getItem(MUTE_KEY) === 'true'; } catch { /* optional storage */ }
  }

  get muted(): boolean { return this._muted; }

  toggle(): boolean {
    this._muted = !this._muted;
    if (this._muted) this.stop();
    try { this.storage?.setItem(MUTE_KEY, String(this._muted)); } catch { /* keep session setting */ }
    return this._muted;
  }

  play(key: SfxKey): void {
    if (!SOUND_ENABLED || this._muted) return;
    const now = this.clock();
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < INTERVAL[key]) return;
    try {
      if (this.backend.play(key)) this.lastPlayed.set(key, now);
    } catch { /* audio unavailable: gameplay still works */ }
  }

  stop(): void {
    this.backend.stopAll();
    this.lastPlayed.clear();
  }
}
