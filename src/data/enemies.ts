import type { EnemyDef } from '../core/types';

/**
 * 태엽 군단(적)은 하나의 수치만 큰 것이 아니라, 서로 다른 마법 첨탑 역할을 요구한다. 세계관은 docs/world.md.
 * `resist` 로 타워 공격 종류별 상성을 준다 — 적마다 뚜렷한 카운터 타워가 생긴다.
 * 스테이지는 같은 적의 배율을 올려 확장하므로 챕터가 늘어도 키와 규칙은 유지된다.
 */
export const ENEMIES: Record<string, EnemyDef> = {
  normal: {
    key: 'normal', name: '보병 오토마톤', hp: 60, speed: 70, bounty: 6, lifeDamage: 1, movementLayer: 'ground',
  },
  fast: {
    key: 'fast', name: '추적 사냥개', hp: 34, speed: 150, bounty: 7, lifeDamage: 1, movementLayer: 'ground',
    // 한 마리씩 겨냥하기 어렵다 — 감속·광역으로 잡아라.
    resist: { slow: 1.3, splash: 1.25, single: 0.85 },
  },
  tank: {
    key: 'tank', name: '공성 골렘', hp: 240, speed: 44, bounty: 16, lifeDamage: 2, movementLayer: 'ground', armor: 7,
    // 정면 단발·집중빔은 튕겨낸다. 폭발(대포)이 답.
    resist: { single: 0.55, beam: 0.7, splash: 1.35 },
  },
  shield: {
    key: 'shield', name: '역장 보병', hp: 110, speed: 62, bounty: 13, lifeDamage: 1, movementLayer: 'ground',
    shield: { energy: 90, rechargeDelayMs: 2800, rechargePerSecond: 22 },
    // 방어막이 단발을 잘 막는다. 연쇄(번개)가 막을 무너뜨린다.
    resist: { single: 0.7, chain: 1.5, splash: 1.15 },
  },
  regenerator: {
    key: 'regenerator', name: '수복 그럽', hp: 150, speed: 54, bounty: 15, lifeDamage: 2, movementLayer: 'ground', regenPerSecond: 11,
    // 순간 화력은 재생에 갉아먹힌다. 지속 피해(독)만이 이긴다.
    resist: { single: 0.8, splash: 0.8, beam: 0.85, poison: 1.7 },
  },
  summoner: {
    key: 'summoner', name: '균열 조립기', hp: 180, speed: 48, bounty: 20, lifeDamage: 2, movementLayer: 'ground',
    summon: { enemyKey: 'minion', intervalMs: 3200, maxAlive: 3 },
    // 소환 전에 빠르게 끊어야 — 집중빔·단발에 약하다.
    resist: { beam: 1.35, single: 1.15 },
  },
  minion: {
    key: 'minion', name: '조립 드론', hp: 24, speed: 92, bounty: 2, lifeDamage: 1, movementLayer: 'ground', intercepts: true,
  },
  splitter: {
    key: 'splitter', name: '분해 유닛', hp: 110, speed: 64, bounty: 11, lifeDamage: 1, movementLayer: 'ground',
    // 죽는 자리에서 세 조각으로 쪼개진다 — 폭딜 낭비를 처벌, 광역이 답.
    deathSpawn: { enemyKey: 'splitterling', count: 3 },
    resist: { splash: 1.25, single: 0.85, beam: 0.85 },
  },
  splitterling: {
    key: 'splitterling', name: '분해 파편', hp: 22, speed: 104, bounty: 2, lifeDamage: 1, movementLayer: 'ground',
    resist: { splash: 1.3 },
  },
  berserker: {
    key: 'berserker', name: '과부하 병기', hp: 140, speed: 58, bounty: 13, lifeDamage: 2, movementLayer: 'ground',
    // 체력이 절반 밑이면 미쳐 날뛴다 — 몰아쳐서 한 번에 끝내라.
    rageBelow: 0.5, rageSpeedMultiplier: 1.9,
    resist: { slow: 0.55, single: 0.9 },
  },
  crusher: {
    key: 'crusher', name: '파쇄 전차', hp: 950, speed: 30, bounty: 65, lifeDamage: 4, movementLayer: 'ground', armor: 14,
    poisonResist: 0.4,
    // 준보스급 벽. 한 종류로는 못 녹인다 — 지속 집중빔(레이저)이 그나마.
    resist: { single: 0.5, splash: 0.72, chain: 0.6, slow: 0.5, poison: 0.55, beam: 1.1 },
  },
  boss: {
    key: 'boss', name: '공성 지휘관', hp: 1800, speed: 90, bounty: 150, lifeDamage: 6, isBoss: true, movementLayer: 'ground', armor: 9,
    poisonResist: 0.3, // 중독만으로는 못 녹인다 — 직접 화력이 필요
    // 한 종류 스팸으로는 못 뚫는다. 지속 집중빔(레이저)이 정답.
    resist: { single: 0.65, splash: 0.78, chain: 0.7, slow: 0.8, poison: 0.6, beam: 1.15 },
    shield: { energy: 180, rechargeDelayMs: 3800, rechargePerSecond: 18 },
    bossPhases: [
      { name: '돌격', atHealthRatio: 0.65, speedMultiplier: 1.5 },
      {
        name: '최후 방어선', atHealthRatio: 0.35, speedMultiplier: 1.9, shieldRestoreRatio: 1,
        summon: { enemyKey: 'minion', count: 3 },
      },
    ],
  },
  drone: {
    key: 'drone', name: '정찰 비행체', hp: 26, speed: 120, bounty: 4, lifeDamage: 1,
    movementLayer: 'air',
    resist: { single: 0.9, chain: 1.15 },
  },
  gunship: {
    key: 'gunship', name: '포격 비행정', hp: 200, speed: 46, bounty: 18, lifeDamage: 3,
    movementLayer: 'air', armor: 4,
    resist: { single: 0.8, beam: 1.1, chain: 0.85 },
  },
  carrier: {
    key: 'carrier', name: '강하 수송선', hp: 260, speed: 40, bounty: 20, lifeDamage: 2,
    movementLayer: 'air',
    deathSpawn: { enemyKey: 'minion', count: 3 },
    resist: { single: 0.85, splash: 1.2 },
  },
  airboss: {
    key: 'airboss', name: '공중 기함', hp: 2200, speed: 70, bounty: 180, lifeDamage: 6,
    isBoss: true, movementLayer: 'air', armor: 6,
    poisonResist: 0.35,
    resist: { single: 0.7, chain: 0.75, beam: 1.1, slow: 0.85 },
    shield: { energy: 160, rechargeDelayMs: 3600, rechargePerSecond: 18 },
    bossPhases: [
      { name: '급강하', atHealthRatio: 0.6, speedMultiplier: 1.6 },
      { name: '편대 전개', atHealthRatio: 0.3, speedMultiplier: 1.9, shieldRestoreRatio: 1, summon: { enemyKey: 'drone', count: 4 } },
    ],
  },
};

export function getEnemy(key: string): EnemyDef {
  const e = ENEMIES[key];
  if (!e) throw new Error(`unknown enemy: ${key}`);
  return e;
}
