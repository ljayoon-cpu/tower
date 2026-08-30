import { SAVE_KEY } from './constants';
import type { SaveData } from './types';

export type StorageLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
};

function defaultStorage(): StorageLike {
  if (typeof localStorage !== 'undefined') return localStorage;
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
  };
}

export function loadSave(storage: StorageLike = defaultStorage()): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { stages: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as { stages?: unknown }).stages === 'object' &&
      (parsed as { stages?: unknown }).stages !== null
    ) {
      return parsed as SaveData;
    }
    return { stages: {} };
  } catch {
    return { stages: {} };
  }
}

export function writeSave(data: SaveData, storage: StorageLike = defaultStorage()): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function isUnlocked(data: SaveData, stageId: string): boolean {
  if (stageId === '1-1') return true;
  return data.stages[stageId]?.unlocked ?? false;
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
