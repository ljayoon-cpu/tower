# 머지 타워디펜스 — 작업 가이드

세로형 모바일 머지 타워디펜스. Phaser 3 + TypeScript + Vite + Vitest, PWA-first.
이 파일은 어느 코딩 에이전트(Claude Code, Codex, Cursor 등)/세션이든 이어서 작업할 수 있도록
정리한 것이다. 방향과 남은 일은 [docs/ROADMAP.md](docs/ROADMAP.md).

**세계관**: 다크 판타지 — **태엽 군단(기계 적)** vs **마법 첨탑(타워)**. 적/타워 이름·연출·
배경은 [docs/world.md](docs/world.md)에 맞춘다. `key`는 코드 참조용이라 고정, `name`만 바꾼다.

## 여러 에이전트가 같이 작업할 때

- **브랜치를 나눠서 작업한다.** 같은 파일을 두 에이전트가 동시에 만지면 충돌. 기능 단위 브랜치 →
  GitHub PR 리뷰 후 `main`에 머지. `main` 직접 push 금지. 원격: `origin` = `https://github.com/ljayoon-cpu/tower`.
- 시작 전 `git pull` / `git fetch`로 최신 `main`을 받는다. 자기 전용 `git worktree`에서 작업.
- 한 기능 = 한 커밋. merge 커밋을 만들지 말고 `origin/main` 위로 rebase 후 PR.
- 커밋 전 `npm test` + `npm run build` 통과는 도구 공통 규칙.
- 커밋 트레일러: Claude Code는 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, 나머지는 관례대로.

### 담당 구역 (겹치면 밸런스가 흔들린다 — 넘기 전에 사람에게 물어볼 것)

| 구역 | 담당 | 파일 |
|---|---|---|
| **타워 수치·메커니즘·밸런스** | Codex (2026-08-31 사용자 지정) | `src/data/towers.ts`, `src/systems/combat.ts`, `src/systems/TargetingSystem.ts`, `tests/balance/**` |
| **적·몬스터·적 상태** | Codex | `src/data/enemies.ts`, `src/systems/EnemyState.ts`, `src/entities/Enemy.ts` |
| **스테이지·맵·웨이브** | 지정된 담당 | `src/data/stages/**` |
| 씬·HUD·UI·연출 | 지정된 담당 | `src/scenes/**`, `src/ui/**` |

- 타워를 바꾸면 적 밸런스가 흔들리고 그 반대도 마찬가지다. **자기 구역 밖 파일을 수정해야 하면
  먼저 사람에게 확인**받고, 상대 담당이 최근에 그 파일을 만졌는지 `git log`로 본다.
- 밸런스에 영향 주는 변경(타워/적 수치, 스테이지 웨이브)은 `tests/balance/`(`balance.test.ts`,
  `monoTower.test.ts`)를 돌려 회귀를 확인하고, 필요하면 스테이지를 재조정한 뒤 머지한다.

## 현재 상태 (2026-08-31)

- `main`에 전체 코드. Task 1~22 + 가독성/손맛 패스 + 메타 진행(강화 상점) 완료.
- **무한 모드**(`src/data/endless.ts`, `save.endlessBest`) — 절차적 무한 웨이브.
- **타워 9종** — 기존 6종 + 레이저(`beam`, 집중 램프)·지휘탑(`support`, 주변 버프)·
  금광탑(`support`, 골드 생성). 초기 수치는 Claude 스캐폴딩, **밸런싱은 Codex**.
  램프/버프 순수 함수는 `src/systems/combat.ts`(`beamDamage`, `buffMultiplier`, `buildMultiShot`).
- **머지 3·5합 능력** 6종 전부 완료 — `src/data/mergeEffects.ts` 한 파일에 테이블.
  화살 멀티샷·대포 방어구 파괴는 `TowerLevelStats` 필드(towers.ts). Codex 브랜치 5개 재구현·병합됨.
- 실기기(안드로이드/iOS) 검증은 아직 안 됨.

## 명령어

```bash
npm i
npm run dev          # vite 개발 서버 (localhost:5173)
npm test             # vitest 1회 실행 — 커밋 전 항상
npm run build        # tsc --noEmit + vite build + PWA 생성
npm run sfx:generate # public/sfx/*.wav 재생성 (scripts/generate-sfx.mjs)
BALANCE_EXPLORE=1 npm test   # 밸런스 수치 후보 비교 (docs/balance-exploration.json 출력)
```

Node 24, npm. `dist/`, `dev-dist/`, `docs/balance-*.json`은 git 제외.

## 아키텍처 (핵심 규칙)

**로직과 렌더를 분리한다.** 게임 규칙은 Phaser 없이 순수 TS로, 렌더/입력만 Phaser.

