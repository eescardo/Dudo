'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dice } from '@/components/Dice';
import { BidForm } from '@/components/BidForm';

function usePlayer(roomId: string) {
  const [playerId, setPid] = useState<string>('');
  useEffect(() => {
    const key = `cachito:${roomId}:pid`;
    let pid = localStorage.getItem(key);
    if (!pid) {
      pid = uuidv4();
      localStorage.setItem(key, pid);
    }
    setPid(pid);
  }, [roomId]);
  return playerId;
}

export default function Room({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;
  const playerId = usePlayer(roomId);
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
            <div>
              Current bid:{' '}
              {pub.currentBid
                ? `${pub.currentBid.qty}×${pub.currentBid.face}`
                : '—'}
            </div>
            <div>Turn: {pub.currentTurn}</div>
            <div>Last: {pub.lastAction || '—'}</div>
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
            <button className="border px-3 py-1" onClick={start}>
              Start / Next Round
            </button>
            <button className="border px-3 py-1" onClick={dudo}>
              Dudo
            </button>
            <button className="border px-3 py-1" onClick={calza}>
              Calza
            </button>
          </div>

          <BidForm onSubmit={bid} />
        </>
      )}
    </div>
  );
}
