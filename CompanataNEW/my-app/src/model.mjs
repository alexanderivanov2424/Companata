import { STATUS_ONLINE, STACK_SIZE, STACKS_TO_WIN } from './common.mjs';

export class Bag extends Map {
  isEmpty() {
    return this.size === 0;
  }

  get(key) {
    return super.get(key) ?? 0;
  }

  set(key, count) {
    if (count > 0) {
      super.set(key, count);
    } else {
      super.delete(key);
    }
    return this;
  }

  add(key, count = 1) {
    this.set(key, this.get(key) + count);
    return this;
  }

  remove(key, count = 1) {
    const newCount = this.get(key) - count;
    if (count <= 0) {
      return false;
    }
    this.set(key, newCount);
    return true;
  }

  transferOneTo(bag, key) {
    return this.remove(key) && bag.add(key);
  }

  transferAllTo(bag) {
    for (const [key, count] of this.entries()) {
      bag.set(key, bag.get(key) + count);
    }
    this.clear();
    return true;
  }

  toJSON() {
    return Array.from(this.entries());
  }
}

export class Player {
  constructor({
    name,
    status = STATUS_ONLINE,
    hidden = false,
    wallet = new Bag().set(0, 2).set(5, 4).set(10, 3),
    items = new Bag(),
    pot = new Bag(),
  }) {
    this.name = name;
    this.status = status;
    this.hidden = hidden;
    this.wallet = wallet;
    this.items = items;
    this.pot = pot;
  }

  isWinner() {
    let fullStacks = 0;
    for (const count of this.items.values()) {
      fullStacks += count >= STACK_SIZE;
    }
    return fullStacks >= STACKS_TO_WIN;
  }

  hasCoin(coin) {
    return this.wallet.has(coin);
  }

  hasTargetable(item) {
    const count = this.items.get(item);
    return 0 < count && count < STACK_SIZE;
  }

  canTarget(player, item) {
    return (
      player !== this && this.hasTargetable(item) && player.hasTargetable(item)
    );
  }

  money() {
    let total = 0;
    for (const [coin, count] of this.wallet.entries()) {
      total += coin * count;
    }
    return total;
  }

  potValue() {
    let total = 0;
    for (const [coin, count] of this.pot.entries()) {
      total += coin * count;
    }
    return total;
  }

  payCoin(player, coin) {
    return this.wallet.transferOneTo(player.wallet, coin);
  }

  pay(player, amount) {
    if (this.money() < amount) {
      return false;
    }

    const coins = [...this.wallet.keys()];
    coins.sort((a, b) => b - a);
    if (coins[coins.length - 1] === 0) {
      coins.pop();
    }

    for (const coin of coins) {
      while (amount >= coin && this.payCoin(player, coin)) {
        amount -= coin;
      }
    }

    coins.reverse();

    for (const coin of coins) {
      while (amount > 0 && this.payCoin(player, coin)) {
        amount -= coin;
      }
    }
    return true;
  }

  sendPot(player) {
    this.pot.transferAllTo(player.wallet);
  }
}
