import { SAVE_KEY } from './constants';
import type { SaveData } from './types';

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
      const withFlag = (data: SaveData): SaveData =>
        (parsed as { tutorialDone?: unknown }).tutorialDone === true
          ? { ...data, tutorialDone: true }
          : data;
      const stages: SaveData['stages'] = {};
      if (Array.isArray(entries)) return withFlag({ stages });
      for (const [id, entry] of Object.entries(entries)) {
        if (entry === null || typeof entry !== 'object') continue;
        const { stars, unlocked } = entry as { stars?: unknown; unlocked?: unknown };
        if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 0 && stars <= 3 && typeof unlocked === 'boolean') {
          Object.defineProperty(stages, id, { value: { stars, unlocked }, enumerable: true, writable: true, configurable: true });
        }
      }
      return withFlag({ stages });
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

export function recordResult(
  stageId: string,
  stars: number,
  nextStageId: string | null,
  storage: StorageLike = defaultStorage(),
): SaveData {
  const data = loadSave(storage);
  const prev = data.stages[stageId];
  data.stages[stageId] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    unlocked: true,
  };
  if (nextStageId && stars > 0) {
    const n = data.stages[nextStageId];
    data.stages[nextStageId] = { stars: n?.stars ?? 0, unlocked: true };
  }
  writeSave(data, storage);
  return data;
}
