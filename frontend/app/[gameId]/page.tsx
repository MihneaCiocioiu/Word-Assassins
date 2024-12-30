'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import getSocket, { sendMessage } from '../../utils/socket';
import PlayerList from '../components/PlayerList';

export default function GamePage() {
    const [players, setPlayers] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [playerName, setPlayerName] = useState('');
    const [joined, setJoined] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [target, setTarget] = useState('');
    const [word, setWord] = useState('');
    const { gameId } = useParams(); // Access the dynamic gameId from the route
    const socket = getSocket();

    useEffect(() => {
        // Retrieve player name and joined flag from local storage
        const storedName = localStorage.getItem('playerName');
        const storedPlayers = localStorage.getItem('players');
        const alreadyJoined = localStorage.getItem('joined') === 'true';

        if (storedName) {
            setPlayerName(storedName);

            if (storedPlayers) {
                setPlayers(JSON.parse(storedPlayers)); // Initialize the player list
            }

            if (!alreadyJoined) {
                sendMessage('joinGame', { player: storedName, gameId });
                localStorage.setItem('joined', 'true'); // Mark as joined after sending
            }

            setJoined(true);
        }

        // Listen for server messages
        socket.on('message', (data) => {
            if (data.players) {
                setPlayers(data.players); // Update the player list
            }
            if (data.message === 'Player already in game') {
                localStorage.removeItem('joined');
                alert('There is already a player with that name in the game. Please choose a different name and try again.');
                setPlayerName('');
                setJoined(false);
            }
            if (data.message) {
                setMessages((prev) => [...prev, data.message]); // Append new messages
            }
            if (data.action === 'countdown') {
                setCountdown(data.countdown);
                const interval = setInterval(() => {
                    setCountdown((prev) => (prev ? prev - 1 : null));
                }, 1000);
                setTimeout(() => clearInterval(interval), data.countdown * 1000);
            }
            if (data.action === 'gameStarted') {
                setTarget(data.target);
                setWord(data.word);
            }
        });

        // Check if the player is the host
        if (localStorage.getItem('isHost') === 'true') {
            setIsHost(true);
        }

        // Cleanup socket listeners on unmount
        return () => {
            socket.off('message');
        };
    }, [gameId]);

    const handleStartGame = () => {
        sendMessage('startGame', { player: playerName, gameId });
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
                    <button onClick={() => {
                        sendMessage('joinGame', { player: playerName, gameId });
                        localStorage.setItem('joined', 'true');
                        setJoined(true);
                    }}>
                        Join Game
                    </button>
                </div>
            ) : (
                <>
                    <PlayerList players={players} />
                    {isHost && !countdown && !target && (
                        <button onClick={handleStartGame}>Start Game</button>
                    )}
                    {countdown && (
                        <h2>Game starting in {countdown}...</h2>
                    )}
                    {target && word && (
                        <>
                            <h2>Your Target: {target}</h2>
                            <h2>Your Word: {word}</h2>
                        </>
                    )}
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
