'use client';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Dice } from '@/components/Dice';
import { BidForm } from '@/components/BidForm';
import { DiceFace } from '@/components/DiceFace';

function usePlayer(roomId: string, urlPlayerId?: string | null) {
  const [playerId, setPid] = useState<string>('');
  useEffect(() => {
    // If playerId is provided in URL (from waiting room), use it
    if (urlPlayerId) {
      setPid(urlPlayerId);
      return;
    }

    // Otherwise, use localStorage to persist playerId for this room
    const key = `cachito:${roomId}:pid`;
    let pid = localStorage.getItem(key);
    if (!pid) {
      pid = uuidv4();
      localStorage.setItem(key, pid);
    }
    setPid(pid);
  }, [roomId, urlPlayerId]);
  return playerId;
}

function RoomContent({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;
  const searchParams = useSearchParams();
  const urlPlayerId = searchParams.get('playerId');
  const playerId = usePlayer(roomId, urlPlayerId);
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [pub, setPub] = useState<any>(null);
  const [myDice, setMyDice] = useState<number[]>([]);

  const esRef = useRef<EventSource | null>(null);

  const call = async (action: any) => {
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
  };

  useEffect(() => {
    if (!playerId) return;
    const es = new EventSource(
      `/api/rooms/${roomId}/events?playerId=${playerId}`
    );
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'state') setPub(msg.state);
        if (msg.type === 'dice' && msg.playerId === playerId)
          setMyDice(msg.dice);
      } catch {}
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };
    esRef.current = es;
    return () => es.close();
  }, [playerId, roomId]);

  const join = async () => {
    if (!name.trim()) return;
    await call({ type: 'join', playerId, name: name.trim() });
    setJoined(true);
  };

  // Auto-join if player name is provided in URL
  useEffect(() => {
    const urlPlayerName = searchParams.get('playerName');
    if (urlPlayerName && playerId && !joined) {
      setName(urlPlayerName);
      // Auto-join after a short delay to ensure everything is ready
      setTimeout(() => {
        join();
      }, 100);
    }
  }, [playerId, searchParams, joined]);

  // Check if player is already in the game state (from waiting room)
  useEffect(() => {
    if (pub && playerId && !joined) {
      const existingPlayer = pub.players.find((p: any) => p.id === playerId);
      if (existingPlayer) {
        // Player is already in the game, mark as joined
        setJoined(true);
        setName(existingPlayer.name);
      }
    }
  }, [pub, playerId, joined]);

  const start = async () => {
    await call({ type: 'start', playerId });
  };
  const bid = async (qty: number, face: number) => {
    await call({ type: 'bid', playerId, bid: { qty, face } });
  };
  const dudo = async () => {
    await call({ type: 'dudo', playerId });
  };
  const calza = async () => {
    await call({ type: 'calza', playerId });
  };

  const me = useMemo(
    () => pub?.players?.find((p: any) => p.id === playerId),
    [pub, playerId]
  );

  const isMyTurn = useMemo(
    () => pub?.currentTurn === playerId,
    [pub?.currentTurn, playerId]
  );

  const formatBid = (bid: any) => {
    if (!bid) return '—';
    return (
      <span className="flex items-center gap-1">
        <span>{bid.qty}×</span>
        <DiceFace value={bid.face} size={20} />
      </span>
    );
  };

  const formatLastAction = (action: string) => {
    if (!action) return '—';

    // Parse bid format like "bid:3x4" or "dudo:bidder_loses:2" or "calza:exact:3"
    const bidMatch = action.match(/bid:(\d+)x(\d+)/);
    if (bidMatch) {
      const [, qty, face] = bidMatch;
      return (
        <span className="flex items-center gap-1">
          <span>Bid:</span>
          <span>{qty}×</span>
          <DiceFace value={parseInt(face) as 1 | 2 | 3 | 4 | 5 | 6} size={20} />
        </span>
      );
    }

    // For other actions, show as text
    return action;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Cachito — Room {roomId}</h1>

      {!joined && (
        <div className="flex gap-2 items-end">
          <label className="flex flex-col">
            Your name
            <input
              className="border p-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player"
            />
          </label>
          <button className="border px-3 py-1" onClick={join}>
            Join
          </button>
        </div>
      )}

      {pub && (
        <>
          <div className="border p-3 rounded">
            <div>
              Phase: <b>{pub.phase}</b> · Round: {pub.round}
            </div>
            <div className="flex items-center gap-2">
              Current bid: {formatBid(pub.currentBid)}
            </div>
            <div>Turn: {pub.currentTurn}</div>
            <div className="flex items-center gap-2">
              Last: {formatLastAction(pub.lastAction)}
            </div>
          </div>

          <div className="border p-3 rounded">
            <h2 className="font-medium mb-2">Players</h2>
            <ul className="grid grid-cols-2 gap-2">
              {pub.players.map((p: any) => (
                <li
                  key={p.id}
                  className={`border p-2 rounded ${p.id === pub.currentTurn ? 'bg-yellow-50' : ''}`}
                >
                  <div className="flex justify-between">
                    <b>{p.name}</b>
                    <span>{p.diceCount} dice</span>
                  </div>
                  {p.id === playerId && myDice.length > 0 && (
                    <Dice dice={myDice} />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 items-center">
            <button
              className="border px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={start}
            >
              Start / Next Round
            </button>
            <button
              className="border px-3 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={dudo}
              disabled={!isMyTurn}
            >
              Dudo
            </button>
            <button
              className="border px-3 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={calza}
              disabled={!isMyTurn}
            >
              Calza
            </button>
          </div>

          <BidForm
            onSubmit={bid}
            activePlayer={isMyTurn}
            maxQty={pub.players.reduce(
              (total: number, p: any) => total + p.diceCount,
              0
            )}
          />
        </>
      )}
    </div>
  );
}

export default function Room({ params }: { params: { roomId: string } }) {
  return (
    <Suspense
      fallback={
        <div className="p-4 max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold">
            Cachito — Room {params.roomId}
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      }
    >
      <RoomContent params={params} />
    </Suspense>
  );
}
