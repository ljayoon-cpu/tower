import type { StageDef } from '../../core/types';
import { stage11 } from './stage-1-1';
import { stage12 } from './stage-1-2';
import { stage13 } from './stage-1-3';
import { stage14 } from './stage-1-4';
import { stage15 } from './stage-1-5';

export const STAGES: StageDef[] = [stage11, stage12, stage13, stage14, stage15];
export const STAGE_IDS: string[] = STAGES.map((s) => s.id);

export function getStage(id: string): StageDef {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stage: ${id}`);
  return s;
}

export function nextStageId(id: string): string | null {
  const i = STAGE_IDS.indexOf(id);
  if (i < 0 || i >= STAGE_IDS.length - 1) return null;
  return STAGE_IDS[i + 1];
}
