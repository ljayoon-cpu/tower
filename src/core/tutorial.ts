/** 1-1 첫 진입 튜토리얼의 단계 상태 머신. 렌더/Phaser 비의존. */

export type TutorialEvent = 'towerPlaced' | 'sameTypePlaced' | 'merged' | 'waveStarted';

const SEQUENCE: TutorialEvent[] = ['towerPlaced', 'sameTypePlaced', 'merged', 'waveStarted'];

const STEP_TEXT: string[] = [
  '빈 칸을 눌러 화살탑을 설치하세요',
  '같은 자리 근처에 화살탑을 하나 더 설치하세요',
  '타워를 끌어다 같은 타워 위에 놓아 합체하세요',
  '▶ 다음 웨이브 로 첫 웨이브를 시작하세요',
];

export class Tutorial {
  private step = 0;

  get done(): boolean {
    return this.step >= SEQUENCE.length;
  }

  /** 현재 안내 문구. 끝났으면 null. */
  get text(): string | null {
    return this.done ? null : STEP_TEXT[this.step];
  }

  /** 이벤트가 현재 단계에서 기다리던 것이면 다음 단계로. 진행됐으면 true. */
  advance(event: TutorialEvent): boolean {
    if (!this.done && event === SEQUENCE[this.step]) {
      this.step++;
      return true;
    }
    return false;
  }

  skip(): void {
    this.step = SEQUENCE.length;
  }
}
