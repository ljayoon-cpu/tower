import { SAVE_KEY } from './constants';
import type { SaveData } from './types';
import { coresForStars, type MetaState } from './meta';

export type StorageLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
};

const memory = new Map<string, string>();
const fallback: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); },
};

function defaultStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* Browser security settings can block the property itself. */ }
  return fallback;
}

export function loadSave(storage: StorageLike = defaultStorage()): SaveData {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { stages: {} };
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as { stages?: unknown }).stages === 'object' &&
      (parsed as { stages?: unknown }).stages !== null
    ) {
      const entries = (parsed as { stages: Record<string, unknown> }).stages;
      const extras = (data: SaveData): SaveData => {
        const p = parsed as { tutorialDone?: unknown; meta?: unknown; endlessBest?: unknown };
        if (p.tutorialDone === true) data.tutorialDone = true;
        if (typeof p.endlessBest === 'number' && Number.isFinite(p.endlessBest) && p.endlessBest > 0) {
          data.endlessBest = Math.floor(p.endlessBest);
        }
        const m = p.meta;
        if (m !== null && typeof m === 'object') {
          const { cores, upgrades } = m as { cores?: unknown; upgrades?: unknown };
          const clean: Record<string, number> = {};
          if (upgrades !== null && typeof upgrades === 'object') {
            for (const [k, v] of Object.entries(upgrades)) {
              if (typeof v === 'number' && Number.isFinite(v) && v > 0) clean[k] = Math.floor(v);
            }
          }
          data.meta = {
            cores: typeof cores === 'number' && Number.isFinite(cores) && cores >= 0 ? Math.floor(cores) : 0,
            upgrades: clean,
          };
        }
        return data;
      };
      const stages: SaveData['stages'] = {};
      if (Array.isArray(entries)) return extras({ stages });
      for (const [id, entry] of Object.entries(entries)) {
        if (entry === null || typeof entry !== 'object') continue;
        const { stars, unlocked } = entry as { stars?: unknown; unlocked?: unknown };
        if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 0 && stars <= 3 && typeof unlocked === 'boolean') {
          Object.defineProperty(stages, id, { value: { stars, unlocked }, enumerable: true, writable: true, configurable: true });
        }
      }
      return extras({ stages });
    }
    return { stages: {} };
  } catch {
    return { stages: {} };
  }
}

export function writeSave(data: SaveData, storage: StorageLike = defaultStorage()): void {
  try { storage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch { /* Storage unavailable/full: gameplay and result navigation still work. */ }
}

export function isUnlocked(data: SaveData, stageId: string): boolean {
  if (stageId === '1-1') return true;
  return data.stages[stageId]?.unlocked ?? false;
}

/** 튜토리얼 완료 플래그를 저장한다. */
export function markTutorialDone(storage: StorageLike = defaultStorage()): void {
  const data = loadSave(storage);
  data.tutorialDone = true;
  writeSave(data, storage);
}

export function loadMeta(storage: StorageLike = defaultStorage()): MetaState {
  return loadSave(storage).meta ?? { cores: 0, upgrades: {} };
}

/** 무한 모드 도달 웨이브를 기록한다(최고값 유지). 반환: 갱신된 최고값. */
export function recordEndless(wave: number, storage: StorageLike = defaultStorage()): number {
  const data = loadSave(storage);
  const best = Math.max(data.endlessBest ?? 0, Math.max(0, Math.floor(wave)));
  data.endlessBest = best;
  writeSave(data, storage);
  return best;
}

export function saveMeta(meta: MetaState, storage: StorageLike = defaultStorage()): void {
  const data = loadSave(storage);
  data.meta = meta;
  writeSave(data, storage);
}

export function recordResult(
  stageId: string,
  stars: number,
  nextStageId: string | null,
  storage: StorageLike = defaultStorage(),
): SaveData {
  const data = loadSave(storage);
  const prevStars = data.stages[stageId]?.stars ?? 0;
  data.stages[stageId] = {
    stars: Math.max(prevStars, stars),
    unlocked: true,
  };
  if (nextStageId && stars > 0) {
    const n = data.stages[nextStageId];
    data.stages[nextStageId] = { stars: n?.stars ?? 0, unlocked: true };
  }
  // 별점이 올랐으면 그 차액만큼 코어를 준다 (재도전 파밍 방지).
  const coreGain = coresForStars(Math.max(prevStars, stars)) - coresForStars(prevStars);
  if (coreGain > 0) {
    const meta = data.meta ?? { cores: 0, upgrades: {} };
    data.meta = { cores: meta.cores + coreGain, upgrades: meta.upgrades };
  }
  writeSave(data, storage);
  return data;
}
