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
        const storedName = localStorage.getItem('playerName');
        const storedPlayers = localStorage.getItem('players');
        const storedTarget = localStorage.getItem('target');
        const storedWord = localStorage.getItem('word');

        if (storedName) {
            setPlayerName(storedName);
            setJoined(true);
        }

        if (storedPlayers) {
            try {
                setPlayers(JSON.parse(storedPlayers));
            } catch {}
        }

        if (storedTarget && storedWord) {
            setTarget(storedTarget);
            setWord(storedWord);
        }

        const rejoin = () => {
            if (storedName) {
                sendMessage('joinGame', { player: storedName, gameId });
                localStorage.setItem('joined', 'true');
            }
        };

        // Immediately rejoin if already connected
        if (socket.connected) {
            rejoin();
        }

        socket.on('connect', rejoin);

        // Listen for server messages
        type ServerMessage = {
            result?: string;
            message?: string;
            players?: string[];
            action?: 'countdown' | 'gameStarted';
            countdown?: number;
            target?: string;
            word?: string;
        };

        const onMessage = (data: ServerMessage) => {
            if (data.players) {
                setPlayers(data.players);
                localStorage.setItem('players', JSON.stringify(data.players));
            }
            if (data.action === 'countdown') {
                const cd = typeof data.countdown === 'number' ? data.countdown : null;
                setCountdown(cd);
                if (cd !== null) {
                    const interval = setInterval(() => {
                        setCountdown((prev) => (prev && prev > 0 ? prev - 1 : null));
                    }, 1000);
                    setTimeout(() => {
                        clearInterval(interval);
                        setCountdown(null);
                    }, cd * 1000);
                }
            }
            if (data.action === 'gameStarted') {
                if (typeof data.target === 'string' && typeof data.word === 'string') {
                    setTarget(data.target);
                    setWord(data.word);
                    localStorage.setItem('target', data.target);
                    localStorage.setItem('word', data.word);
                }
            }
        };

        socket.on('message', onMessage);

        if (localStorage.getItem('isHost') === 'true') {
            setIsHost(true);
        }

        return () => {
            socket.off('message', onMessage);
            socket.off('connect', rejoin);
        };
    }, [gameId, socket]);

    const handleStartGame = () => {
        sendMessage('startGame', { player: playerName, gameId });
    };

    return (
        <div className="mainSection">
            <div className="secondaryBlock">
                <div className='normalText'>Game ID</div>
                <div className="mt-1"><span>{String(gameId)}</span></div>
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
                                <div className='normalText'>Your Target</div>
                                <div className='mt-1'><span>{target}</span></div>
                            </div>
                            <div className='mainBlock'>
                                <div className='normalText'>Your Word</div>
                                <div className='mt-1'><span>{word}</span></div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
