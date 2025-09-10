'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import getSocket, { sendMessage } from '../utils/socket';

export default function Lobby() {
    const [playerName, setPlayerName] = useState('');
    const [gameId, setGameId] = useState('');
    const [languageIndex, setLanguageIndex] = useState(0); // 0 = EN, 1 = RO
    const router = useRouter();

    const socket = getSocket(); // Reuse the singleton WebSocket instance

    // Previously cleared localStorage here, but that breaks rejoin. Keep data.
    useEffect(() => {
        // No-op on mount
    }, []);

    const handleCreateGame = () => {
        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        const language = languageIndex === 0 ? 'en' : 'ro';
        sendMessage('createGame', { player: playerName, language });

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
                localStorage.setItem('players', JSON.stringify(response.players));
                router.push(`/${normalisedGameId}`);
            } else {
                alert(response.message || 'Failed to join game');
            }
        });
    };

    return (
        <div className='mainSection'>
            <div className='secondaryBlock'>
                <label className='normalText block'>Your Name</label>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
            </div>

            <div className='secondaryBlock'>
                <div className='normalText'>Language: <span>{languageIndex === 0 ? 'English' : 'Romanian'}</span></div>
                <select
                    value={languageIndex}
                    onChange={(e) => setLanguageIndex(Number(e.target.value))}
                    className='select'
                >
                    <option value={0}>English</option>
                    <option value={1}>Romanian</option>
                </select>
            </div>

            <button onClick={handleCreateGame}>Create Game</button>

            <div className='secondaryBlock'>
                <label className='normalText block'>Game ID</label>
                <input
                    type="text"
                    placeholder="Enter game ID"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                />
            </div>

            <button onClick={handleJoinGame}>Join Game</button>
        </div>
    );
}
