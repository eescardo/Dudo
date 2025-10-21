import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { r } from '@/lib/redis';
import { newGame, addPlayer } from '@/lib/game';
import { safeId } from '@/lib/id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WAITING_ROOM_KEY = 'waiting_room:players';
const WAITING_ROOM_CHANNEL = 'waiting_room:updates';

// Generate a random room name (6 characters or less)
function generateRoomName(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const length = Math.floor(Math.random() * 4) + 3; // 3-6 characters
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { playerName } = await req.json();

    if (
      !playerName ||
      typeof playerName !== 'string' ||
      playerName.trim().length === 0
    ) {
      return Response.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    const playerId = uuidv4();
    const trimmedName = playerName.trim();

    // Add player to waiting room
    const player = {
      id: playerId,
      name: trimmedName,
      joinedAt: Date.now(),
    };

    // Add to waiting room set
    await r.sadd(WAITING_ROOM_KEY, JSON.stringify(player));

    // Get all players in waiting room
    const waitingPlayers = await r.smembers(WAITING_ROOM_KEY);
    console.log('Waiting players from Redis:', waitingPlayers);

    const players = waitingPlayers
      .map((p) => {
        try {
          // Handle both string and object cases
          if (typeof p === 'string') {
            return JSON.parse(p);
          } else if (typeof p === 'object' && p !== null) {
            return p;
          } else {
            console.error('Unexpected player data type:', typeof p, p);
            return null;
          }
        } catch (error) {
          console.error('Error parsing player data:', p, error);
          return null;
        }
      })
      .filter((p) => p !== null);

    // If we have 2 or more players, create a room
    if (players.length >= 2) {
      const roomId = generateRoomName();

      // Create new game room
      const gameState = newGame(roomId, {});

      // Add all waiting players to the room
      for (const waitingPlayer of players) {
        addPlayer(gameState, waitingPlayer.id, waitingPlayer.name);
      }

      // Save the room state
      await r.set(`room:${roomId}:state`, JSON.stringify(gameState));

      // Clear waiting room
      await r.del(WAITING_ROOM_KEY);

      // Notify all players about the new room
      await r.publish(
        WAITING_ROOM_CHANNEL,
        JSON.stringify({
          type: 'room_created',
          roomId,
          players: players.map((p) => ({ id: p.id, name: p.name })),
        })
      );

      return Response.json({
        roomId,
        playerId,
        players: players.map((p) => ({ id: p.id, name: p.name })),
      });
    }

    // Player is in waiting room
    return Response.json({
      inWaitingRoom: true,
      waitingCount: players.length,
    });
  } catch (error) {
    console.error('Error in waiting room join:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
