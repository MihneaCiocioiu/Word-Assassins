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
        sendMessage('createGame', { player: playerName });

        socket.on('message', (response) => {
            if (response.result === 'OK') {
                router.push(`/waiting-room?gameId=${response.gameId}`);
            }
        });
    };

    const handleJoinGame = () => {
        sendMessage('joinGame', { player: playerName, gameId });

        socket.on('message', (response) => {
            if (response.result === 'OK') {
                router.push(`/waiting-room?gameId=${gameId}`);
            }
        });
    };

    return (
        <div>
            <h1>Word Assassins</h1>
            <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
            />
            <button onClick={handleCreateGame}>Create Game</button>
            <input
                type="text"
                placeholder="Enter game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
            />
            <button onClick={handleJoinGame}>Join Game</button>
        </div>
    );
}
