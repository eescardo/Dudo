import { Bid, FullState, PublicState, Rules } from './types';

const rng = () => 1 + Math.floor(Math.random() * 6);

export function newGame(roomId: string, rules?: Partial<Rules>): FullState {
  const r: Rules = {
    onesWild: true,
    calzaGain: 1,
    calzaPenalty: 1,
    paloFijo: false,
    maxDice: 5,
    ...rules,
  };
  return {
    roomId,
    rules: r,
    phase: 'lobby',
    players: [],
    currentBid: null,
    currentTurn: null,
    round: 0,
    secret: { diceByPlayer: {} },
  };
}

export function addPlayer(S: FullState, id: string, name: string) {
  if (S.players.find((p) => p.id === id)) return; // idempotent
  S.players.push({ id, name, diceCount: S.rules.maxDice, connected: true });
}

export function markConnected(S: FullState, id: string, connected: boolean) {
  const p = S.players.find((p) => p.id === id);
  if (p) p.connected = connected;
}

export function startRound(S: FullState) {
  if (S.players.filter((p) => p.diceCount > 0).length < 2) return;
  S.phase = 'rolling';
  S.round += 1;
  S.currentBid = null;
  // roll dice for alive players
  S.secret.diceByPlayer = {};
  for (const p of S.players) {
    if (p.diceCount > 0) {
      const dice = Array.from({ length: p.diceCount }, rng);
      S.secret.diceByPlayer[p.id] = dice;
    }
  }
  // first turn = previous loser if stored in lastAction else first non-zero
  const alive = S.players.filter((p) => p.diceCount > 0);
  S.currentTurn = alive[0]?.id ?? null;
  S.phase = 'bidding';
}

function validNextBid(prev: Bid | null, next: Bid): boolean {
  if (next.qty < 1) return false;
  if (prev === null) return true;
  const fromAces = prev.face === 1;
  const toAces = next.face === 1;
  if (toAces && !fromAces) {
    const min = Math.ceil(prev.qty / 2);
    return next.qty >= min;
  }
  if (fromAces && !toAces) {
    const min = 2 * prev.qty + 1;
    return next.qty >= min;
  }
  // same domain
  return (
    next.qty > prev.qty || (next.qty === prev.qty && next.face > prev.face)
  );
}

export function placeBid(S: FullState, playerId: string, bid: Bid) {
  if (S.phase !== 'bidding') throw Error('not bidding');
  if (S.currentTurn !== playerId) throw Error('not your turn');
  if (!validNextBid(S.currentBid, bid)) throw Error('invalid bid');
  S.currentBid = bid;
  advanceTurn(S);
  S.lastAction = `bid:${bid.qty}x${bid.face}`;
}

function advanceTurn(S: FullState) {
  const alive = S.players.filter((p) => p.diceCount > 0);
  const idx = alive.findIndex((p) => p.id === S.currentTurn);
  S.currentTurn = alive[(idx + 1) % alive.length]?.id ?? null;
}

function countFace(S: FullState, face: number) {
  let total = 0;
  for (const p of S.players) {
    if (p.diceCount === 0) continue;
    const dice = S.secret.diceByPlayer[p.id] || [];
    for (const d of dice) {
      if (d === face) total++;
      else if (S.rules.onesWild && d === 1 && face !== 1) total++;
    }
  }
  return total;
}

export function callDudo(S: FullState, callerId: string) {
  if (S.phase !== 'bidding') throw Error('not bidding');
  if (S.currentBid == null) throw Error('no bid');
  // On dudo, reveal
  S.phase = 'reveal';
  const actual = countFace(S, S.currentBid.face);
  const bidderId = previousAlive(S, S.currentTurn!);
  const bidderWrong = actual < S.currentBid.qty;
  const loserId = bidderWrong ? bidderId : callerId;
  applyLoss(S, loserId, 1);
  S.lastAction = `dudo:${bidderWrong ? 'bidder_loses' : 'caller_loses'}:${actual}`;
  prepareNextRound(S, loserId);
}

export function callCalza(S: FullState, callerId: string) {
  if (S.phase !== 'bidding') throw Error('not bidding');
  if (S.currentBid == null) throw Error('no bid');
  S.phase = 'reveal';
  const actual = countFace(S, S.currentBid.face);
  const exact = actual === S.currentBid.qty;
  if (exact) applyGain(S, callerId, S.rules.calzaGain);
  else applyLoss(S, callerId, S.rules.calzaPenalty);
  S.lastAction = `calza:${exact ? 'exact' : 'wrong'}:${actual}`;
  // Previous bidder never penalized per calza rule
  const loserId = exact ? null : callerId;
  // Next round starts with: loser if any, else previous bidder
  const startId = loserId ?? previousAlive(S, S.currentTurn!);
  prepareNextRound(S, startId);
}

function applyLoss(S: FullState, id: string, n: number) {
  const p = S.players.find((p) => p.id === id);
  if (!p) return;
  p.diceCount = Math.max(0, p.diceCount - n);
}
function applyGain(S: FullState, id: string, n: number) {
  const p = S.players.find((p) => p.id === id);
  if (!p) return;
  p.diceCount = Math.min(S.rules.maxDice, p.diceCount + n);
}

function previousAlive(S: FullState, currentId: string) {
  const alive = S.players.filter((p) => p.diceCount > 0);
  const idx = alive.findIndex((p) => p.id === currentId);
  return alive[(idx - 1 + alive.length) % alive.length]?.id ?? currentId;
}

function aliveCount(S: FullState) {
  return S.players.filter((p) => p.diceCount > 0).length;
}

function maybeGameOver(S: FullState) {
  const alive = S.players.filter((p) => p.diceCount > 0);
  if (alive.length === 1) {
    S.phase = 'gameover';
    S.winnerId = alive[0].id;
  }
}

function prepareNextRound(S: FullState, nextStartId: string) {
  maybeGameOver(S);
  if (S.phase === 'gameover') return;
  // assign next starter and reset
  S.currentTurn = nextStartId;
  S.currentBid = null;
  // Immediately roll for next round
  startRound(S);
}

export function toPublic(S: FullState): PublicState {
  const { secret, ...pub } = S;
  return pub;
}
