"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: '*' })); // Allow frontend requests
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:3000',
    },
});
const games = {};
const wordsPath = path_1.default.resolve(__dirname, './words.json');
const words = JSON.parse(fs_1.default.readFileSync(wordsPath, 'utf8'));
// Socket.io event handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('message', (data) => {
        const { action } = data, payload = __rest(data, ["action"]);
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
            // Notify all players about the countdown
            io.to(gameId).emit('message', { action: 'countdown', countdown: 5 });
            // Start the game after the countdown
            setTimeout(() => {
                const shuffledPlayers = game.players.sort(() => Math.random() - 0.5);
                // Assign targets and words
                const usedWords = new Set();
                for (let i = 0; i < shuffledPlayers.length; i++) {
                    const targetIndex = (i + 1) % shuffledPlayers.length;
                    const target = shuffledPlayers[targetIndex].name;
                    let word;
                    do {
                        word = words[Math.floor(Math.random() * words.length)];
                    } while (usedWords.has(word));
                    usedWords.add(word);
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
