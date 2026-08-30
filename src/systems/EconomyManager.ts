import type { EventBus } from '../core/eventBus';
import type { GameEvents } from '../core/types';

export class EconomyManager {
  static readonly SELL_RATIO = 0.6;
  private _gold: number;

  constructor(startGold: number, private readonly bus: EventBus<GameEvents>) {
    this._gold = startGold;
  }

  get gold(): number {
    return this._gold;
  }

  canAfford(cost: number): boolean {
    return this._gold >= cost;
  }

  spend(cost: number): boolean {
    if (this._gold < cost) return false;
    this._gold -= cost;
    this.bus.emit('gold:changed', { gold: this._gold });
    return true;
  }

  earn(amount: number): void {
    this._gold += amount;
    this.bus.emit('gold:changed', { gold: this._gold });
  }

  sellRefund(totalInvested: number): number {
    const refund = Math.floor(totalInvested * EconomyManager.SELL_RATIO);
    this.earn(refund);
    return refund;
  }
}
