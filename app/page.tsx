'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isRandomMatch, setIsRandomMatch] = useState(false);
  const router = useRouter();

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) return;

    setIsJoining(true);
    try {
      // Navigate to the room - the room page will handle joining
      router.push(
        `/room/${encodeURIComponent(roomName.trim())}?playerName=${encodeURIComponent(playerName.trim())}`
      );
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleRandomMatch = async () => {
    if (!playerName.trim()) return;

    setIsRandomMatch(true);
    try {
      // Add player to waiting room
      const response = await fetch('/api/waiting-room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.roomId) {
          // Player was added to a room, navigate there
          const url = data.playerId
            ? `/room/${data.roomId}?playerName=${encodeURIComponent(playerName.trim())}&playerId=${data.playerId}`
            : `/room/${data.roomId}?playerName=${encodeURIComponent(playerName.trim())}`;
          router.push(url);
        } else {
          // Player is in waiting room, navigate to waiting page
          router.push(
            `/waiting?playerName=${encodeURIComponent(playerName.trim())}`
          );
        }
      }
    } catch (error) {
      console.error('Failed to join random match:', error);
    } finally {
      setIsRandomMatch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Cachito
        </h1>

        <div className="space-y-6">
          {/* Player Name Input */}
          <div>
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={24}
            />
          </div>

          {/* Join Room Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Join Room</h2>
            <div>
              <label
                htmlFor="roomName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!playerName.trim()}
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || !roomName.trim() || isJoining}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Random Match Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Random Match
            </h2>
            <p className="text-sm text-gray-600">
              Get matched with other players automatically
            </p>
            <button
              onClick={handleRandomMatch}
              disabled={!playerName.trim() || isRandomMatch}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isRandomMatch ? 'Finding Match...' : 'Find Random Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
