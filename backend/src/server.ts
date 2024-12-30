import http from 'http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
app.use(cors({ origin: '*' })); // Allow frontend requests

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
    },
});

// In-memory storage for games
interface Game {
    gameId: string;
    players: { name: string; socketId: string }[];
    host: string;
    started: boolean;
}

const games: Record<string, Game> = {};

// Socket.io event handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('message', (data) => {
        const { action, ...payload } = data;

        if (action === 'createGame') {
            const { player } = payload;

            const gameId = Math.random().toString(36).substr(2, 5).toUpperCase();
            games[gameId] = {
                gameId,
                players: [{ name: player, socketId: socket.id }],
                host: player,
                started: false,
            };
    
            socket.join(gameId); // Join the game room
    
            // Send the response with the creator's name included
            socket.emit('message', { 
                result: 'OK', 
                gameId, 
                players: [player] 
            });
        }
    

        if (action === 'joinGame') {
            const { player, gameId } = payload;

            if (!games[gameId]) {
                socket.emit('message', { result: 'Error', message: 'Game not found' });
                return;
            }

            const game = games[gameId];
            if (game.players.some((p) => p.name === player)) {
                socket.emit('message', { result: 'Error', message: 'Player already in game' });
                return;
            }

            game.players.push({ name: player, socketId: socket.id });
            socket.join(gameId); // Join the game room

            // Notify all players in the game about the new player
            io.to(gameId).emit('message', {
                result: 'OK',
                message: `Player ${player} joined the game`,
                players: game.players.map((p) => p.name), // Send updated player list
            });

            console.log(`Player ${player} joined game ${gameId}`);
        }

        if (action === 'startGame') {
            const { gameId } = payload;

            const game = games[gameId];
            if (!game) {
                socket.emit('message', { result: 'Error', message: 'Game not found' });
                return;
            }
    
            if (game.host !== data.player) {
                socket.emit('message', { result: 'Error', message: 'Only the host can start the game' });
                return;
            }
    
            if (game.players.length < 2) {
                socket.emit('message', { result: 'Error', message: 'Not enough players to start the game' });
                return;
            }
    
            // Notify all players about the countdown
            io.to(gameId).emit('message', { action: 'countdown', countdown: 5 });
    
            // Start the game after the countdown
            setTimeout(() => {
                const words = ['apple', 'banana', 'cherry', 'dragon', 'elephant'];
                const shuffledPlayers = game.players.sort(() => Math.random() - 0.5);
    
                // Assign targets and words
                for (let i = 0; i < shuffledPlayers.length; i++) {
                    const targetIndex = (i + 1) % shuffledPlayers.length;
                    const target = shuffledPlayers[targetIndex].name;
                    const word = words[i % words.length];
    
                    io.to(shuffledPlayers[i].socketId).emit('message', {
                        action: 'gameStarted',
                        target,
                        word,
                    });
                }
    
                game.started = true;
            }, 5000);
        }

    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Remove player from games
        Object.values(games).forEach((game) => {
            const playerIndex = game.players.findIndex((p) => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const [removedPlayer] = game.players.splice(playerIndex, 1);
                io.to(game.gameId).emit('message', {
                    message: `Player ${removedPlayer.name} left the game`,
                    players: game.players.map((p) => p.name), // Send updated player list
                });
                console.log(`Player ${removedPlayer.name} removed from game ${game.gameId}`);
            }
        });
    });
});

server.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
