// 도감(Codex) 텍스트 — 처음 하는 사람이 타워·적의 역할·상성을 한눈에 알도록.
// 수치는 towers.ts/enemies.ts 에서 읽고, 여기엔 사람이 읽는 설명만 둔다. key 는 고정.

import { TOWER_KEYS, getTower } from '../data/towers';
import { getEnemy } from '../data/enemies';
import { towerInfo } from './towerInfo';

export interface TowerCodexEntry {
  key: string;
  role: string;      // 한 줄 정체성
  strong: string;    // 잘 잡는 것 / 장점
  weak: string;      // 약점
}

export interface EnemyCodexEntry {
  key: string;
  trait: string;     // 특성
  counter: string;   // 카운터 타워 / 대처법
}

export const TOWER_CODEX: TowerCodexEntry[] = [
  { key: 'arrow',   role: '기본 단발 화살. 싸고 무난한 주력.',            strong: '어디에나 통하는 만능. 3·5합에서 멀티샷.',        weak: '특출난 카운터가 없어 후반 단독으론 부족.' },
  { key: 'cannon',  role: '파열 룬 광역 폭발.',                           strong: '뭉친 스웜·장갑병(공성 골렘)을 한 번에.',          weak: '공중을 못 친다. 단일 화력·연사가 낮다.' },
  { key: 'frost',   role: '감속·빙결.',                                   strong: '추적 사냥개 등 빠른 적을 묶는다. 3·5합 빙결.',    weak: '직접 딜이 약해 혼자선 못 끝낸다.' },
  { key: 'bolt',    role: '연쇄 방전.',                                   strong: '역장 보병(방어막)을 무너뜨린다. 뭉친 적에 전이.', weak: '단일 대상 화력이 낮다.' },
  { key: 'sniper',  role: '초장거리 관통 단발.',                          strong: '장갑·보호막을 꿰뚫는다. 균열 조립기·보스에 강함.', weak: '연사가 느려 스웜에 약하다. 비싸다.' },
  { key: 'poison',  role: '부식 안개 지속 피해.',                         strong: '수복 그럽(재생)의 유일한 답. 스웜 갉기.',          weak: '단일 화력이 낮아 보스전은 혼자 못 끝낸다. 공중 못 침.' },
  { key: 'laser',   role: '집속 마력빔 — 한 대상을 계속 지질수록 강해진다.', strong: '보스·파쇄 전차를 녹인다. 공중 기함에도 강함.',   weak: '표적이 자주 바뀌는 스웜엔 램프가 안 쌓여 약하다.' },
  { key: 'command', role: '지원형 — 룬 각인.',                            strong: '사거리 안 아군 타워의 공격력·연사·사거리를 올린다.', weak: '직접 화력이 미미하다. 뭉쳐 지어야 값어치.' },
  { key: 'mine',    role: '경제형 — 마력을 금으로 치환.',                 strong: '초당 골드를 생성. 초반에 깔수록 후반 자금이 커진다.', weak: '직접 화력이 미미하고 방어를 늦게 세우게 된다.' },
  { key: 'ballista', role: '대공 전용 — 하늘을 겨눈 석궁.',               strong: '드론·비행정·공중 기함에 압도적(대공 배율).',       weak: '지상 표적엔 화력이 약하다.' },
];

