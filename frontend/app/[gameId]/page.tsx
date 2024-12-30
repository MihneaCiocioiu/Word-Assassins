'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import getSocket, { sendMessage } from '../../utils/socket';

export default function GamePage() {
    const [players, setPlayers] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [playerName, setPlayerName] = useState('');
    const [joined, setJoined] = useState(false);
    const { gameId } = useParams(); // Access the dynamic gameId from the route
    const socket = getSocket();

    useEffect(() => {
        // Listen for server messages
        socket.on('message', (data) => {
            if (data.players) {
                setPlayers(data.players); // Update the player list
            }
            if (data.message) {
                setMessages((prev) => [...prev, data.message]); // Append new messages
            }
        });

        // Cleanup socket listeners on unmount
        return () => {
            socket.off('message');
        };
    }, []);

    const handleJoinGame = () => {
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        sendMessage('joinGame', { player: playerName, gameId });
        setJoined(true);
    };

    return (
        <div>
            <h1>Game ID: {gameId}</h1>
            {!joined ? (
                <div>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={handleJoinGame}>Join Game</button>
                </div>
            ) : (
                <>
                    <h2>Players in the Game:</h2>
                    <ul>
                        {players.map((player, index) => (
                            <li key={index}>{player}</li>
                        ))}
                    </ul>
                    <h2>Messages:</h2>
                    <ul>
                        {messages.map((message, index) => (
                            <li key={index}>{message}</li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
