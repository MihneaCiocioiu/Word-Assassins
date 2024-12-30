'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import getSocket, { sendMessage } from '../utils/socket';

export default function Lobby() {
    const [playerName, setPlayerName] = useState('');
    const [gameId, setGameId] = useState('');
    const router = useRouter();

    const socket = getSocket(); // Reuse the singleton WebSocket instance

    const handleCreateGame = () => {
      if (!playerName) {
          alert('Please enter your name');
          return;
      }

      sendMessage('createGame', { player: playerName });

      socket.once('message', (response) => {
          if (response.result === 'OK') {
              localStorage.setItem('playerName', playerName); // Save the creator's name
              localStorage.setItem('joined', 'true'); // Mark as joined
              localStorage.setItem('players', JSON.stringify(response.players)); // Save initial player list
              localStorage.setItem('isHost', 'true'); // Mark as host
              router.push(`/${response.gameId}`);
          } else {
              alert('Failed to create game');
          }
      });
  };

    const handleJoinGame = () => {
        if (!playerName || !gameId) {
            alert('Please enter your name and game ID');
            return;
        }

        sendMessage('joinGame', { player: playerName, gameId });

        socket.once('message', (response) => {
            if (response.result === 'OK') {
                localStorage.setItem('playerName', playerName); // Save player name
                localStorage.setItem('joined', 'true'); // Mark as joined
                router.push(`/${gameId}`);
            } else {
                alert(response.message || 'Failed to join game');
            }
        });
    };

    return (
        <div>
            <h1>Word Assassins</h1>
            <div>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
            </div>
            <div>
                <button onClick={handleCreateGame}>Create Game</button>
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Enter game ID"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                />
                <button onClick={handleJoinGame}>Join Game</button>
            </div>
        </div>
    );
}
