# 머지 타워디펜스 — 작업 가이드

세로형 모바일 머지 타워디펜스. Phaser 3 + TypeScript + Vite + Vitest, PWA-first.
이 파일은 어느 에이전트/세션이든 이어서 작업할 수 있도록 정리한 것이다.
방향과 남은 일은 [docs/ROADMAP.md](docs/ROADMAP.md)에 있다.

## 현재 상태 (2026-08-31)

- 브랜치: `feature/merge-td` (main보다 ~38커밋 앞섬). `main`에는 설계·계획 문서만 있다.
- 원본 계획 [docs/superpowers/plans/2026-08-30-merge-tower-defense.md](docs/superpowers/plans/2026-08-30-merge-tower-defense.md)의 Task 1~22 완료.
- 그 뒤 자율 개발분: 가독성 패스(체력바·타워 정보·웨이브 미리보기), 머지 대상 하이라이트,
  고레벨 타워 상향(머지 > 스프레드), 전투 손맛, 보스 체력바, 스테이지 1-6,
  스테이지 선택 개편, 표적 우선순위, 프로스트 오라.
- 원격(remote) 없음 → PR 불가, 로컬 머지만 가능.
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
   단언: "방어 안 함"은 전 스테이지 전패 / 마지막 스테이지에서 arrowMerge가 이기고
   arrowSpread보다 라이프가 많다(= 머지가 스프레드보다 나아야 한다). 타워 수치를
   건드리면 여기부터 확인. 표 출력을 보려면 `npx vitest run tests/balance/balance.test.ts --reporter=verbose`.
3. **브라우저:** `npm run dev` 후 Browser 도구로 확인. 모바일 세로로 보려면 뷰포트를 420×840 정도로.

### 브라우저 검증 주의 (겪은 함정)

- Phaser는 **탭/pane이 숨겨지면 requestAnimationFrame을 멈춘다.** pane이 hidden이면
  `computer` 클릭이 타임아웃하고 게임 루프가 진행되지 않는다. 해결:
  - `mcp__..._tabs_select`로 pane을 앞으로 두거나,
  - JS로 루프를 수동 펌프: `setInterval(()=>window.__game.loop.step(performance.now()), 16)`
    (`__game`은 DEV 빌드에서 `window`에 노출됨 — `src/main.ts`).
- **씬을 JS로 함부로 start 하지 마라.** `window.__game.scene.getScene('game').scene.start(...)`처럼
  씬 자신의 ScenePlugin으로 전이해야 이전 씬이 멈춘다. `game.scene.start('x')`(SceneManager 직접)나
  잘못된 순서로 부르면 `mainmenu` 씬이 안 멈추고 게임 위에 겹쳐 렌더되어
  "타일에 대각선 줄 + 화면 중앙 깨진 텍스트 + 떠도는 노란 화살표" 처럼 보인다.
  이건 렌더 버그가 아니라 씬 스택 오염이다. `getScenes(true)`로 활성 씬을 확인하고
  불필요한 씬은 `scene.stop(key)`.
- 실제 버튼 클릭 흐름(MainMenu → StageSelect → Game)은 정상. 위 증상이 보이면 JS 조작 탓.

## 컨벤션

- TypeScript strict. `any` 금지(불가피하면 사유 주석). `noUnusedLocals/Parameters` 켜져 있음.
- 커밋: Conventional Commits(`feat:` `fix:` `chore:` `docs:` `balance:`). 태스크/기능 단위로.
- 모든 커밋 메시지 끝에:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- Windows 체크아웃이라 `git add` 시 CRLF 경고가 뜨지만 무해하다.
- 새 엔티티/씬에 Phaser 오브젝트를 추가하면 **`tests/balance/harness.ts`의 가짜 씬**
  (`DisplayObject`, `add.image/circle/graphics`)과 엔티티 단위 테스트의 가짜 씬에도
  no-op 메서드를 맞춰줘야 시뮬레이션이 안 깨진다.

## 밸런스 철학

머지(자리 합쳐 레벨↑)가 이 게임의 정체성이다. 머지 비용은 레벨마다 2배(2^(n-1)×설치비)지만
데미지는 그보다 가파르게 오르도록 `src/data/towers.ts`를 맞춰서, "넓게 깔기"보다
"몇 기를 높게 쌓기"가 골드당 화력이 세고 탱커·보스를 녹일 수 있게 했다. 스테이지 뒤로 갈수록
보스 비중을 키워 이 선택을 강제한다. 판매 환급은 레벨 무관 Lv1 설치비의 60% — 머지 비용은 손실.
난이도는 임의로 완화하지 않는다(사용자 확정, [docs/verification-2026-08-31.md](docs/verification-2026-08-31.md)).
