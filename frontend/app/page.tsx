'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import getSocket, { sendMessage } from '../utils/socket';

export default function Lobby() {
    const [playerName, setPlayerName] = useState('');
    const [gameId, setGameId] = useState('');
    const router = useRouter();

    const socket = getSocket(); // Reuse the singleton WebSocket instance

    // Clear localStorage or do any "client only" tasks inside useEffect
    useEffect(() => {
        localStorage.clear(); // Clear any previous game data
    }, []);

    const handleCreateGame = () => {
        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        sendMessage('createGame', { player: playerName });

        socket.once('message', (response) => {
            if (response.result === 'OK') {
                localStorage.setItem('playerName', playerName); // Save the creator's name
                localStorage.setItem('joined', 'true');         // Mark as joined
                localStorage.setItem('players', JSON.stringify(response.players));
                localStorage.setItem('isHost', 'true');         // Mark as host
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

        const normalisedGameId = gameId.trim().toUpperCase(); // Normalize game ID

        sendMessage('joinGame', { player: playerName, gameId: normalisedGameId });

        socket.once('message', (response) => {
            if (response.result === 'OK') {
                localStorage.setItem('playerName', playerName); 
                localStorage.setItem('joined', 'true'); 
                router.push(`/${normalisedGameId}`);
            } else {
                alert(response.message || 'Failed to join game');
            }
        });
    };

    return (
        <div className='mainSection'>
            <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
            />

            <button className='secondary-button' onClick={handleCreateGame}>
                Create Game
            </button>

            <input
                type="text"
                placeholder="Enter game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
            />

            <button onClick={handleJoinGame}>
                Join Game
            </button>
        </div>
    );
}
