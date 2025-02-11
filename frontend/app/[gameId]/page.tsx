'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import getSocket, { sendMessage } from '../../utils/socket';
import PlayerList from '../components/PlayerList';

export default function GamePage() {
    const [players, setPlayers] = useState<string[]>([]);
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
            if (data.action === 'countdown') {
                setCountdown(data.countdown);
                const interval = setInterval(() => {
                    setCountdown((prev) => (prev ? prev - 1 : null));
                }, 1000);
                setTimeout(() => {
                    clearInterval(interval);
                    setCountdown(null); // Clear countdown after it finishes
                }, data.countdown * 1000);
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
        <div className="mainSection">
            <div className="mainBlock">
                <span>Game ID: {gameId}</span>
            </div>
            {!joined ? (
                <div className="mainSection">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={() => {
                        if (!playerName) {
                            alert('Please enter your name');
                            return;
                        }
                        sendMessage('joinGame', { player: playerName, gameId });
                        localStorage.setItem('joined', 'true');
                        setJoined(true);
                    }}>
                        Join Game
                    </button>
                </div>
            ) : (
                <>
                    {/* Show only the player list and Start Game button before the countdown starts */}
                    {!countdown && !target && !word && (
                        <>
                            <PlayerList players={players} />
                            {isHost && (
                                <button onClick={handleStartGame}>Start Game</button>
                            )}
                        </>
                    )}

                    {/* Show only the countdown while it is active */}
                    {countdown && (
                        <span className="countdown">Game starting in {countdown}...</span>
                    )}

                    {/* Show only the target and word after the countdown */}
                    {!countdown && target && word && (
                        <div className="secondaryBlock">
                            <div className='mainBlock'>
                                <div className='normalText'>Your Target: <span>{target}</span></div>
                            </div>
                            <div className='mainBlock'>
                                <div className='normalText'>Your Word: <span>{word}</span></div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
