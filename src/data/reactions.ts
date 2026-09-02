import type { ElementKind } from '../core/types';
import { getTower } from './towers';

/** 각인 지속(ms). 재명중 시 도로 채운다. */
export const MARK_DURATION_MS = 2500;

export interface ReactionDef {
  key: ElementKind;
  /** 세계관 이름 — 정보 시트·이펙트 라벨용. */
  name: string;
  /** 적별·원소별 재발동 대기(ms). */
  cooldownMs: number;
}

export const REACTIONS: Record<ElementKind, ReactionDef> = {
  ice:       { key: 'ice',       name: '서리 붕괴', cooldownMs: 900 },
  lightning: { key: 'lightning', name: '정전 방출', cooldownMs: 800 },
  decay:     { key: 'decay',     name: '부식 파열', cooldownMs: 900 },
  fire:      { key: 'fire',      name: '과열 폭발', cooldownMs: 1000 },
};

/** 서리 붕괴 — 대상 최대체력 비례 순간타(장갑·저항 무시), 상한 있음 + 짧은 감속. */
export const FROST_COLLAPSE = {
  maxHpFraction: 0.05,
  flatCap: 220,
  slowMul: 0.85,
  slowDurationMs: 800,
} as const;

/** 정전 방출 — 기폭 지점 주변 소수에게 소형 연쇄. */
export const STATIC_DISCHARGE = {
  jumpRadius: 110,
  maxJumps: 3,
  flat: 40,
  detonatorRatio: 0.35,
} as const;

/** 부식 파열 — 남은 독을 순간 폭발 + 주변 약한 전염. */
export const CORROSION_BURST = {
  flat: 30,
  poisonDpsRatio: 2.0,
  spreadRadius: 70,
  spreadMaxTargets: 4,
  spreadDpsRatio: 0.5,
  spreadDurationMs: 1500,
} as const;

/** 과열 폭발 — 방어구 파괴 + 짧고 센 화상 + 기폭타 비례분. */
export const OVERHEAT = {
  armorBreakPercent: 0.25,
  armorBreakDurationMs: 2000,
  burnDps: 24,
  burnDurationMs: 1600,
  detonatorRatio: 0.4,
} as const;

/** 타워 key → 원소 (없으면 null). `getTower` 를 한 번 감싸 호출측을 짧게 한다. */
export function elementOf(towerKey: string): ElementKind | null {
  return getTower(towerKey).element ?? null;
}
