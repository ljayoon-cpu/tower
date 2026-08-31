import type { EnemyDef } from '../core/types';

export interface EnemyModifiers {
  hpMultiplier?: number;
  speedMultiplier?: number;
  shieldMultiplier?: number;
}

export interface DamagePacket {
  amount: number;
  /** 방어력에서 무시할 수치. 저격 계열이 높은 값을 사용한다. */
  armorPierce?: number;
}

export interface DamageReport {
  shieldDamage: number;
  armorBlocked: number;
  healthDamage: number;
}

/**
 * 렌더러와 무관한 적 전투 상태.
 * 이동, 소환, 시각 효과는 바깥 계층이 맡고 이 클래스는 체력·보호막·상태 이상만 계산한다.
 */
export class EnemyState {
  readonly maxHp: number;
  readonly maxShield: number;
  readonly speed: number;

  hp: number;
  shield: number;
  poisonDps = 0;
  poisonLeftMs = 0;
  freezeLeftMs = 0;
  private freezeHits = 0;
  private freezeCooldownLeftMs = 0;

  private readonly armor: number;
  private readonly regenPerSecond: number;
  private readonly shieldRechargeDelayMs: number;
  private readonly shieldRechargePerSecond: number;
  private shieldRechargeLeftMs = 0;

  constructor(readonly def: EnemyDef, modifiers: EnemyModifiers = {}) {
    const hpMultiplier = modifiers.hpMultiplier ?? 1;
    const shieldMultiplier = modifiers.shieldMultiplier ?? 1;

    this.maxHp = def.hp * hpMultiplier;
    this.hp = this.maxHp;
    this.maxShield = (def.shield?.energy ?? 0) * shieldMultiplier;
    this.shield = this.maxShield;
    this.speed = def.speed * (modifiers.speedMultiplier ?? 1);
    this.armor = Math.max(0, def.armor ?? 0);
    this.regenPerSecond = Math.max(0, def.regenPerSecond ?? 0);
    this.shieldRechargeDelayMs = Math.max(0, def.shield?.rechargeDelayMs ?? 0);
    this.shieldRechargePerSecond = Math.max(0, def.shield?.rechargePerSecond ?? 0);
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get shieldRatio(): number {
    return this.maxShield === 0 ? 0 : this.shield / this.maxShield;
  }

  get frozen(): boolean {
    return this.freezeLeftMs > 0;
  }

  restoreShield(ratio: number): void {
    this.shield = Math.max(this.shield, this.maxShield * Math.max(0, Math.min(1, ratio)));
  }

  applyDamage({ amount, armorPierce = 0 }: DamagePacket): DamageReport {
    const incoming = Math.max(0, amount);
    const shieldDamage = Math.min(this.shield, incoming);
    this.shield -= shieldDamage;

    if (this.maxShield > 0 && shieldDamage > 0) {
      this.shieldRechargeLeftMs = this.shieldRechargeDelayMs;
    }

    const afterShield = incoming - shieldDamage;
    const armorBlocked = Math.min(afterShield, Math.max(0, this.armor - armorPierce));
    const healthDamage = Math.min(this.hp, afterShield - armorBlocked);
    this.hp -= healthDamage;

    return { shieldDamage, armorBlocked, healthDamage };
  }

  applyPoison(dps: number, durationMs: number): void {
    const resisted = dps * (this.def.poisonResist ?? 1);
    this.poisonDps = Math.max(this.poisonDps, resisted);
    this.poisonLeftMs = Math.max(this.poisonLeftMs, durationMs);
  }

  /** 서리 적중을 누적해 정해진 횟수에서만 짧게 빙결시킨다. */
  applyFreezeHit(hits: number, durationMs: number, cooldownMs: number): boolean {
    const requiredHits = Math.max(1, Math.floor(hits));
    const duration = Math.max(0, durationMs);
    const cooldown = Math.max(0, cooldownMs);
    if (!this.alive || duration === 0 || this.freezeCooldownLeftMs > 0) return false;

    this.freezeHits++;
    if (this.freezeHits < requiredHits) return false;

    this.freezeHits = 0;
    this.freezeLeftMs = duration;
    this.freezeCooldownLeftMs = cooldown;
    return true;
  }

  /** 상태를 경과시키고, 이번 시간 동안 이동이 멈춘 밀리초를 반환한다. */
  update(dtMs: number): number {
    const dt = Math.max(0, dtMs);
    const frozenForMs = Math.min(dt, this.freezeLeftMs);
    this.freezeLeftMs = Math.max(0, this.freezeLeftMs - dt);
    this.freezeCooldownLeftMs = Math.max(0, this.freezeCooldownLeftMs - dt);
    const poisonedForMs = Math.min(dt, this.poisonLeftMs);

    if (poisonedForMs > 0 && this.alive) {
      this.hp = Math.max(0, this.hp - (this.poisonDps * poisonedForMs) / 1000);
      this.poisonLeftMs -= poisonedForMs;
      if (this.poisonLeftMs <= 0) {
        this.poisonLeftMs = 0;
        this.poisonDps = 0;
      }
    }

    if (poisonedForMs === 0 && this.alive && this.regenPerSecond > 0) {
      this.hp = Math.min(this.maxHp, this.hp + (this.regenPerSecond * dt) / 1000);
    }

    if (this.shield >= this.maxShield || this.maxShield === 0 || dt === 0) return frozenForMs;

    const delayConsumed = Math.min(dt, this.shieldRechargeLeftMs);
    this.shieldRechargeLeftMs -= delayConsumed;
    const rechargeMs = dt - delayConsumed;
    if (rechargeMs > 0 && this.shieldRechargeLeftMs === 0) {
      this.shield = Math.min(this.maxShield, this.shield + (this.shieldRechargePerSecond * rechargeMs) / 1000);
    }
    return frozenForMs;
  }
}
