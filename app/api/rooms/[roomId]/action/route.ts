import { NextRequest } from 'next/server';
import { z } from 'zod';
import { safeId } from '@/lib/id';
import {
  loadState,
  saveState,
  publishPublic,
  publishPrivate,
} from '@/lib/redis';
import {
  newGame,
  addPlayer,
  startRound,
  placeBid,
  callDudo,
  callCalza,
  toPublic,
} from '@/lib/game';
import { privateDice, allDice } from '@/lib/mask';
import type { ClientAction, FullState } from '@/lib/types';

export const runtime = 'nodejs'; // need TCP for redis subscriber in sibling route
export const dynamic = 'force-dynamic';

const schema = z.union([
  z.object({
    type: z.literal('join'),
    playerId: z.string(),
    name: z.string().min(1).max(24),
  }),
  z.object({ type: z.literal('leave'), playerId: z.string() }),
  z.object({ type: z.literal('start'), playerId: z.string() }),
  z.object({
    type: z.literal('bid'),
    playerId: z.string(),
    bid: z.object({
      qty: z.number().int().min(1),
      face: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
    }),
  }),
  z.object({ type: z.literal('dudo'), playerId: z.string() }),
  z.object({ type: z.literal('calza'), playerId: z.string() }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const roomId = safeId(params.roomId);
  const body = await req.json();
  const action = schema.parse(body) as ClientAction;

  let S: FullState = (await loadState(roomId)) ?? newGame(roomId, {});

  try {
    switch (action.type) {
      case 'join': {
        addPlayer(S, action.playerId, action.name);
        break;
      }
      case 'leave': {
        // soft-leave: mark disconnected
        const p = S.players.find((p) => p.id === action.playerId);
        if (p) p.connected = false;
        break;
      }
      case 'start': {
        if (
          S.phase === 'lobby' ||
          S.phase === 'gameover' ||
          S.phase === 'revealed'
        ) {
          startRound(S);
        }
        break;
      }
      case 'bid': {
        placeBid(S, action.playerId, action.bid);
        break;
      }
      case 'dudo': {
        callDudo(S, action.playerId);
        break;
      }
      case 'calza': {
        callCalza(S, action.playerId);
        break;
      }
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }

  await saveState(roomId, S);

  // Publish masked state to room and dice info to each player
  await publishPublic(
    roomId,
    JSON.stringify({ type: 'state', state: toPublic(S) })
  );

  // During revealed phase, show all dice to everyone
  if (S.phase === 'revealed') {
    await publishPublic(roomId, allDice(S));
  } else {
    // During normal play, send private dice to each player
    for (const p of S.players) {
      if (p.diceCount > 0) {
        await publishPrivate(roomId, p.id, privateDice(S, p.id));
      }
    }
  }

  return Response.json({ ok: true });
}
