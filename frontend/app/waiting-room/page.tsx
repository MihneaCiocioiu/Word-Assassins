'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import getSocket, { sendMessage } from '../../utils/socket';

export default function WaitingRoom() {
    const [players, setPlayers] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId');
    const socket = getSocket();

    useEffect(() => {
        // Listen for player list updates and messages
        socket.on('message', (data) => {
            if (data.players) {
                setPlayers(data.players); // Update the player list
            }
            if (data.message) {
                setMessages((prev) => [...prev, data.message]); // Append new messages
            }
        });

        // Notify the server that the client joined the game
        sendMessage('joinGame', { player: 'YourPlayerName', gameId });

        // Clean up on unmount
        return () => {
            socket.off('message');
        };
    }, [gameId]);

    return (
        <div>
            <h1>Waiting Room</h1>
            <h2>Game ID: {gameId}</h2>
            <h3>Players:</h3>
            <ul>
                {players.map((player, index) => (
                    <li key={index}>{player}</li>
                ))}
            </ul>
            <h3>Messages:</h3>
            <ul>
                {messages.map((message, index) => (
                    <li key={index}>{message}</li>
                ))}
            </ul>
        </div>
    );
}
