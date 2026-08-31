import type { StageDef } from '../../core/types';
import { stage11 } from './stage-1-1';
import { stage12 } from './stage-1-2';
import { stage13 } from './stage-1-3';
import { stage14 } from './stage-1-4';
import { stage15 } from './stage-1-5';
import { stage16 } from './stage-1-6';
import { stage17 } from './stage-1-7';
import { stage18 } from './stage-1-8';
import { stage21 } from './stage-2-1';
import { stage22 } from './stage-2-2';
import { stage23 } from './stage-2-3';
import { stage24 } from './stage-2-4';
import { stage25 } from './stage-2-5';
import { endlessStage, ENDLESS_STAGE_ID } from '../endless';

/** 캠페인 스테이지 (스테이지 선택 화면에 나오는 것). */
export const STAGES: StageDef[] = [
  stage11, stage12, stage13, stage14, stage15, stage16, stage17, stage18,
  stage21, stage22, stage23, stage24,
  stage25,
];
export const STAGE_IDS: string[] = STAGES.map((s) => s.id);

let endlessCache: StageDef | null = null;

export function getStage(id: string): StageDef {
  if (id === ENDLESS_STAGE_ID) return (endlessCache ??= endlessStage());
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stage: ${id}`);
  return s;
}

export function nextStageId(id: string): string | null {
  const i = STAGE_IDS.indexOf(id);
  if (i < 0 || i >= STAGE_IDS.length - 1) return null;
  return STAGE_IDS[i + 1];
}
