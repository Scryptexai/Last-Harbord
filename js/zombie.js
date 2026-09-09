// ============ Zombie ============
import { CFG } from './config.js';

// type: 'slow' | 'fast' | 'tank' — stat diambil dari CFG.ZOMBIES
export function makeZombie(type, x, y) {
  const c = CFG.ZOMBIES[type];
  return {
    type, x, y,
    hp: c.hp, maxHp: c.hp,
    radius: c.radius, speed: c.speed, dmg: c.dmg, aggro: c.aggro,
    wanderA: Math.random() * Math.PI * 2,
    wanderT: Math.random() * 2,
    attackCd: Math.random() * 0.5,
    hitFlash: 0,
    chasing: false,
  };
}
