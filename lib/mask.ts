import { FullState } from './types';

export function maskForPublish(S: FullState) {
  // Public snapshot excludes dice arrays
  return JSON.stringify({
    type: 'state',
    state: {
      ...S,
      secret: undefined,
    },
  });
}

export function privateDice(S: FullState, playerId: string) {
  return JSON.stringify({
    type: 'dice',
    playerId,
    dice: S.secret.diceByPlayer[playerId] ?? [],
  });
}

export function allDice(S: FullState) {
  return JSON.stringify({
    type: 'allDice',
    diceByPlayer: S.secret.diceByPlayer,
  });
}