export const ENEMY_CODEX: EnemyCodexEntry[] = [
  { key: 'normal',      trait: '태엽으로 걷는 기본 보병.',                       counter: '아무 타워나. 물량이 쌓이면 광역.' },
  { key: 'fast',        trait: '네 다리 추격 병기. 빠르고 물렁하다.',            counter: '서리탑으로 묶고 광역으로 쓸어라.' },
  { key: 'tank',        trait: '두꺼운 장갑. 정면 단발을 튕겨낸다.',             counter: '파열탑(광역) — 단발계는 잘 안 통한다.' },
  { key: 'shield',      trait: '에너지 방벽 발생기. 단발을 잘 막는다.',          counter: '번개탑(연쇄)이 방벽을 빠르게 깎는다.' },
  { key: 'regenerator', trait: '나노 수복 벌레. 순간 화력은 갉힌다.',            counter: '역병탑의 지속 피해만이 재생을 이긴다.' },
  { key: 'summoner',    trait: '이동식 조립 포탈. 계속 부하를 뱉는다.',          counter: '저격탑·마광탑으로 본체를 빨리 끊어라.' },
  { key: 'minion',      trait: '균열 조립기가 뱉는 잡졸. 직격 우선 방어.',       counter: '아무거나. 본체(균열 조립기)를 먼저.' },
  { key: 'splitter',    trait: '파괴되면 그 자리에서 조각 셋으로 분해된다.',     counter: '관통·저격으로. 광역은 조각까지 한 번에.' },
  { key: 'berserker',   trait: '손상되면 회로가 폭주해 이동속도가 폭증한다.',    counter: '감속이 잘 안 통한다. 사거리 밖에서 빨리 처치.' },
  { key: 'crusher',     trait: '준보스급 벽. 느리고 모든 공격을 반감한다.',      counter: '마광탑의 지속 집중빔이 정답.' },
  { key: 'boss',        trait: '군단 지휘 기갑. 체력 구간마다 돌격·재방벽·증원.', counter: '한 종류로는 못 뚫는다 → 마광탑 + 조합.' },
  { key: 'drone',       trait: '낮게 나는 감시 드론 편대. 물렁하고 빠르다. (공중)', counter: '창공탑. 없으면 화살·저격·번개.' },
  { key: 'gunship',     trait: '장갑 두른 공중 포대. 느리고 단단하다. (공중)',   counter: '창공탑 + 저격탑. 파열탑·역병탑은 못 친다.' },
  { key: 'carrier',     trait: '격추되면 지상 잡졸 셋을 떨군다. (공중)',         counter: '창공탑으로 격추하고 지상 커버도 같이.' },
  { key: 'airboss',     trait: '월드 3 피날레. 급강하·편대 전개. (공중)',        counter: '창공탑 집중 + 마광탑. 대공 화력이 필수.' },
];

/** 도감 카드에 표시할 타워 요약(수치 포함). */
export function towerCard(key: string): {
  name: string; cost: number; dps: number; range: number; fireRate: number;
  note: string; role: string; strong: string; weak: string;
} {
  const def = getTower(key);
  const info = towerInfo(key, 1);
  const c = TOWER_CODEX.find((e) => e.key === key);
  return {
    name: def.name, cost: def.cost, dps: info.dps, range: info.range, fireRate: info.fireRate,
    note: info.note, role: c?.role ?? '', strong: c?.strong ?? '', weak: c?.weak ?? '',
  };
}

/** 도감 카드에 표시할 적 요약(수치 + 특성 태그). */
export function enemyCard(key: string): {
  name: string; hp: number; speed: number; tags: string[]; trait: string; counter: string;
} {
  const def = getEnemy(key);
  const c = ENEMY_CODEX.find((e) => e.key === key);
  const tags: string[] = [];
  if (def.isBoss) tags.push('보스');
  if ((def.movementLayer ?? 'ground') === 'air') tags.push('공중');
  if (def.armor) tags.push(`장갑 ${def.armor}`);
  if (def.shield) tags.push('방어막');
  if (def.regenPerSecond) tags.push('재생');
  if (def.deathSpawn) tags.push('분열');
  if (def.rageBelow != null) tags.push('광폭화');
  if (def.summon) tags.push('소환');
  return {
    name: def.name, hp: def.hp, speed: def.speed, tags,
    trait: c?.trait ?? '', counter: c?.counter ?? '',
  };
}

export const CODEX_TOWER_KEYS = TOWER_KEYS;
export const CODEX_ENEMY_KEYS = ENEMY_CODEX.map((e) => e.key);
