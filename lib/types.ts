export type Player = {
  id: string;
  name: string;
  diceCount: number; // 0..5
  dice?: number[]; // server-only; per-player private publishes
  connected: boolean;
};

export type Bid = { qty: number; face: 1 | 2 | 3 | 4 | 5 | 6 };

export type Rules = {
  onesWild: boolean; // default true
  calzaGain: 1 | 0; // dice gained if calza exact (default 1)
  calzaPenalty: 1 | 2; // dice lost if calza wrong (default 1)
  paloFijo: boolean; // default false (simplify)
  maxDice: number; // default 5
};

export type Phase = 'lobby' | 'rolling' | 'bidding' | 'reveal' | 'gameover';

export type PublicState = {
  roomId: string;
  rules: Rules;
  phase: Phase;
  players: Array<Pick<Player, 'id' | 'name' | 'diceCount' | 'connected'>>;
  currentBid: Bid | null;
  currentTurn: string | null; // playerId
  round: number;
  lastAction?: string; // textual summary
  winnerId?: string;
};

export type FullState = PublicState & {
  // server-side only fields
  secret: {
    // map of playerId -> dice
    diceByPlayer: Record<string, number[]>;
  };
};

export type ClientAction =
  | { type: 'join'; playerId: string; name: string }
  | { type: 'leave'; playerId: string }
  | { type: 'start'; playerId: string }
  | { type: 'bid'; playerId: string; bid: Bid }
  | { type: 'dudo'; playerId: string }
  | { type: 'calza'; playerId: string };