```
src/
  core/      순수. 타입, eventBus, rng, save(localStorage), stars, pool,
             towerInfo(DPS 계산), waveInfo, audio, constants
  systems/   순수. GridManager, PathManager, WaveManager, EconomyManager,
             TargetingSystem, MergeController, combat(체인 데미지)
  data/      순수 상수. towers.ts(성장 수치), enemies.ts, stages/stage-1-*.ts
  entities/  Phaser 래퍼. Enemy, Tower, Projectile — 규칙 없음, 상태를 스프라이트에 반영
  scenes/    Boot→Preload→MainMenu→StageSelect→Game(+HUD 오버레이)→Result
  ui/        BuildMenu, textures(도형 generateTexture), audio(SoundEffects 래퍼)
```

- **`src/core`, `src/systems`는 `phaser`를 import 하지 않는다.** `tests/architecture.test.ts`가 강제.
- 시스템은 시간 API를 직접 만지지 않고 `dtMs`를 인자로 받는다 (1x/2x 배속, 시뮬레이션 결정성).
- 밸런싱 매직넘버는 `src/data/`에만. 시스템 코드엔 두지 않는다.
- 씬 간 통신은 `createEventBus<GameEvents>()` (`src/core/eventBus.ts`, `GameEvents`는 `src/core/types.ts`).
- 좌표: 타일 `{col,row}`(`TileCoord`)과 픽셀 `{x,y}`(`Vec2`)를 타입으로 구분. `TILE=64`, 그리드 11×20.
- 저장 키 프리픽스 `mtd:`. `save.ts`는 차단·손상된 localStorage에서도 안 죽는다.

## 검증 방법

1. **항상 `npm test` + `npm run build`** 를 커밋 전에 통과시킨다.
2. **밸런스 회귀:** `tests/balance/balance.test.ts` — Phaser 없이 전투를 시뮬레이션한다.
   단언: "방어 안 함"은 전 스테이지 전패 / 마지막 스테이지에서 단일 화살 머지 빌드는
   승리하지 못한다. 적 특성의 카운터가 필요한 후반 조합을 유지한다. 타워 수치를
   건드리면 여기부터 확인. 표 출력: `npx vitest run tests/balance/balance.test.ts --reporter=verbose`.
3. **브라우저:** `npm run dev` 후 확인. 모바일 세로로 보려면 뷰포트를 420×840 정도로.

### 브라우저 검증 주의 (겪은 함정)

- Phaser는 **탭/창이 숨겨지면 requestAnimationFrame을 멈춘다.** 화면이 안 보이면
  게임 루프가 진행되지 않는다. 자동화로 확인할 땐 창을 앞에 두거나,
  JS로 루프를 수동 펌프: `setInterval(()=>window.__game.loop.step(performance.now()), 16)`
  (`__game`은 DEV 빌드에서 `window`에 노출됨 — `src/main.ts`).
- **씬을 JS로 함부로 start 하지 마라.** 씬 자신의 ScenePlugin으로 전이해야 이전 씬이 멈춘다.
  잘못하면 `mainmenu` 씬이 안 멈추고 게임 위에 겹쳐 렌더되어 "타일에 대각선 줄 +
  화면 중앙 깨진 텍스트 + 떠도는 노란 화살표" 처럼 보인다. 렌더 버그가 아니라 씬 스택 오염이다.
  `getScenes(true)`로 활성 씬 확인, 불필요한 씬은 `scene.stop(key)`.
- 실제 버튼 클릭 흐름(MainMenu → StageSelect → Game)은 정상.

## 컨벤션

- TypeScript strict. `any` 금지(불가피하면 사유 주석). `noUnusedLocals/Parameters` 켜져 있음.
- 커밋: Conventional Commits(`feat:` `fix:` `chore:` `docs:` `balance:`). 기능 단위로.
- Windows 체크아웃이라 `git add` 시 CRLF 경고가 뜨지만 무해하다.
- 새 엔티티/씬에 Phaser 오브젝트를 추가하면 **`tests/balance/harness.ts`의 가짜 씬**
  (`DisplayObject`, `add.image/circle/graphics`)과 엔티티 단위 테스트의 가짜 씬에도
  no-op 메서드를 맞춰줘야 시뮬레이션이 안 깨진다.

## 밸런스 철학

머지(자리 합쳐 레벨↑)가 이 게임의 정체성이다. 머지 비용은 레벨마다 2배(2^(n-1)×설치비)지만
데미지는 그보다 가파르게 오르도록 `src/data/towers.ts`를 맞춰서, "넓게 깔기"보다
"몇 기를 높게 쌓기"가 골드당 화력이 세고 탱커·보스를 녹일 수 있게 했다. 스테이지 뒤로 갈수록
보스 비중을 키워 이 선택을 강제한다. 판매 환급은 투자액 비례 — 그 레벨까지 부은 골드 총액
(`cumulativeCost = 설치비 × 2^(레벨-1)`)의 60%(+메타). 강화비 == 머지비라 어느 쪽으로 올려도 환급 동일.
난이도는 임의로 완화하지 않는다(사용자 확정, [docs/verification-2026-08-31.md](docs/verification-2026-08-31.md)).
