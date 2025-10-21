'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function WaitingContent() {
  const [waitingCount, setWaitingCount] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerName = searchParams.get('playerName');

  useEffect(() => {
    if (!playerName) {
      router.push('/');
      return;
    }

    // Set up SSE connection to waiting room updates
    const eventSource = new EventSource('/api/waiting-room/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_created') {
          setIsRedirecting(true);
          // Find the current player's ID in the room
          const currentPlayer = data.players.find(
            (p: any) => p.name === playerName
          );
          const url = currentPlayer
            ? `/room/${data.roomId}?playerName=${encodeURIComponent(playerName)}&playerId=${currentPlayer.id}`
            : `/room/${data.roomId}?playerName=${encodeURIComponent(playerName)}`;
          router.push(url);
        } else if (data.type === 'player_joined') {
          setWaitingCount(data.waitingCount);
        }
      } catch (error) {
        console.error('Error parsing waiting room update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Waiting room SSE error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [playerName, router]);

  if (!playerName) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Waiting for Players
        </h1>

        <div className="space-y-6">
          <div className="text-lg text-gray-600">
            Hello,{' '}
            <span className="font-semibold text-blue-600">{playerName}</span>!
          </div>

          <div className="space-y-4">
            <div className="text-2xl font-bold text-green-600">
              {waitingCount} player{waitingCount !== 1 ? 's' : ''} waiting
            </div>

            {isRedirecting ? (
              <div className="text-blue-600 font-medium">
                Redirecting to game room...
              </div>
            ) : (
              <div className="text-gray-600">
                Waiting for at least 2 players to start a game
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">
              Loading...
            </h1>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}
