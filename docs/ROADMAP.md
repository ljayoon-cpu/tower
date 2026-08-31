# 로드맵 / 방향

작성 2026-08-31. 작업 규칙은 [/AGENTS.md](../AGENTS.md).

## 큰 방향

1. **"실제로 재밌게 돌아가는 게임"이 최우선** (설계 문서 기준). 스토어 출시는 나중.
2. **머지가 핵심 재미.** 새 기능·수치는 "넓게 깔기 vs 높게 쌓기" 선택을 더 흥미롭게
   만드는지로 판단한다. 스프레드가 다시 지배적이 되면 후퇴.
3. **로직은 순수 TS, Vitest로 검증 가능하게.** 밸런스 변경은 `tests/balance` 시뮬로 뒷받침.
4. v1 범위: 월드 1(현재 1-1~1-6), PWA. 카드 드래프트/로그라이크·무한모드·월드2·과금·온라인은 제외(설계 시 고려만).

## 완료 (최근 세션)

- Task 1~22 (스캐폴드 ~ 통합 점검) + 다음 자율 개발:
- 가독성: 적 체력바, 타워 탭 정보(DPS·다음레벨·사거리·판매가·표적), 다음 웨이브 미리보기
- 머지: 드래그 중 유효 대상 초록 링
- 밸런스: 고레벨 타워 상향 → 머지 > 스프레드 (시뮬 검증 + 회귀 단언)
- 손맛: 피격 플래시, 착탄 링, 프로스트 오라
- 보스 체력바 (HUD 상단)
- 스테이지 1-6 (보스 4기 피날레)
- 스테이지 선택 개편 (압축 카드 + 웨이브/보스 요약 + 스크롤)
- 표적 우선순위 (선두/후미/최대체력/최근접, 타워별)

## 다음 (우선순위 순)

### A. 손맛·연출 마무리 (작음, 저위험)
- [ ] 타워가 발사 시 표적 방향으로 회전 (Tower 스프라이트 `setRotation`)
- [ ] 적 처치 시 스케일 팝 + 페이드 (현재는 즉시 사라짐 — 스프라이트 수명을 엔티티와 분리 필요)
- [ ] 머지 성공 시 결과 타워에 짧은 플래시/스케일 튀김
- [ ] 골드 획득 시 처치 지점에 `+N` 플로팅 텍스트

### B. 결과·진행 (작음)
- [ ] Result 화면에 최고 기록 표시 + 이번에 갱신 시 "신기록" 배지
- [ ] StageSelect에 총 별점 합계 / 진행률
- [ ] 일시정지 오버레이에 현재 타워 구성 요약

### C. 콘텐츠 (중간)
- [ ] 스테이지 1-7, 1-8 — 새 맵 골격(현재는 1-2/1-5/1-6이 같은 분기 맵 재사용).
      3갈래 분기나 S자 경로. `PathManager`는 임의 분기 트리 지원.
      **각 스테이지는 `tests/balance`로 검증**: "방어 안 함" 전패, 스프레드는 상한 낮음,
      머지 커밋 시 클리어 가능, 타임아웃 없음.
- [ ] 스테이지 데이터 추가 시 `tests/data/stages.test.ts`의 `STAGE_IDS`/`nextStageId` 갱신
- [ ] 새 적 1종 (예: 방어막/분열) — `EnemyDef`에 필드 추가, `armorType`는 이미 자리만 있음

- [ ] **새 타워 1종 (Codex 담당)** — 건드릴 파일:
  - `src/core/types.ts` `AttackKind`에 새 값 추가
  - `src/data/towers.ts` 정의 + `TowerLevelStats`에 필요한 필드
  - `src/ui/textures.ts` 새 도형, `COLORS`(`src/core/constants.ts`)에 색
  - `src/scenes/Game.ts` `updateTowers`의 `onHit` 분기에 공격 처리
  - `src/ui/BuildMenu.ts`는 `TOWER_KEYS`를 순회하므로 대개 자동
  - 테스트: `tests/data/definitions.test.ts`(속성별 필드 단언), 공격이 순수 계산이면
    `src/systems/combat.ts` + 단위 테스트
  - **밸런스:** 머지 우위를 깨지 않을 것. `tests/balance/harness.ts`의 전략에 새 타워를
    추가하고 `balance.test.ts` 회귀 통과 확인. 4종이 이미 빡빡하니 니치(대공/관통/버프 등)로.
  - 겹침 주의: 이 시기 다른 작업은 `Game.ts`·`HUD.ts` 대규모 수정을 피한다.

### D. 깊이 (중간)
- [ ] 웨이브 사이 이자(interest) 또는 웨이브 클리어 보너스 조정 — 저축 유인
- [ ] 타워 이동 배치 (현재 v1 제외. 빈 타일로 드래그 시 원위치). 넣으면 판매 손실 설계와 충돌 검토
- [ ] 3x 배속

### E. 배포 (중간, 실기기 필요)
- [ ] 실제 안드로이드/iOS에서 PWA 설치·오프라인·터치 조작 확인
- [ ] 중급 안드로이드에서 60기+ 동시 스폰 시 프레임 측정 (풀링은 되어 있음)
- [ ] Capacitor로 APK (폴더 구조만 대비됨, 실제 빌드는 범위 밖)
- [ ] Vite 청크 경고: Phaser 포함 ~1.24MB(gzip ~331KB). 코드 스플릿 검토

## 알려진 갭 / 리스크

- **원격 저장소 없음** → PR 불가. `git remote add` 하거나 로컬 `main` 머지.
- **데스크톱 브라우저 검증 ≠ 폰 검증.** E 항목 전까지 "폰에서 된다"고 말하지 않는다.
- 밸런스 시뮬 전략(`tests/balance/harness.ts`)은 순진하다(고정 타일 우선순위, 판매·중간
  구매 없음). 사람 실력의 하한선일 뿐 상한이 아니다. 수치를 시뮬만 보고 과조정하지 말 것.
- StageSelect는 스테이지 6개까지 스크롤 없이 맞고, 그 이상은 스크롤이 켜진다(구현됨).
- 텍스처는 전부 `generateTexture` 도형. 나중에 도트/일러스트로 교체 시 텍스처 키만 유지하면 로직 불변.
- 사운드는 절차적 합성(`scripts/generate-sfx.mjs`). `SOUND_ENABLED`(`src/core/constants.ts`)로 완전 비활성 가능.

## 참고 문서

- 설계: [docs/superpowers/specs/2026-08-30-merge-tower-defense-design.md](superpowers/specs/2026-08-30-merge-tower-defense-design.md)
- 원본 구현 계획(완료): [docs/superpowers/plans/2026-08-30-merge-tower-defense.md](superpowers/plans/2026-08-30-merge-tower-defense.md)
- 검증 기록: [docs/verification-2026-08-31.md](verification-2026-08-31.md)
